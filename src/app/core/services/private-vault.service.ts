import { Injectable, effect, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { decryptVaultJson, encryptVaultJson, importVaultRecoveryKey } from '../security/vault-crypto';

/**
 * Experimental E2EE synchronization API. Do NOT route financial features here
 * until every legacy API call and the full per-user migration are replaced.
 * Recovery keys stay in memory only. They are never persisted or sent to FinFlow.
 */
export interface OpaqueVaultEntry {
  id: string;
  revision: number;
  nonce: string;
  ciphertext: string;
  updatedAt: string;
}

export interface DecryptedVaultEntry<T> {
  id: string;
  revision: number;
  updatedAt: string;
  value: T;
}

@Injectable({ providedIn: 'root' })
export class PrivateVaultService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly url = `${environment.apiUrl}/private-vault/entries`;
  private key: CryptoKey | null = null;
  private keyOwnerId: number | null = null;

  constructor() {
    // An account switch or logout invalidates the unlocked vault immediately.
    effect(() => {
      const activeId = this.auth.currentUser()?.id;
      if (this.keyOwnerId !== null && String(this.keyOwnerId) !== String(activeId ?? '')) {
        this.lock();
      }
    });
  }

  get isUnlocked(): boolean {
    return this.key !== null && this.keyOwnerId !== null &&
      String(this.auth.currentUser()?.id) === String(this.keyOwnerId);
  }

  async unlock(recoveryKey: string): Promise<void> {
    const uid = this.currentUserId();
    const key = await importVaultRecoveryKey(recoveryKey);
    if (this.currentUserId() !== uid) throw new Error('La sesión cambió mientras se abría la bóveda');
    this.key = key;
    this.keyOwnerId = uid;
  }

  lock(): void {
    this.key = null;
    this.keyOwnerId = null;
  }

  /** Fetch one encrypted page, then verify AES-GCM authentication locally. */
  async listPage<T>(after?: string, limit = 100): Promise<DecryptedVaultEntry<T>[]> {
    const { key, uid } = this.unlocked();
    if (!Number.isInteger(limit) || limit < 1 || limit > 250) throw new Error('Límite inválido');
    let params = new HttpParams().set('limit', String(limit));
    if (after) params = params.set('after', after);
    const entries = await firstValueFrom(this.http.get<OpaqueVaultEntry[]>(this.url, { params }));
    this.ensureSameUser(uid, key);
    const values = await Promise.all(entries.map(async entry => ({
      id: entry.id,
      revision: entry.revision,
      updatedAt: entry.updatedAt,
      value: await decryptVaultJson<T>(key, uid, entry.id, entry)
    })));
    this.ensureSameUser(uid, key);
    return values;
  }

  /** expectedRevision=0 is create-only; positive revisions are compare-and-swap. */
  async save<T>(entryId: string, value: T, expectedRevision = 0): Promise<OpaqueVaultEntry> {
    const { key, uid } = this.unlocked();
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
      throw new Error('Revisión inválida');
    }
    const encrypted = await encryptVaultJson(key, uid, entryId, value);
    this.ensureSameUser(uid, key);
    return firstValueFrom(this.http.put<OpaqueVaultEntry>(
      `${this.url}/${encodeURIComponent(entryId)}`,
      { ...encrypted, expectedRevision }
    ));
  }

  async remove(entryId: string, expectedRevision: number): Promise<void> {
    const { key, uid } = this.unlocked();
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      throw new Error('Revisión inválida');
    }
    this.ensureSameUser(uid, key);
    await firstValueFrom(this.http.delete<void>(
      `${this.url}/${encodeURIComponent(entryId)}`,
      { params: new HttpParams().set('expectedRevision', String(expectedRevision)) }
    ));
  }

  private currentUserId(): number {
    const id = Number(this.auth.currentUser()?.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error('Necesitas iniciar sesión');
    return id;
  }

  private unlocked(): { key: CryptoKey; uid: number } {
    if (!this.key || this.keyOwnerId === null) throw new Error('La bóveda está bloqueada');
    this.ensureSameUser(this.keyOwnerId, this.key);
    return { key: this.key, uid: this.keyOwnerId };
  }

  private ensureSameUser(uid: number, key: CryptoKey): void {
    if (this.key !== key || this.keyOwnerId !== uid || this.currentUserId() !== uid) {
      throw new Error('La sesión cambió; vuelve a desbloquear tu bóveda');
    }
  }
}
