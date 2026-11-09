import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { PrivacyPolicy, PrivacyService } from './core/services/privacy.service';
import { PrivacyPolicyComponent } from './shared/components/privacy-policy.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, PrivacyPolicyComponent],
  template: `
    <router-outlet/>
    @if (needsConsent()) {
      <div class="privacy-shield">
        <section class="privacy-dialog" role="dialog" aria-modal="true"
                 aria-labelledby="privacy-consent-heading">
          <header>
            <span>FINFLOW · DECIDE SOBRE TUS DATOS</span>
            <h2 id="privacy-consent-heading">Autorización de tratamiento de datos</h2>
            <p>Ya tienes una cuenta. Antes de seguir utilizando tus funciones financieras, necesitamos tu decisión expresa sobre la política vigente. El permiso comercial es independiente.</p>
          </header>
          <div class="privacy-scroll" tabindex="0" aria-label="Política completa">
            <app-privacy-policy [policy]="policy()"/>
          </div>
          <footer>
            <label class="privacy-check">
              <input type="checkbox" [checked]="accepted()" (change)="accepted.set(!accepted())"/>
              <span>He leído y acepto expresamente el tratamiento necesario para usar FinFlow.</span>
            </label>
            <label class="privacy-check">
              <input type="checkbox" [checked]="marketing()" (change)="marketing.set(!marketing())"/>
              <span>Opcional: quiero recibir promociones o novedades. Puedo revocarlo después.</span>
            </label>
            @if (privacyError()) {
              <p class="privacy-error" role="alert">{{privacyError()}}</p>
            }
            <button type="button" (click)="confirmConsent()" [disabled]="!accepted() || saving()">
              {{saving() ? 'Guardando tu decisión…' : 'Aceptar y continuar'}}
            </button>
            <div class="privacy-footer-links">
              <a routerLink="/privacy">Información y derechos</a>
              <button type="button" class="privacy-leave" (click)="auth.logout()">No acepto · Cerrar sesión</button>
            </div>
          </footer>
        </section>
      </div>
    }
  `,
  styles: [`
    .privacy-shield{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;background:#061328e8;backdrop-filter:blur(8px);padding:clamp(.5rem,2vw,1.7rem)}
    .privacy-dialog{display:flex;flex-direction:column;width:min(100%,720px);max-height:calc(100dvh - 1rem);min-height:0;overflow:hidden;background:var(--bg-primary,#fff);color:var(--text-primary,#13253c);border-radius:18px;box-shadow:0 22px 75px #0007}
    .privacy-dialog header{padding:1.2rem clamp(1rem,3vw,1.8rem);border-bottom:1px solid var(--border,#dce2e9)}
    .privacy-dialog header span{font-size:.67rem;letter-spacing:.17em;font-weight:800;color:#b58c50}
    .privacy-dialog h2{margin:.5rem 0;font-size:clamp(1.25rem,3vw,1.75rem)}
    .privacy-dialog header p{font-size:.83rem;line-height:1.7;color:var(--text-secondary,#55657a)}
    .privacy-scroll{padding:1rem clamp(1rem,3vw,1.8rem);flex:1 1 auto;overflow-y:auto;min-height:0}
    .privacy-dialog footer{padding:1rem clamp(1rem,3vw,1.8rem) calc(1rem + env(safe-area-inset-bottom));display:grid;gap:.7rem;border-top:1px solid var(--border,#dce2e9)}
    .privacy-check{display:flex;align-items:flex-start;gap:.7rem;font-size:.82rem;line-height:1.5;cursor:pointer}
    .privacy-check input{flex:0 0 20px;width:20px;height:20px;margin-top:2px;accent-color:#173a64}
    .privacy-dialog button{cursor:pointer;min-height:45px;background:#122d4d;color:white;border:0;border-radius:10px;font-weight:750}
    .privacy-dialog button:disabled{opacity:.5;cursor:not-allowed}
    .privacy-dialog .privacy-leave{background:transparent;color:var(--text-primary,#13253c);border:1px solid var(--border,#dce2e9);padding:.55rem 1rem}
    .privacy-footer-links{display:flex;align-items:center;justify-content:space-between;gap:.8rem;flex-wrap:wrap}
    .privacy-footer-links a{font-size:.78rem;color:#2563a0}
    .privacy-error{font-size:.8rem;color:#a5243b}
    @media(max-width:600px){.privacy-shield{padding:0;align-items:end}.privacy-dialog{border-radius:18px 18px 0 0;max-height:100dvh}.privacy-dialog header{padding:1rem}.privacy-footer-links{align-items:stretch;flex-direction:column}}
  `]
})
export class AppComponent {
  readonly auth = inject(AuthService);
  private readonly privacy = inject(PrivacyService);

  readonly needsConsent = signal(false);
  readonly policy = signal<PrivacyPolicy | null>(null);
  readonly accepted = signal(false);
  readonly marketing = signal(false);
  readonly saving = signal(false);
  readonly privacyError = signal('');

  constructor() {
    effect(onCleanup => {
      const token = this.auth.token();
      this.needsConsent.set(false);
      this.accepted.set(false);
      this.privacyError.set('');
      if (!token) return;
      const sub = forkJoin({
        status: this.privacy.status(),
        policy: this.privacy.policy()
      }).subscribe({
        next: ({ status, policy }) => {
          this.policy.set(policy);
          if (policy.ready && status.policyReady && !status.accepted) {
            this.needsConsent.set(true);
          }
        },
        error: () => { /* The backend remains authoritative on protected APIs. */ }
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  confirmConsent() {
    const policy = this.policy();
    if (!policy?.ready || !this.accepted() || this.saving()) return;
    this.privacyError.set('');
    this.saving.set(true);
    this.privacy.consent(true, policy.version, this.marketing()).subscribe({
      next: () => { this.needsConsent.set(false); this.saving.set(false); },
      error: () => {
        this.privacyError.set('No se pudo guardar la autorización. Inténtalo nuevamente.');
        this.saving.set(false);
      }
    });
  }
}
