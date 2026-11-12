import { SelectReadabilityService } from './core/services/select-readability.service';
import { DailyRemindersService } from './core/services/daily-reminders.service';
import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { catchError, filter, forkJoin, of } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { PrivacyPolicy, PrivacyService } from './core/services/privacy.service';
import { UpdateNoticeComponent } from './shared/components/update-notice.component';
import { PrivacyPolicyComponent } from './shared/components/privacy-policy.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, PrivacyPolicyComponent, UpdateNoticeComponent],
  template: `
    <router-outlet/>
    <app-update-notice/>
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
    @if (showSignupNotice() && !needsConsent()) {
      <div class="privacy-shield" (click)="dismissSignupNotice()">
        <section #signupDialog class="privacy-dialog signup-privacy-dialog"
                 role="dialog" aria-modal="true"
                 aria-labelledby="signup-privacy-title"
                 aria-describedby="signup-privacy-desc"
                 tabindex="-1"
                 (click)="$event.stopPropagation()">
          <header>
            <span>FINFLOW · TU PRIVACIDAD</span>
            <h2 id="signup-privacy-title">Tu información, bajo tu control</h2>
            <p id="signup-privacy-desc">Queremos que conozcas cómo FinFlow trata tus datos personales, tanto si acabas de registrarte como si ya utilizabas la aplicación.</p>
          </header>
          <div class="privacy-scroll" tabindex="0" aria-label="Información de tratamiento de datos">
            <app-privacy-policy [policy]="policy()"/>
          </div>
          <footer>
            @if (policy()?.ready) {
              <p class="signup-privacy-status">Puedes consultar el comprobante de tu autorización
                y cambiar el permiso comercial desde el centro de privacidad.</p>
            } @else {
              <p class="signup-privacy-status">La política formal continúa en revisión.
                Esta ventana es informativa: cerrarla no registra ninguna autorización
                ni supone que hayas aceptado una política pendiente.</p>
            }
            <button data-signup-dismiss type="button" (click)="dismissSignupNotice()">
              Entendido, continuar a mi inicio
            </button>
            <a routerLink="/privacy" (click)="dismissSignupNotice()">
              Consultar el tratamiento de datos y mis derechos
            </a>
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
    .signup-privacy-dialog header p{margin-bottom:0}
    .signup-privacy-dialog footer{gap:.8rem}
    .signup-privacy-dialog .signup-privacy-status{font-size:.82rem;line-height:1.55;color:#586b80;margin:0;padding:.65rem .85rem;background:#f4f7fa;border-radius:10px}
    .signup-privacy-dialog footer a{color:#285683;text-align:center;font-size:.78rem;text-decoration:underline;text-underline-offset:3px}
    .signup-privacy-dialog :is(a,button,[tabindex="0"]):focus-visible{outline:3px solid #b58c50;outline-offset:3px}
    @media(max-width:600px){.privacy-shield{padding:0;align-items:end}.privacy-dialog{border-radius:18px 18px 0 0;max-height:100dvh}.privacy-dialog header{padding:1rem}.privacy-footer-links{align-items:stretch;flex-direction:column}}
  `]
})
export class AppComponent {
  private readonly selectReadability = inject(SelectReadabilityService);
  readonly auth = inject(AuthService);
  private readonly privacy = inject(PrivacyService);
  private readonly reminders = inject(DailyRemindersService);
  private readonly router = inject(Router);
  readonly currentRoute = signal(this.router.url);
  readonly privacyStatusLoaded = signal(false);
  // This describes the education notice revision, not a legal policy version.
  readonly noticeRevision = 'notice-v2';

  readonly needsConsent = signal(false);
  readonly policy = signal<PrivacyPolicy | null>(null);
  readonly accepted = signal(false);
  readonly marketing = signal(false);
  readonly saving = signal(false);
  readonly privacyError = signal('');

  // Existing and newly registered accounts see this education notice once
  // for each policy version in this browser. It is NOT consent.
  readonly showSignupNotice = computed(() => {
    const requestedId = this.privacy.signupNoticeUserId();
    const currentUser = this.auth.currentUser();
    const route = this.currentRoute();
    const policy = this.policy();
    this.privacy.noticeRevision();

    if (!this.auth.isAuthenticated() || !route.startsWith('/dashboard')
        || this.needsConsent()) {
      return false;
    }

    // The informational notice must not depend on /privacy/status succeeding.
    // For a published policy, wait for the actual consent status first.
    if (policy?.ready && !this.privacyStatusLoaded()) return false;

    const userIdentity = currentUser?.id || currentUser?.email;
    if (!userIdentity) return false;
    const version = (policy?.version || '2026-11-09-v1') + ':' + this.noticeRevision;
    const preview = /(?:[?&])privacy=1(?:&|$)/.test(route);

    // Show the informational onboarding notice only when registration explicitly
    // queued it for this account. Existing users must not see it at every login.
    // Preview remains available for QA and never records legal consent.
    const queuedForCurrentUser = requestedId != null
      && String(requestedId) === String(userIdentity);
    return preview || (queuedForCurrentUser
      && !this.privacy.isNoticeAcknowledged(userIdentity, version));
  });
  @ViewChild('signupDialog') private signupDialog?: ElementRef<HTMLElement>;

  dismissSignupNotice() {
    const user = this.auth.currentUser();
    const userIdentity = user?.id || user?.email;
    const version = (this.policy()?.version || '2026-11-09-v1') + ':' + this.noticeRevision;
    if (userIdentity) {
      this.privacy.acknowledgeNotice(userIdentity, version);
    } else {
      this.privacy.dismissSignupNotice();
    }
    // Remove preview query so the modal actually stays dismissed.
    if (/(?:[?&])privacy=1(?:&|$)/.test(this.currentRoute())) {
      void this.router.navigate([], {
        queryParams: { privacy: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleSignupNoticeKeyboard(event: KeyboardEvent) {
    if (!this.showSignupNotice() || this.needsConsent()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.dismissSignupNotice();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = this.signupDialog?.nativeElement;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex="0"]'
    )).filter(element => element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  constructor() {
    this.auth.ensureSession().subscribe();
    effect(() => {
      const user = this.auth.currentUser();
      this.reminders.start(this.auth.isAuthenticated() && user?.email ? String(user.email).toLowerCase() : null);
    });
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.currentRoute.set(event.urlAfterRedirects));
    effect(() => {
      if (this.showSignupNotice() && !this.needsConsent()) {
        setTimeout(() => {
          if (this.showSignupNotice()) {
            this.signupDialog?.nativeElement.querySelector<HTMLElement>(
              '[data-signup-dismiss]'
            )?.focus();
          }
        }, 0);
      }
    });
    effect(onCleanup => {
      const token = this.auth.isAuthenticated();
      this.needsConsent.set(false);
      this.privacyStatusLoaded.set(false);
      this.accepted.set(false);
      this.privacyError.set('');
      if (!token) return;
      const sub = forkJoin({
        status: this.privacy.status().pipe(catchError(() => of(null))),
        policy: this.privacy.policy().pipe(catchError(() => of(null)))
      }).subscribe({
        next: ({ status, policy }) => {
          this.policy.set(policy);
          // Only a successful check with a published policy can open the
          // authorization dialog. The backend still enforces consent.
          this.needsConsent.set(Boolean(policy?.ready && status?.policyReady && !status.accepted));
          this.privacyStatusLoaded.set(true);
        },
        error: () => {
          // Do not suppress the informational notice when an API is down.
          this.privacyStatusLoaded.set(true);
        }
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
      next: () => {
        const user = this.auth.currentUser();
        if (user) this.privacy.acknowledgeNotice(user.id || user.email, policy.version + ':' + this.noticeRevision);
        this.needsConsent.set(false);
        this.saving.set(false);
      },
      error: () => {
        this.privacyError.set('No se pudo guardar la autorización. Inténtalo nuevamente.');
        this.saving.set(false);
      }
    });
  }
}
