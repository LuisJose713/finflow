import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, map, catchError, throwError, shareReplay } from 'rxjs';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models';
import { environment } from '../../../environments/environment';
import { BrowserSessionService } from './browser-session.service';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = inject(BrowserSessionService);
  private readonly toast = inject(ToastService);
  private readonly apiUrl = environment.apiUrl + '/auth';
  private readonly cookieSession = environment.apiUrl.startsWith('/');
  private legacyToken: string | null = null;
  private restoration?: Observable<User | null>;

  readonly currentUser = this.session.user.asReadonly();
  readonly isAuthenticated = this.session.authenticated.asReadonly();

  constructor() {
    try {
      // Never restore a profile or permissions from untrusted browser storage.
      this.legacyToken = localStorage.getItem('token');
      localStorage.removeItem('user');
    } catch { /* Storage can be disabled; cookie sessions still work. */ }
  }

  ensureSession(): Observable<User | null> {
    if (this.session.ready()) return of(this.session.user());
    if (this.restoration) return this.restoration;
    if (!this.cookieSession && !this.legacyToken && !this.session.bearer()) {
      this.session.ready.set(true);
      return of(null);
    }
    const revision = this.session.revision;
    const legacy = this.legacyToken;
    const request = this.cookieSession && legacy
      ? this.http.post<{ user: User }>(this.apiUrl + '/session', { token: legacy }).pipe(map(res => res.user))
      : this.http.get<User>(this.apiUrl + '/me', !this.cookieSession && legacy
        ? { headers: { Authorization: 'Bearer ' + legacy } } : {});
    this.restoration = request.pipe(
      map(user => {
        if (this.session.revision !== revision) return this.session.user();
        this.session.establish(user, this.cookieSession ? null : legacy);
        this.clearLegacyStorage();
        return user;
      }),
      catchError((error: HttpErrorResponse) => {
        if (this.session.revision === revision) {
          this.session.clear();
          // A temporary outage must not destroy the user's only migration credential.
          if (error.status === 401 || error.status === 403) this.clearLegacyStorage();
        }
        return of(null);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.restoration;
  }

  login(credentials: LoginRequest) {
    return this.http.post<AuthResponse>(this.apiUrl + '/login', credentials).pipe(
      tap(res => this.saveSession(res)),
      catchError((error: HttpErrorResponse) => throwError(() => this.authErrorMessage(error, 'login'))),
    );
  }

  register(data: RegisterRequest) {
    return this.http.post<AuthResponse>(this.apiUrl + '/register', data).pipe(
      tap(res => this.saveSession(res)),
      catchError((error: HttpErrorResponse) => throwError(() => this.authErrorMessage(error, 'register'))),
    );
  }

  logout() {
    const finish = () => {
      this.session.clear();
      this.clearLegacyStorage();
      this.restoration = undefined;
      void this.router.navigate(['/login']);
    };
    if (!this.cookieSession) { finish(); return; }
    this.http.post<void>(this.apiUrl + '/logout', {}).subscribe({
      next: finish,
      error: () => this.toast.error('No pudimos confirmar el cierre de sesión. Revisa la conexión y vuelve a intentarlo.'),
    });
  }

  private clearLegacyStorage() {
    this.legacyToken = null;
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); }
    catch { /* No new credentials are ever written to storage. */ }
  }

  private authErrorMessage(err: HttpErrorResponse, action: 'login' | 'register'): string {
    if (err.status === 0) return 'No pudimos conectar con el servidor. Inténtalo nuevamente.';
    if (err.status === 429) return 'Demasiados intentos. Espera un momento antes de continuar.';
    if (err.status === 400 && typeof err.error?.error === 'string' && err.error.error.includes('72 bytes')) {
      return 'La contraseña supera el máximo de 72 bytes UTF-8. Algunos caracteres, como acentos y emojis, ocupan varios bytes.';
    }
    if (action === 'login') {
      if (err.status === 401 || err.status === 403) return 'Correo electrónico o contraseña incorrectos.';
      return 'No pudimos iniciar sesión. Inténtalo nuevamente.';
    }
    if (err.status === 409) {
      const detail = String(err.error?.error ?? '').toLowerCase();
      if (detail.includes('nombre')) return 'Este nombre de usuario ya está en uso.';
      if (detail.includes('email') || detail.includes('correo')) return 'Este correo electrónico ya está registrado.';
      return 'El correo electrónico o nombre de usuario ya está registrado.';
    }
    return 'No pudimos crear tu cuenta. Inténtalo nuevamente.';
  }


  private saveSession(response: AuthResponse) {
    if (!response.user || (!this.cookieSession && !response.token)) throw new Error('Respuesta de sesión inválida');
    this.session.establish(response.user, this.cookieSession ? null : response.token!);
    this.clearLegacyStorage();
    this.restoration = undefined;
  }
}
