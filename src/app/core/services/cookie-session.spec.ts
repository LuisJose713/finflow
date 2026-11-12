import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('production cookie sessions', () => {
  let originalApi: string;
  const user = { id: '7', name: 'Test', email: 'test@example.invalid', role: 'USER' };
  beforeEach(() => {
    originalApi = environment.apiUrl; environment.apiUrl = '/api';
    localStorage.removeItem('token'); localStorage.removeItem('user');
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    environment.apiUrl = originalApi;
    localStorage.removeItem('token'); localStorage.removeItem('user');
  });

  it('logs in without persisting a profile or exposing any bearer', () => {
    const auth = TestBed.inject(AuthService);
    const write = spyOn(Storage.prototype, 'setItem').and.callThrough();
    auth.login({ email: user.email, password: 'test-only' }).subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush({ user });
    expect(auth.isAuthenticated()).toBeTrue();
    expect(auth.currentUser()?.email).toBe(user.email);
    expect(write).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('restores a cookie session from the trusted profile endpoint', () => {
    const auth = TestBed.inject(AuthService);
    auth.ensureSession().subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush(user);
    expect(auth.isAuthenticated()).toBeTrue();
    expect(auth.currentUser()?.id).toBe('7');
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('migrates an existing session once and removes its old persistent credentials', () => {
    localStorage.setItem('token', 'legacy-token');
    localStorage.setItem('user', JSON.stringify(user));
    const auth = TestBed.inject(AuthService);
    expect(localStorage.getItem('user')).toBeNull();
    auth.ensureSession().subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/session');
    expect(request.request.body).toEqual({ token: 'legacy-token' });
    request.flush({ user });
    expect(localStorage.getItem('token')).toBeNull();
    expect(auth.isAuthenticated()).toBeTrue();
  });

  it('ignores profile restoration that arrives after another login', () => {
    const auth = TestBed.inject(AuthService);
    auth.ensureSession().subscribe();
    const restoration = TestBed.inject(HttpTestingController).expectOne('/api/auth/me');
    auth.login({ email: user.email, password: 'test-only' }).subscribe();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush({ user });
    restoration.flush({ ...user, id: 'older-user' });
    expect(auth.currentUser()?.id).toBe('7');
  });
});
