import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { hasUnexpiredSession } from './session-token';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token  = localStorage.getItem('token');

  if (hasUnexpiredSession(token)) return router.createUrlTree(['/dashboard']);
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return true;
};
