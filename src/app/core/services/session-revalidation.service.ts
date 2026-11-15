import { HttpBackend, HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BrowserSessionService } from './browser-session.service';
import { User } from '../models';

export type SessionCheck = 'valid' | 'revoked' | 'unreachable';

/**
 * Read-only confirmation after an isolated 401. A stale request during refresh
 * must not destroy a newer still-valid browser session. One probe per instance.
 */
@Injectable({ providedIn: 'root' })
export class SessionRevalidationService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly session = inject(BrowserSessionService);
  private pending?: Observable<SessionCheck>;
  verify(): Observable<SessionCheck> {
    if (this.pending) return this.pending;
    const generation = this.session.revision;
    const currentUserId = String(this.session.user()?.id ?? '');
    const bearer = environment.apiUrl.startsWith('/') ? null : this.session.bearer();
    const options = bearer ? { headers: new HttpHeaders({ Authorization: 'Bearer ' + bearer }) } : {};
    this.pending = this.http.get<User>(environment.apiUrl + '/auth/me', options).pipe(
      timeout({ first: 12000 }),
      map(profile => {
        if (generation !== this.session.revision) return 'valid' as const;
        if (String(profile?.id ?? '') !== currentUserId) return 'revoked' as const;
        return 'valid' as const;
      }),
      catchError(error => of(
        error instanceof HttpErrorResponse && error.status === 401 ? 'revoked' as const : 'unreachable' as const
      )),
      finalize(() => { this.pending = undefined; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.pending;
  }
}
