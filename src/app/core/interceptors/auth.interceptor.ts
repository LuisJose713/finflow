import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  // Never send credentials to third-party endpoints or similarly named hosts.
  const api = new URL(environment.apiUrl, window.location.origin);
  const target = new URL(req.url, window.location.origin);
  const apiPath = api.pathname.replace(/\\/$/, '');
  const isApiRequest = target.origin === api.origin &&
    (target.pathname === apiPath || target.pathname.startsWith(apiPath + '/'));

  const request = isApiRequest && token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isApiRequest && token && error.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
