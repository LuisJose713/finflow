import { jwtDecode, JwtPayload } from 'jwt-decode';

/** Route UX only. The API verifies the signature and authorizes every request. */
export function hasUnexpiredSession(token: string | null, now = Date.now()): boolean {
  if (!token || token.split('.').length !== 3) return false;
  try {
    const payload = jwtDecode<JwtPayload>(token);
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      && payload.exp * 1000 > now;
  } catch {
    return false;
  }
}
