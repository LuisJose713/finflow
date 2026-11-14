import { fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    service = new ToastService();
  });

  it('hides errors automatically after four seconds', fakeAsync(() => {
    service.error('No pudimos conectar con el servidor');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].duration).toBe(4000);

    tick(3999);
    expect(service.toasts().length).toBe(1);
    tick(1);
    expect(service.toasts().length).toBe(0);
  }));

  it('deduplicates the same alert, even after manual dismissal', fakeAsync(() => {
    service.error('Permite las notificaciones');
    service.error('Permite las notificaciones');
    expect(service.toasts().length).toBe(1);

    service.dismiss(service.toasts()[0].id);
    service.error('Permite las notificaciones');
    expect(service.toasts().length).toBe(0);

    tick(4000);
    service.error('Permite las notificaciones');
    expect(service.toasts().length).toBe(1);
    tick(4000);
  }));

  it('limits the stack to two and discards the oldest alert', fakeAsync(() => {
    service.success('Guardado');
    service.warning('Revisa los datos');
    service.error('Sin conexión');
    expect(service.toasts().map(toast => toast.message)).toEqual([
      'Revisa los datos',
      'Sin conexión',
    ]);

    tick(4000);
    expect(service.toasts().length).toBe(0);
  }));

  it('replaces zero-duration errors with a four-second timeout', fakeAsync(() => {
    service.show('No disponible', 'error', 0);
    expect(service.toasts()[0].duration).toBe(4000);
    tick(4000);
    expect(service.toasts().length).toBe(0);
  }));
});
