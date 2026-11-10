import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token  = localStorage.getItem('token');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // Verificar expiración del JWT sin librería externa
  try {
    const payload    = JSON.parse(atob(token.split('.')[1]));
    const expiredAt  = payload.exp * 1000; // exp viene en segundos
    const isExpired  = Date.now() >= expiredAt;

    if (isExpired) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.navigate(['/login']);
      return false;
    }

    return true;
  } catch {
    // Token malformado
    localStorage.removeItem('token');
      localStorage.removeItem('user');
    router.navigate(['/login']);
    return false;
  }
};