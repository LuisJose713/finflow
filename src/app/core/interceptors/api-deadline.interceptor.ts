import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';

/** No automatic retries for monetary writes: a timed-out write may have completed. */
export const apiDeadlineInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl.replace(/\/$/, '');
  if (!req.url.startsWith(base + '/')) return next(req);
  const longRequest = /\/(ai|transactions\/export)\//.test(req.url);
  return next(req).pipe(
    // Each event, including Sent, starts a bounded wait for the following event.
    timeout({ each: longRequest ? 95000 : 25000 }),
    catchError(error => throwError(() => error instanceof TimeoutError ? new HttpErrorResponse({
      status: 504, statusText: 'Request timed out', url: req.url,
      error: { error: 'La solicitud tardó demasiado. Comprueba el resultado antes de repetir una operación.' },
    }) : error)),
  );
};
