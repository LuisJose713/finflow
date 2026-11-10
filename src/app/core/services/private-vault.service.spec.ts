import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { AuthService } from './auth.service';
import { PrivateVaultService, OpaqueVaultEntry } from './private-vault.service';
import { importVaultRecoveryKey, decryptVaultJson } from '../security/vault-crypto';

describe('PrivateVaultService encrypted transport', () => {
  const entryId = '11111111-2222-3333-4444-555555555555';
  const key = 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8';
  const identity = signal<{ id: string } | null>({ id: '7' });
  let service: PrivateVaultService;
  let http: { get: jasmine.Spy; put: jasmine.Spy; delete: jasmine.Spy };

  beforeEach(() => {
    identity.set({ id: '7' });
    http = {
      get: jasmine.createSpy('get'),
      put: jasmine.createSpy('put'),
      delete: jasmine.createSpy('delete')
    };
    TestBed.configureTestingModule({
      providers: [
        PrivateVaultService,
        { provide: HttpClient, useValue: http },
        { provide: AuthService, useValue: { currentUser: identity } }
      ]
    });
    service = TestBed.inject(PrivateVaultService);
  });

  it('never sends financial plaintext or a recovery key in the API payload', async () => {
    await service.unlock(key);
    const record = { schema: 1, kind: 'transaction', amount: '51833.90', description: 'Alquiler secreto' };
    const stored = { id: entryId, revision: 1, updatedAt: new Date().toISOString() };
    http.put.and.returnValue(of(stored));

    await service.save(entryId, record);
    const [url, body] = http.put.calls.mostRecent().args;
    expect(url).toContain('/private-vault/entries/' + entryId);
    expect(JSON.stringify(body)).not.toContain('51833.90');
    expect(JSON.stringify(body)).not.toContain('Alquiler secreto');
    expect(JSON.stringify(body)).not.toContain(key);
    expect(body.expectedRevision).toBe(0);

    const localKey = await importVaultRecoveryKey(key);
    const decrypted = await decryptVaultJson<typeof record>(localKey, 7, entryId, body);
    expect(decrypted).toEqual(record);
  });

  it('decrypts response only locally and forbids operations while locked', async () => {
    await service.unlock(key);
    http.put.and.returnValue(of({
      id: entryId, revision: 1, updatedAt: '2026-11-10T00:00:00Z'
    }));
    await service.save(entryId, { schema: 1, kind: 'goal', target: '100000.00' });
    const body = http.put.calls.mostRecent().args[1];
    const raw: OpaqueVaultEntry = {
      id: entryId, revision: 1, updatedAt: '2026-11-10T00:00:00Z',
      nonce: body.nonce, ciphertext: body.ciphertext
    };
    http.get.and.returnValue(of([raw]));
    const entries = await service.listPage<{ target: string }>();
    expect(entries[0].value.target).toBe('100000.00');
    service.lock();
    await expectAsync(service.listPage()).toBeRejected();
  });

  it('does not reuse an unlocked vault for another account', async () => {
    await service.unlock(key);
    identity.set({ id: '8' });
    http.put.and.returnValue(of({}));
    await expectAsync(service.save(entryId, { amount: '500' })).toBeRejected();
    expect(http.put).not.toHaveBeenCalled();
  });
});
