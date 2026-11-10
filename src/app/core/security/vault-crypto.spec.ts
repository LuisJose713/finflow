import { decryptVaultJson, encryptVaultJson, generateVaultRecoveryKey, importVaultRecoveryKey } from './vault-crypto';

describe('FinFlow private vault crypto (no server keys)', () => {
  const uuid = '11111111-2222-3333-4444-555555555555';
  const fixtureKey = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
  const fixtureCiphertext = 'PCCleK2Ar3qve6ank4IRA-f0vRaECT4SSwaG8XQGbpAtMs-RwLR87FaeXdy4txgW3mlCoXiyxqlc5UNpbIqagNIG5CqhpEMDfXbXACruDKF-VSL4upJME7F3xQ';

  it('matches shared AES-256-GCM fixture', async () => {
    const key = await importVaultRecoveryKey(fixtureKey);
    const result = await decryptVaultJson<{ amount: string }>(key, 7, uuid, {
      nonce: 'AAECAwQFBgcICQoL',
      ciphertext: fixtureCiphertext
    });
    expect(result.amount).toBe('1000.00');
  });

  it('round trips without exposing amounts and rejects cross-user swaps', async () => {
    const key = await importVaultRecoveryKey(generateVaultRecoveryKey());
    const encrypted = await encryptVaultJson(key, 7, uuid, { schema: 1, amount: '1535.50' });
    expect(encrypted.ciphertext).not.toContain('1535.50');
    expect((await decryptVaultJson<{ amount: string }>(key, 7, uuid, encrypted)).amount).toBe('1535.50');
    await expectAsync(decryptVaultJson(key, 8, uuid, encrypted)).toBeRejected();
  });
});
