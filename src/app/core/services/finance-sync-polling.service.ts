import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DashboardRefreshService } from './dashboard-refresh.service';

interface SyncCursor { cursor: number; }
interface SyncChange { revision: number; resource: string; at: string; }
interface SyncBatch { next: number; hasMore: boolean; changes: SyncChange[]; }

/**
 * Single lightweight, owner-scoped incremental change probe.
 * Auth headers/cookies come from the normal HTTP interceptor. Nothing sensitive
 * is cached in browser storage and no recurring request can issue a write.
 */
@Injectable({ providedIn: 'root' })
export class FinanceSyncPollingService {
  private readonly http = inject(HttpClient);
  private readonly refresh = inject(DashboardRefreshService);
  private readonly url = environment.apiUrl.replace(/\/$/, '') + '/sync';
  private timer?: ReturnType<typeof setInterval>;
  private owner: string | null = null;
  private cursor: number | null = null;
  private inFlight = false;
  private generation = 0;

  private readonly onAttention = () => this.poll();

  start(ownerId: string): void {
    if (!ownerId || typeof window === 'undefined') return;
    if (this.owner === ownerId && this.timer) return;
    this.stop();
    this.owner = ownerId;
    this.generation++;
    this.initialize();
    this.timer = setInterval(() => this.poll(), 12_000);
    window.addEventListener('focus', this.onAttention);
    window.addEventListener('online', this.onAttention);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.onAttention);
      window.removeEventListener('online', this.onAttention);
    }
    this.owner = null;
    this.cursor = null;
    this.generation++;
    this.inFlight = false;
  }

  private initialize(): void {
    if (!this.owner || this.inFlight) return;
    const current = this.generation;
    this.inFlight = true;
    this.http.get<SyncCursor>(this.url + '/cursor').subscribe({
      next: response => {
        if (current !== this.generation) return;
        this.cursor = Number.isSafeInteger(response.cursor) && response.cursor >= 0 ? response.cursor : 0;
        this.inFlight = false;
      },
      error: () => {
        if (current === this.generation) this.inFlight = false;
        // Old backends and temporary outages fall back to the refresh clock.
      }
    });
  }

  private poll(): void {
    if (!this.owner || this.inFlight || (typeof document !== 'undefined'
        && document.visibilityState !== 'visible')) return;
    if (this.cursor === null) { this.initialize(); return; }
    const generation = this.generation;
    const after = this.cursor;
    this.inFlight = true;
    this.http.get<SyncBatch>(this.url + '/changes', {
      params: new HttpParams().set('after', String(after)).set('limit', '100')
    }).subscribe({
      next: result => {
        if (generation !== this.generation) return;
        const next = Number.isSafeInteger(result.next) && result.next >= after ? result.next : after;
        this.cursor = next;
        this.inFlight = false;
        if (Array.isArray(result.changes) && result.changes.length) {
          // Fetch authoritative server-side resources, never trust an event payload as financial data.
          this.refresh.trigger();
        }
      },
      error: () => {
        if (generation === this.generation) this.inFlight = false;
      }
    });
  }
}
