import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService password limit feedback', () => {
  beforeEach(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('explains the UTF-8 password limit on login instead of saying the credentials are incorrect', () => {
    const errors: string[] = [];
    TestBed.inject(AuthService).login({ email: 'qa@example.invalid', password: 'á'.repeat(37) })
      .subscribe({ error: error => errors.push(error) });
    const request = TestBed.inject(HttpTestingController).expectOne(req => req.url.endsWith('/auth/login'));
    expect(request.request.body.password).toBe('á'.repeat(37));
    request.flush({ error: 'La contraseña supera el máximo de 72 bytes UTF-8' }, { status: 400, statusText: 'Bad Request' });
    expect(errors[0]).toContain('72 bytes UTF-8');
  });

  it('does not expose unrelated server error details to the user', () => {
    const errors: string[] = [];
    TestBed.inject(AuthService).login({ email: 'qa@example.invalid', password: 'test-password' })
      .subscribe({ error: error => errors.push(error) });
    TestBed.inject(HttpTestingController).expectOne(req => req.url.endsWith('/auth/login'))
      .flush({ error: 'Internal database detail' }, { status: 500, statusText: 'Error' });
    expect(errors[0]).not.toContain('database');
  });
});
