import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token  = localStorage.getItem('token');

  if (!token) return true;

  try {
    const payload   = JSON.parse(atob(token.split('.')[1]));
    const isExpired = Date.now() >= payload.exp * 1000;

    if (isExpired) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return true; // token expirado → puede ir al login
    }

    // Token válido → ya está logueado, redirige al dashboard
    router.navigate(['/dashboard']);
    return false;
  } catch {
    localStorage.removeItem('token');
      localStorage.removeItem('user');
    return true;
  }
};