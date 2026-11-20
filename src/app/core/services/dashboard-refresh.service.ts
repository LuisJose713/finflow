import { Injectable, signal } from '@angular/core';

/**
 * Shared read-only refresh clock. The root component owns its lifecycle so
 * isolated feature tests do not need an authenticated HTTP session.
 */
@Injectable({ providedIn: 'root' })
export class DashboardRefreshService {
  readonly version = signal(0);
  private interval?: ReturnType<typeof setInterval>;
  private lastAutomatic = 0;

  private readonly onVisibility = () => {
    if (document.visibilityState !== 'visible') return;
    const now = Date.now();
    if (now - this.lastAutomatic < 10_000) return;
    this.lastAutomatic = now;
    this.trigger();
  };

  start(): void {
    if (this.interval || typeof document === 'undefined') return;
    this.lastAutomatic = Date.now();
    this.interval = setInterval(this.onVisibility, 45_000);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('focus', this.onVisibility);
  }

  stop(): void {
    if (this.interval) clearInterval(this.interval);
    this.interval = undefined;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
      window.removeEventListener('focus', this.onVisibility);
    }
  }

  trigger(): void { this.version.update(v => v + 1); }
}
