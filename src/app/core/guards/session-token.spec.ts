import { hasUnexpiredSession } from './session-token';

describe('Session token expiry', () => {
  const now = 1_800_000_000_000;
  const token = (payload: object): string => `header.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.signature`;
  it('requires a finite numeric expiry instead of accepting missing or malformed exp', () => {
    for (const exp of [undefined, null, '9999999999', 'bad']) {
      expect(hasUnexpiredSession(token({ exp }), now)).toBeFalse();
    }
    expect(hasUnexpiredSession(null, now)).toBeFalse();
    expect(hasUnexpiredSession('bad.token', now)).toBeFalse();
  });
  it('rejects the exact expiry boundary and accepts a future expiry', () => {
    expect(hasUnexpiredSession(token({ exp: now / 1000 }), now)).toBeFalse();
    expect(hasUnexpiredSession(token({ exp: now / 1000 + 1 }), now)).toBeTrue();
  });
  it('decodes base64url and non-ASCII claims without treating a profile as authorization', () => {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ exp: now / 1000 + 60, name: 'José 💰' }))));
    expect(hasUnexpiredSession(`header.${encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.signature`, now)).toBeTrue();
  });
});
