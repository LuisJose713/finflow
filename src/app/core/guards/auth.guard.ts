import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { hasUnexpiredSession } from './session-token';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token  = localStorage.getItem('token');

  if (hasUnexpiredSession(token)) return true;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  return router.createUrlTree(['/login']);
};
