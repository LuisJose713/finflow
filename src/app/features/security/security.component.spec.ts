import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { SecurityComponent } from './security.component';
import { AuthService } from '../../core/services/auth.service';

describe('SecurityComponent account deletion', () => {
  let controller: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    controller = TestBed.inject(HttpTestingController);
  });
  afterEach(() => controller.verify());

  const setup = () => TestBed.runInInjectionContext(() => new SecurityComponent());

  it('does not send DELETE without the password and exact confirmation', () => {
    const component = setup();
    component.deletePassword = 'secret';
    component.deletePhrase = 'eliminar';
    const confirm = spyOn(window, 'confirm').and.returnValue(true);
    component.deleteAccount();
    expect(component.error()).toContain('ELIMINAR');
    expect(confirm).not.toHaveBeenCalled();
    controller.expectNone(req => req.url.endsWith('/auth/account'));
  });

  it('sends only password to authenticated endpoint and clears session only on 204', () => {
    const component = setup();
    const auth = TestBed.inject(AuthService);
    const finished = spyOn(auth, 'finishAccountDeletion');
    spyOn(window, 'confirm').and.returnValue(true);
    component.deletePassword = 'correct-secret';
    component.deletePhrase = 'ELIMINAR';
    component.deleteAccount();
    const request = controller.expectOne(req => req.url.endsWith('/auth/account'));
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ password: 'correct-secret' });
    expect(finished).not.toHaveBeenCalled();
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(finished).toHaveBeenCalledTimes(1);
    expect(component.deletePassword).toBe('');
    expect(component.deletePhrase).toBe('');
  });

  it('keeps the session on incorrect password and gives a clear retry message', () => {
    const component = setup();
    const finished = spyOn(TestBed.inject(AuthService), 'finishAccountDeletion');
    spyOn(window, 'confirm').and.returnValue(true);
    component.deletePassword = 'incorrect';
    component.deletePhrase = 'ELIMINAR';
    component.deleteAccount();
    controller.expectOne(req => req.url.endsWith('/auth/account'))
      .flush({ error: 'Contraseña incorrecta' }, { status: 403, statusText: 'Forbidden' });
    expect(component.error()).toContain('Contraseña incorrecta');
    expect(finished).not.toHaveBeenCalled();
  });
});
