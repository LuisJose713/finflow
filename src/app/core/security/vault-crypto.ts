/**
 * Client-side FinFlow AES-256-GCM. Financial plaintext must never be sent to the API.
 * This module DOES NOT by itself activate E2EE or migrate any existing data.
 * Keep recovery keys outside the database, API, logs and localStorage.
 */
export interface VaultEnvelope {
  nonce: string;
  ciphertext: string; // AES-GCM ciphertext + 16-byte authentication tag
}

const AAD_PREFIX = 'finflow:private-vault:v1:';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function base64url(bytes: Uint8Array): string {
  let raw = '';
  for (let i = 0; i < bytes.length; i += 16384) {
    raw += String.fromCharCode(...bytes.subarray(i, i + 16384));
  }
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parseBase64url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid base64url');
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, ch => ch.charCodeAt(0));
}

function aad(userId: number, entryId: string): Uint8Array {
  if (!Number.isSafeInteger(userId) || userId <= 0 || !UUID_PATTERN.test(entryId)) {
    throw new Error('Invalid private vault identity');
  }
  return encoder.encode(AAD_PREFIX + userId + ':' + entryId.toLowerCase());
}

/** Show this recovery key ONCE to the user. Never upload it to FinFlow. */
export function generateVaultRecoveryKey(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

/** Key is intentionally non-extractable once imported into WebCrypto. */
export async function importVaultRecoveryKey(encoded: string): Promise<CryptoKey> {
  const raw = parseBase64url(encoded);
  if (raw.length !== 32) throw new Error('Recovery key must contain 256 bits');
  try {
    return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  } finally {
    raw.fill(0);
  }
}

export async function encryptVaultJson(
  key: CryptoKey, userId: number, entryId: string, record: unknown
): Promise<VaultEnvelope> {
  const json = JSON.stringify(record);
  if (typeof json !== 'string') throw new Error('Record must be JSON serializable');
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aad(userId, entryId), tagLength: 128 },
    key, encoder.encode(json)
  );
  return { nonce: base64url(nonce), ciphertext: base64url(new Uint8Array(encrypted)) };
}

export async function decryptVaultJson<T>(
  key: CryptoKey, userId: number, entryId: string, envelope: VaultEnvelope
): Promise<T> {
  const nonce = parseBase64url(envelope.nonce);
  const ciphertext = parseBase64url(envelope.ciphertext);
  if (nonce.length !== 12 || ciphertext.length < 16) throw new Error('Invalid E2EE envelope');
  const clear = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: aad(userId, entryId), tagLength: 128 },
    key, ciphertext
  );
  return JSON.parse(decoder.decode(clear)) as T;
}
