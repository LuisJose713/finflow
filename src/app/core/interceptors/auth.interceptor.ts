import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BrowserSessionService } from '../services/browser-session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(BrowserSessionService);
  const router = inject(Router);
  const base = environment.apiUrl.replace(/\/$/, '');
  const isApi = req.url.startsWith(base + '/');
  const isPublicAuth = isApi && [base + '/auth/login', base + '/auth/register', base + '/auth/session'].includes(req.url);
  if (!isApi || isPublicAuth) return next(req);

  const revision = session.revision;
  const wasAuthenticated = session.authenticated();
  const safe = req.headers.has('X-User-Id') ? req.clone({ headers: req.headers.delete('X-User-Id') }) : req;
  // Production uses same-origin HttpOnly cookies; bearer stays in memory for local development.
  const token = environment.apiUrl.startsWith('/') ? null : session.bearer();
  const outgoing = token ? safe.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : safe;
  return next(outgoing).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401 && wasAuthenticated && session.revision === revision) {
      session.clear();
      void router.navigate(['/login']);
    }
    return throwError(() => error);
  }));
};
