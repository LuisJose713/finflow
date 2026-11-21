import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.ensureSession().pipe(
    map(user => user ? true : router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    })),
    catchError(() => of(router.createUrlTree(['/session-recovery'], {
      queryParams: { returnUrl: state.url },
    }))),
  );
};
