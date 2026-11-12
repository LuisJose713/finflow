import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionHandler } from '../server/web-session.mjs';

const origin = 'https://finflow.example';
const user = { id: '7', name: 'Test', email: 'test@example.invalid', role: 'USER' };
const jwt = (seconds = 3600) => 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString('base64url') + '.signature';
const tokens = () => ({ token: jwt(), refreshToken: 'r'.repeat(43), user });
const response = (body, status = 200) => Response.json(body, { status });
function request(path, { method = 'GET', body, cookie, source = origin, headers = {} } = {}) {
  const values = new Headers(headers);
  if (source) values.set('Origin', source);
  if (cookie) values.set('Cookie', cookie);
  if (body !== undefined) values.set('Content-Type', 'application/json');
  return new Request(origin + '/api/' + path, { method, headers: values, body: body === undefined ? undefined : JSON.stringify(body) });
}

test('login exposes only the profile and stores both credentials as protected host cookies', async () => {
  const issued = tokens();
  const handle = createSessionHandler({ fetchImpl: async (url, options) => {
    assert.equal(url, 'https://finflow-backend-production.up.railway.app/auth/login');
    assert.equal(options.headers.get('Authorization'), null);
    return response(issued);
  } });
  const result = await handle(request('auth/login', { method: 'POST', body: { email: user.email, password: 'test-only' } }));
  assert.deepEqual(await result.json(), { user });
  const cookies = result.headers.getSetCookie();
  assert.equal(cookies.length, 2);
  for (const cookie of cookies) {
    assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
    assert.match(cookie, /Path=\//);
    assert.doesNotMatch(cookie, /Domain=/);
  }
  assert.match(result.headers.get('cache-control'), /no-store/);
});

test('writes from another origin or without an Origin are rejected before any upstream call', async () => {
  let calls = 0;
  const handle = createSessionHandler({ fetchImpl: async () => { calls++; return response({}); } });
  for (const source of ['https://attacker.example', null]) {
    const result = await handle(request('transactions', { method: 'POST', source, body: { amount: 1 } }));
    assert.equal(result.status, 403);
  }
  assert.equal(calls, 0);
});

test('an expired access cookie is renewed without exposing either credential to the browser', async () => {
  const issued = tokens();
  const calls = [];
  const handle = createSessionHandler({ fetchImpl: async (url, options) => {
    calls.push(url);
    if (url.endsWith('/auth/refresh')) {
      assert.equal(JSON.parse(options.body).refreshToken, 'r'.repeat(43));
      return response(issued);
    }
    assert.equal(options.headers.get('Authorization'), 'Bearer ' + issued.token);
    assert.equal(options.headers.get('Cookie'), null);
    assert.equal(options.headers.get('X-User-Id'), null);
    return response([{ id: 1, amount: 25000 }]);
  } });
  const result = await handle(request('transactions?month=11', {
    cookie: '__Host-finflow_session=' + jwt(-1) + '; __Host-finflow_refresh=' + 'r'.repeat(43),
    headers: { Authorization: 'Bearer attacker-value', 'X-User-Id': 'another-user' },
  }));
  assert.equal(result.status, 200);
  assert.equal(calls.length, 2);
  assert.match(calls[1], /\/transactions\?month=11$/);
  assert.equal(result.headers.getSetCookie().length, 2);
  assert.equal((await result.json())[0].amount, 25000);
});

test('migration validates the old bearer on the backend before issuing any cookie', async () => {
  let token;
  const handle = createSessionHandler({ fetchImpl: async (url, options) => {
    assert.match(url, /\/auth\/session$/);
    token = options.headers.Authorization;
    return response(tokens());
  } });
  const result = await handle(request('auth/session', { method: 'POST', body: { token: jwt() } }));
  assert.equal(result.status, 200);
  assert.equal(token, 'Bearer ' + jwt());
  assert.deepEqual(await result.json(), { user });
});

test('logout clears both cookies even if backend revocation is temporarily unavailable', async () => {
  const handle = createSessionHandler({ fetchImpl: async () => { throw new Error('offline'); } });
  const result = await handle(request('auth/logout', { method: 'POST', body: {}, cookie: '__Host-finflow_refresh=' + 'r'.repeat(43) }));
  assert.equal(result.status, 204);
  assert.equal(result.headers.getSetCookie().length, 2);
  assert.ok(result.headers.getSetCookie().every(value => value.includes('Max-Age=0')));
});

test('monetary writes are never replayed automatically and late 401s do not clear newer cookies', async () => {
  let calls = 0;
  const handle = createSessionHandler({ fetchImpl: async () => { calls++; return response({ error: 'Unavailable' }, 503); } });
  const result = await handle(request('transactions', { method: 'POST', cookie: '__Host-finflow_session=' + jwt(), body: { amount: 100 } }));
  assert.equal(result.status, 503);
  assert.equal(calls, 1);
  const unauthorized = createSessionHandler({ fetchImpl: async () => response({}, 401) });
  const late = await unauthorized(request('auth/me', { cookie: '__Host-finflow_session=' + jwt() }));
  assert.equal(late.status, 401);
  assert.equal(late.headers.getSetCookie().length, 0);
});

test('exports stream original bytes and retain filename and type', async () => {
  const handle = createSessionHandler({ fetchImpl: async () => new Response(new Uint8Array([1, 2, 3]), { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="FinFlow.xlsx"',
  } }) });
  const result = await handle(request('transactions/export/xlsx', { cookie: '__Host-finflow_session=' + jwt() }));
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), new Uint8Array([1, 2, 3]));
  assert.match(result.headers.get('content-disposition'), /FinFlow.xlsx/);
});

test('missing sessions and disallowed upstream targets fail closed', async () => {
  let calls = 0;
  const handle = createSessionHandler({ fetchImpl: async () => { calls++; return response({}); } });
  assert.equal((await handle(request('auth/me'))).status, 401);
  for (const path of ['https://attacker.example', 'auth/%2e%2e/accounts', 'unknown/path', 'auth/refresh']) {
    assert.ok((await handle(request(path))).status >= 400);
  }
  assert.equal(calls, 0);
});
