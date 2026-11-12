import { Injectable, signal } from '@angular/core';
import { User } from '../models';

/** Profiles live in memory. Production credentials live exclusively in HttpOnly cookies. */
@Injectable({ providedIn: 'root' })
export class BrowserSessionService {
  readonly user = signal<User | null>(null);
  readonly authenticated = signal(false);
  readonly ready = signal(false);
  readonly bearer = signal<string | null>(null); // Local development only.
  private revisionValue = 0;

  get revision(): number { return this.revisionValue; }
  establish(user: User, developmentToken: string | null = null) {
    this.revisionValue++;
    this.user.set(user); this.bearer.set(developmentToken);
    this.authenticated.set(true); this.ready.set(true);
  }
  clear() {
    this.revisionValue++;
    this.user.set(null); this.bearer.set(null);
    this.authenticated.set(false); this.ready.set(true);
  }
}
