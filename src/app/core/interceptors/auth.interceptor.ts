import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router  = inject(Router);
  const token   = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');

  if (token && userRaw) {
    try {
      const user = JSON.parse(userRaw);

      const cloned = req.clone({
        headers: req.headers
          .set('Authorization', `Bearer ${token}`)
          .set('X-User-Id', String(user.id)),
      });

      return next(cloned).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            localStorage.clear();
            router.navigate(['/login']);
          }
          return throwError(() => error);
        })
      );
    } catch {
      localStorage.clear();
      return next(req);
    }
  }

  return next(req);
};