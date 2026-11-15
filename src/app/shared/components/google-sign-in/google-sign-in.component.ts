import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleIdentityService } from '../../../core/services/google-identity.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-google-sign-in',
  standalone: true,
  templateUrl: './google-sign-in.component.html',
  styleUrl: './google-sign-in.component.css',
})
export class GoogleSignInComponent implements AfterViewInit, OnDestroy {
  @Input() mode: 'login' | 'link' = 'login';
  @Output() completed = new EventEmitter<void>();
  @Output() errorOccurred = new EventEmitter<string>();
  @ViewChild('googleButton') private button?: ElementRef<HTMLElement>;
  private readonly google = inject(GoogleIdentityService);
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  private destroyed = false;
  readonly available = signal(false);
  readonly linked = signal(false);
  readonly linkedEmail = signal('');
  readonly busy = signal(false);
  readonly error = signal('');

  ngAfterViewInit(): void { void this.initialize(); }
  ngOnDestroy(): void { this.destroyed = true; }

  private async initialize(): Promise<void> {
    try {
      const settings = await this.google.config();
      if (this.destroyed || !settings.enabled || !settings.webClientId) return;
      if (this.mode === 'link') {
        const status = await this.google.status();
        if (this.destroyed) return;
        this.linked.set(status.linked);
        this.linkedEmail.set(status.email);
      }
      this.available.set(true);
      // @if renders its target in the next change-detection turn.
      this.zone.run(() => {
        setTimeout(() => { if (!this.destroyed && !this.linked()) {
          const target = this.button?.nativeElement;
          if (target) void this.google.render(target, settings.webClientId, token =>
            this.zone.run(() => { void this.receive(token); })).catch(() =>
              this.error.set('No se pudo mostrar Google. Revisa tu navegador.'));
        } }, 0);
      });
    } catch {
      // An unavailable backend must not break the password login.
      this.available.set(false);
    }
  }

  private async receive(token: string): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    try {
      if (this.mode === 'login') {
        await firstValueFrom(this.auth.googleLogin(token));
      } else {
        const status = await this.google.link(token);
        this.linked.set(status.linked);
        this.linkedEmail.set(status.email);
      }
      if (!this.destroyed) this.completed.emit();
    } catch (e: any) {
      if (this.destroyed) return;
      const response = e?.error?.code === 'GOOGLE_LINK_REQUIRED'
        ? 'Inicia sesión con tu contraseña y vincula Google desde Seguridad antes de usar este acceso.'
        : 'No pudimos confirmar Google. Revisa que uses el mismo correo y vuelve a intentarlo.';
      this.error.set(response);
      this.errorOccurred.emit(response);
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
  }

  async unlink(): Promise<void> {
    if (!this.linked() || this.busy() || !window.confirm('¿Desvincular Google? Tu contraseña de FinFlow seguirá funcionando.')) return;
    this.busy.set(true); this.error.set('');
    try {
      await this.google.unlink();
      if (!this.destroyed) {
        this.linked.set(false);
        this.linkedEmail.set('');
        this.available.set(false);
        void this.initialize();
      }
    } catch {
      if (!this.destroyed) this.error.set('No pudimos desvincular Google.');
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
  }
}
