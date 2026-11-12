import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { BrowserSessionService } from '../services/browser-session.service';
import { environment } from '../../../environments/environment';

describe('authInterceptor session safety', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let session: BrowserSessionService;
  let router: jasmine.SpyObj<Router>;
  const user = { id: '1', name: 'Test', email: 'test@example.invalid' };
  const endpoint = environment.apiUrl + '/auth/me';
  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      { provide: Router, useValue: router },
    ] });
    http = TestBed.inject(HttpClient); requests = TestBed.inject(HttpTestingController);
    session = TestBed.inject(BrowserSessionService);
  });
  afterEach(() => requests.verify());

  it('does not erase a newer session when an older request returns 401 late', () => {
    session.establish(user, 'older-session');
    http.get(endpoint).subscribe({ error: () => undefined });
    const pending = requests.expectOne(endpoint);
    expect(pending.request.headers.get('Authorization')).toBe('Bearer older-session');
    session.establish({ ...user, id: '2' }, 'newer-session');
    pending.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.authenticated()).toBeTrue();
    expect(session.user()?.id).toBe('2');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears memory on a genuine 401 without changing display preferences', () => {
    session.establish(user, 'current-session');
    localStorage.setItem('finflow-theme-test', 'dark');
    http.get(endpoint).subscribe({ error: () => undefined });
    requests.expectOne(endpoint).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(session.user()).toBeNull();
    expect(session.bearer()).toBeNull();
    expect(localStorage.getItem('finflow-theme-test')).toBe('dark');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    localStorage.removeItem('finflow-theme-test');
  });

  it('never sends a stale bearer to login or a third-party origin', () => {
    session.establish(user, 'expired-session');
    const login = environment.apiUrl + '/auth/login';
    http.post(login, {}).subscribe();
    const publicRequest = requests.expectOne(login);
    expect(publicRequest.request.headers.has('Authorization')).toBeFalse();
    publicRequest.flush({});
    http.get('https://external.example/test').subscribe();
    const external = requests.expectOne('https://external.example/test');
    expect(external.request.headers.has('Authorization')).toBeFalse();
    external.flush({});
  });
});
