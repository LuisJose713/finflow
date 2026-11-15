import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface GoogleCredential { credential: string }
interface GoogleIdentityAPI {
  initialize(options: { client_id: string; callback: (value: GoogleCredential) => void; auto_select: boolean }): void;
  renderButton(target: HTMLElement, options: {
    theme: string; size: string; text: string; type: string; shape: string; width: number; locale: string;
  }): void;
}
declare global { interface Window { google?: { accounts: { id: GoogleIdentityAPI } } } }
export interface GoogleConfig { enabled: boolean; webClientId: string }
export interface GoogleLinkStatus { linked: boolean; email: string }

/** Google SDK renders its own official sign-in button, never a counterfeit login. */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = environment.apiUrl + '/auth/google';
  private loading?: Promise<void>;
  config(): Promise<GoogleConfig> {
    return firstValueFrom(this.http.get<GoogleConfig>(this.endpoint + '/config'));
  }
  status(): Promise<GoogleLinkStatus> {
    return firstValueFrom(this.http.get<GoogleLinkStatus>(this.endpoint + '/status'));
  }
  link(idToken: string): Promise<GoogleLinkStatus> {
    return firstValueFrom(this.http.post<GoogleLinkStatus>(this.endpoint + '/link', { idToken }));
  }
  unlink(): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.endpoint + '/link'));
  }

  async render(target: HTMLElement, clientId: string, callback: (token: string) => void): Promise<void> {
    if (!/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
      throw new Error('Google OAuth requiere configuración.');
    }
    await this.loadSDK();
    if (!window.google?.accounts?.id) throw new Error('Google no está disponible en este navegador.');
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        if (typeof credential === 'string' && credential.length <= 8192) callback(credential);
      },
      auto_select: false,
    });
    target.replaceChildren();
    window.google.accounts.id.renderButton(target, {
      theme: 'outline', size: 'large', text: 'continue_with', type: 'standard',
      shape: 'rectangular', width: Math.min(Math.max(200, target.clientWidth), 340), locale: 'es',
    });
  }
  private loadSDK(): Promise<void> {
    if (window.google?.accounts?.id) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => { this.loading = undefined; reject(new Error('No se pudo cargar Google.')); };
      document.head.appendChild(script);
    });
    return this.loading;
  }
}
