const UPSTREAM = 'https://finflow-backend-production.up.railway.app';
const ACCESS_COOKIE = '__Host-finflow_session';
const REFRESH_COOKIE = '__Host-finflow_refresh';
const FAMILIES = new Set(['auth', 'transactions', 'goals', 'planned-expenses', 'accounts', 'budgets', 'categories', 'recurring', 'privacy', 'billing', 'admin', 'ai', 'preferences']);
const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' };

function json(body, status = 200, cookies = []) {
  const headers = new Headers(NO_STORE);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  cookies.forEach(value => headers.append('Set-Cookie', value));
  return new Response(status === 204 ? null : JSON.stringify(body), { status, headers });
}

function cookiesOf(request) {
  return new Map((request.headers.get('cookie') || '').split(';').map(entry => {
    const i = entry.indexOf('=');
    return [entry.slice(0, i).trim(), entry.slice(i + 1).trim()];
  }).filter(([name]) => name));
}

function sessionCookies(tokens) {
  if (typeof tokens.token !== 'string' || tokens.token.length > 3800) throw new Error('Invalid access credential');
  const payload = JSON.parse(Buffer.from(tokens.token.split('.')[1], 'base64url').toString());
  const seconds = Math.floor(Number(payload.exp) - Date.now() / 1000);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Expired access credential');
  const values = [`${ACCESS_COOKIE}=${tokens.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.min(seconds, 86400)}`];
  if (tokens.refreshToken) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(tokens.refreshToken)) throw new Error('Invalid renewal credential');
    values.push(`${REFRESH_COOKIE}=${tokens.refreshToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${90 * 86400}`);
  }
  return values;
}

function expiresSoon(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return Number(payload.exp) < Date.now() / 1000 + 30;
  } catch { return true; }
}

function clearCookies() {
  return [ACCESS_COOKIE, REFRESH_COOKIE].map(name => `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

/** A fixed-origin BFF. Browser code never receives an access or refresh token. */
export function createSessionHandler({ fetchImpl = globalThis.fetch, timeoutMs = 20000 } = {}) {
  return async function handle(request) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const rawPath = url.searchParams.get('__finflow_path') || url.pathname.replace(/^\/api\//, '');
    const path = rawPath.replace(/^\//, '');
    if (!/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._-]+)*$/.test(path) ||
        path.split('/').some(part => part === '.' || part === '..') || !FAMILIES.has(path.split('/')[0])) {
      return json({ error: 'Ruta no disponible.' }, 404);
    }
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return json({ error: 'Método no permitido.' }, 405);
    // SameSite is defense in depth. Every write also requires its exact browser origin.
    if (!['GET', 'HEAD'].includes(method) && request.headers.get('origin') !== url.origin) {
      return json({ error: 'Origen de solicitud no permitido.' }, 403);
    }
    const stored = cookiesOf(request);
    let access = stored.get(ACCESS_COOKIE);
    const refresh = stored.get(REFRESH_COOKIE);
    let responseCookies = [];
    const publicAuth = ['auth/login', 'auth/register'].includes(path);
    const publicRead = method === 'GET' && ['privacy/policy', 'billing/catalog', 'billing/quote'].includes(path);
    const upstreamCall = (target, options = {}, duration = timeoutMs) => fetchImpl(UPSTREAM + target, {
      ...options, redirect: 'manual', signal: AbortSignal.timeout(duration),
    });
    try {
      if (path === 'auth/logout' && method === 'POST') {
        if (refresh) {
          // Local sign-out still completes if the backend is temporarily unreachable.
          try { await upstreamCall('/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: refresh }) }, 3000); }
          catch { /* No credentials or user data are logged. */ }
        }
        return json(null, 204, clearCookies());
      }
      let body;
      if (!['GET', 'HEAD'].includes(method)) {
        const bytes = await request.arrayBuffer();
        if (bytes.byteLength > 1024 * 1024) return json({ error: 'Solicitud demasiado grande.' }, 413);
        if (bytes.byteLength && !(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json'))
          return json({ error: 'Se requiere JSON.' }, 415);
        body = bytes.byteLength ? Buffer.from(bytes) : undefined;
      }
      if (path === 'auth/session' && method === 'POST') {
        // One-time migration: the backend validates the legacy JWT before cookies exist.
        let legacy;
        try { legacy = JSON.parse(body?.toString() || '{}').token; } catch { return json({ error: 'Solicitud inválida.' }, 400); }
        if (typeof legacy !== 'string' || legacy.length > 3800 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(legacy))
          return json({ error: 'Sesión inválida.' }, 401);
        const adopted = await upstreamCall('/auth/session', { method: 'POST', headers: {
          Authorization: `Bearer ${legacy}`, 'Content-Type': 'application/json', Accept: 'application/json',
        }, body: '{}' });
        if (!adopted.ok) return json({ error: 'No pudimos recuperar esta sesión.' }, adopted.status === 401 || adopted.status === 403 ? 401 : 503);
        const tokens = await adopted.json();
        return json({ user: tokens.user }, 200, sessionCookies(tokens));
      }
      // Renewal is handled only here; callers cannot obtain refresh credentials.
      if (path === 'auth/refresh') return json({ error: 'Ruta no disponible.' }, 404);
      if (!publicAuth && !publicRead && refresh && (!access || expiresSoon(access))) {
        const renewed = await upstreamCall('/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ refreshToken: refresh }) });
        if (!renewed.ok) return json({ error: 'No pudimos renovar la sesión.' }, renewed.status === 401 || renewed.status === 403 ? 401 : 503);
        const tokens = await renewed.json();
        responseCookies = sessionCookies(tokens);
        access = tokens.token;
      }
      if (!publicAuth && !publicRead && !access) return json({ error: 'Sesión requerida.' }, 401);
      const headers = new Headers({ Accept: request.headers.get('accept') || 'application/json' });
      if (body) headers.set('Content-Type', 'application/json');
      if (!publicAuth && access) headers.set('Authorization', `Bearer ${access}`);
      const query = new URLSearchParams(url.searchParams);
      query.delete('__finflow_path');
      const target = '/' + path + (query.size ? '?' + query.toString() : '');
      const longRequest = path.startsWith('ai/') || path.includes('/export/');
      const upstream = await upstreamCall(target, { method, headers, body }, longRequest ? 90000 : timeoutMs);
      if (upstream.status >= 300 && upstream.status < 400) return json({ error: 'Respuesta inesperada del servidor.' }, 502);
      if (publicAuth && upstream.ok) {
        const tokens = await upstream.json();
        return json({ user: tokens.user }, upstream.status, sessionCookies(tokens));
      }
      const output = new Headers(NO_STORE);
      for (const key of ['content-type', 'content-disposition', 'retry-after']) {
        const value = upstream.headers.get(key); if (value) output.set(key, value);
      }
      responseCookies.forEach(value => output.append('Set-Cookie', value));
      // Streaming keeps financial exports outside the buffered-response size limit.
      return new Response(method === 'HEAD' || upstream.status === 204 ? null : upstream.body, { status: upstream.status, headers: output });
    } catch (error) {
      const timeout = error?.name === 'TimeoutError' || error?.name === 'AbortError';
      console.error('finflow_api_failure', { category: timeout ? 'timeout' : 'upstream', method, family: path.split('/')[0] });
      return json({ error: timeout ? 'El servidor tardó demasiado. Comprueba el resultado antes de repetir una operación.' : 'No pudimos conectar con FinFlow. Intenta nuevamente.' }, timeout ? 504 : 502);
    }
  };
}

export const handleWebSession = createSessionHandler();
