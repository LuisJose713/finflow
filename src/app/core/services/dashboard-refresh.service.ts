import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

/** Visible, authenticated pages re-query the API without reloading the browser. */
@Injectable({ providedIn: 'root' })
export class DashboardRefreshService {
  private auth = inject(AuthService);
  readonly version = signal(0);
  private lastAutomatic = 0;
  constructor() {
    effect(onCleanup => {
      const account = this.auth.isAuthenticated() && this.auth.currentUser()?.id;
      if (!account || typeof window === 'undefined') return;
      this.lastAutomatic = Date.now();
      const pulse = () => {
        if (document.visibilityState !== 'visible') return;
        const now = Date.now();
        if (now - this.lastAutomatic < 10_000) return;
        this.lastAutomatic = now;
        this.trigger();
      };
      const id = window.setInterval(pulse, 12_000);
      document.addEventListener('visibilitychange', pulse);
      window.addEventListener('focus', pulse);
      onCleanup(() => {
        window.clearInterval(id);
        document.removeEventListener('visibilitychange', pulse);
        window.removeEventListener('focus', pulse);
      });
    });
  }
  trigger() { this.version.update(v => v + 1); }
}
