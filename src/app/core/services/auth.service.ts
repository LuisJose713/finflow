import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  // ── Signals ──────────────────────────────────────────────────────────────
  private _currentUser = signal<User | null>(this.loadUserFromStorage());
  private _token = signal<string | null>(localStorage.getItem('token'));

  readonly currentUser = this._currentUser.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  // ── Auth methods ─────────────────────────────────────────────────────────
  login(credentials: LoginRequest) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((res) => this.saveSession(res)),
        catchError((err) =>
          throwError(() => err.error?.message ?? 'Login failed')
        )
      );
  }

  register(data: RegisterRequest) {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, data)
      .pipe(
        tap((res) => this.saveSession(res)),
        catchError((err) =>
          throwError(() => err.error?.message ?? 'Registration failed')
        )
      );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._token.set(null);
    this._currentUser.set(null);
    this.router.navigate(['/login']);
  }

   // Guardar token en localStorage
  saveToken(token: string) {
    localStorage.setItem('token', token);
  }
  
  // Recuperar token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // ── Private helpers ───────────────────────────────────────────────────────
  private saveSession(res: AuthResponse) {
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res.user));
    this._token.set(res.token);
    this._currentUser.set(res.user);
  }

  private loadUserFromStorage(): User | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }
}
