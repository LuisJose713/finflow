import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnDestroy, Output, ViewChild, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleIdentityService } from '../../../core/services/google-identity.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-google-sign-in',
  standalone: true,
  template: `
    @if (available()) {
      <section class="google-auth" aria-label="Acceso seguro con Google">
        @if (linked()) {
          <p class="linked">Google vinculado · {{ linkedEmail() }}</p>
          <button type="button" class="unlink" [disabled]="busy()" (click)="unlink()">
            Desvincular Google
          </button>
        } @else {
          <div #googleButton class="google-button" aria-label="Continuar con Google"></div>
          @if (mode === 'link') {
            <p>Confirma en Google el mismo correo de tu cuenta FinFlow.</p>
          }
        }
        @if (busy()) { <p role="status">Verificando con Google…</p> }
        @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      </section>
    }
  `,
  styles: [`
    .google-auth{display:grid;justify-items:center;gap:.55rem;margin:1.1rem 0;text-align:center}
    .google-button{min-height:42px;width:min(100%,340px);display:flex;justify-content:center}
    .google-auth p{font-size:.8rem;color:var(--text-secondary,#657087);line-height:1.5;margin:0}
    .google-auth .error{color:#ba3030;font-weight:600}
    .google-auth .linked{color:#2f8b67;font-weight:700}
    .unlink{border:1px solid #b8c4d5;border-radius:10px;background:transparent;padding:.65rem 1rem;
      color:inherit;font:inherit;font-weight:700;cursor:pointer}
  `],
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
