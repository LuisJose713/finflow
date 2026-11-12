import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, finalize, fromEvent, merge, timeout } from 'rxjs';
import { BUILD_VERSION } from '../build-version';

export const APP_BUILD = new InjectionToken<string>('APP_BUILD', {
  providedIn: 'root', factory: () => BUILD_VERSION,
});

@Injectable({ providedIn: 'root' })
export class WebUpdateService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  private readonly build = inject(APP_BUILD);
  private readonly latest = signal<string | null>(null);
  private readonly dismissed = signal<string | null>(null);
  private checking = false;
  private checkedAt = 0;
  readonly available = computed(() => !!this.latest() && this.latest() !== this.build && this.latest() !== this.dismissed());

  constructor() {
    const window = this.document.defaultView;
    if (!window || this.build === 'development') return;
    this.check();
    const interval = window.setInterval(() => this.check(), 15 * 60 * 1000);
    this.destroy.onDestroy(() => window.clearInterval(interval));
    merge(fromEvent(this.document, 'visibilitychange'), fromEvent(window, 'online'))
      .pipe(takeUntilDestroyed(this.destroy)).subscribe(() => this.check());
  }

  check(force = false): void {
    if (this.build === 'development' || this.checking || this.document.visibilityState === 'hidden') return;
    if (!force && Date.now() - this.checkedAt < 60_000) return;
    this.checkedAt = Date.now(); this.checking = true;
    this.http.get<{ version: string }>('/version.json', { params: { t: String(this.checkedAt) } })
      .pipe(timeout(8_000), catchError(() => EMPTY), finalize(() => { this.checking = false; }), takeUntilDestroyed(this.destroy))
      .subscribe(response => {
        if (typeof response?.version === 'string' && /^[a-f0-9]{40,64}$/i.test(response.version)) this.latest.set(response.version);
      });
  }

  dismiss(): void { this.dismissed.set(this.latest()); }
  reload(): void { this.document.defaultView?.location.reload(); }
}
