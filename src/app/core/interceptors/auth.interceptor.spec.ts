import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { environment } from '../../../environments/environment';

describe('authInterceptor session safety', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  const endpoint = `${environment.apiUrl}/auth/me`;

  beforeEach(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    requests.verify();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });

  it('does not erase a newer login when an older request returns 401 late', () => {
    localStorage.setItem('token', 'older-session');
    http.get(endpoint).subscribe({ error: () => undefined });

    const pending = requests.expectOne(endpoint);
    expect(pending.request.headers.get('Authorization')).toBe('Bearer older-session');

    localStorage.setItem('token', 'newer-session');
    localStorage.setItem('user', JSON.stringify({ name: 'New user' }));
    pending.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('token')).toBe('newer-session');
    expect(JSON.parse(localStorage.getItem('user') ?? '{}').name).toBe('New user');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears only FinFlow credentials on a genuine 401 for the current token', () => {
    localStorage.setItem('token', 'current-session');
    localStorage.setItem('user', JSON.stringify({ name: 'User' }));
    localStorage.setItem('finflow-theme-test', 'dark');

    http.get(endpoint).subscribe({ error: () => undefined });
    requests.expectOne(endpoint).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('finflow-theme-test')).toBe('dark');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    localStorage.removeItem('finflow-theme-test');
  });

  it('never sends a saved JWT to the public login endpoint', () => {
    localStorage.setItem('token', 'expired-session');
    const login = `${environment.apiUrl}/auth/login`;
    http.post(login, { email: 'test@example.com', password: 'test' })
      .subscribe({ error: () => undefined });
    const pending = requests.expectOne(login);
    expect(pending.request.headers.has('Authorization')).toBeFalse();
    pending.flush({ token: 'new-session' });
  });
});
