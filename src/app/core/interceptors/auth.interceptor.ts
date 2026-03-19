import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const userRaw = localStorage.getItem('user');

  if (token && userRaw) {
    try {
      const user = JSON.parse(userRaw);

      const cloned = req.clone({
        headers: req.headers
          .set('Authorization', `Bearer ${token}`)
          .set('X-User-Id', String(user.id)) // 👈 lee el id del user guardado
      });

      return next(cloned);
    } catch {
      return next(req);
    }
  }

  return next(req);
};