import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const apiBase = environment.apiUrl.replace(/\/$/, '');
  const isApiRequest = req.url.startsWith(`${apiBase}/`);
  const isPublicAuthRequest = isApiRequest &&
    (req.url === `${apiBase}/auth/login` || req.url === `${apiBase}/auth/register`);

  // Public authentication requests must never carry a stale JWT.
  // Do not attach credentials to unrelated or third-party URLs.
  if (!isApiRequest || isPublicAuthRequest) {
    return next(req);
  }

  // The backend derives ownership exclusively from the verified JWT.
  // Never forward caller-controlled identity headers to FinFlow.
  const safeRequest = req.headers.has('X-User-Id')
    ? req.clone({ headers: req.headers.delete('X-User-Id') })
    : req;
  const token = localStorage.getItem('token');
  const authenticatedRequest = token
    ? safeRequest.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : safeRequest;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      // A late 401 from an older request must never erase a newer valid session.
      if (error.status === 401 && token && localStorage.getItem('token') === token) {
        // Only clear FinFlow's session, not unrelated application storage.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
