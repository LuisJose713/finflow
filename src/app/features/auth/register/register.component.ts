import { Component, ElementRef, HostListener, ViewChild, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PrivacyPolicy, PrivacyService } from '../../../core/services/privacy.service';
import { PrivacyPolicyComponent } from '../../../shared/components/privacy-policy.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

function passwordMatchValidator(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
    selector: 'app-register',
    imports: [ReactiveFormsModule, RouterLink, PrivacyPolicyComponent],
    template: `
    <div class="auth-wrapper">
      <section class="auth-showcase" aria-label="Conoce FinFlow">
      <div class="showcase-brand"><img class="showcase-brand-image" src="/finflow-logo.svg" alt="FinFlow" width="390" height="96" /></div>
      <div class="showcase-copy">
        <span class="showcase-eyebrow">TU DINERO, CON OTRO NIVEL DE CLARIDAD</span>
        <h2>La tranquilidad<br>de tener <em>el control.</em></h2>
        <p>Un espacio para entender cada movimiento, construir tus metas y tomar mejores decisiones financieras.</p>
        <div class="showcase-chips"><span>Visión clara</span><span>Metas reales</span><span>Tu futuro</span></div>
      </div>
      <div class="showcase-foot"><span class="showcase-foot-line"></span><span>INTELIGENCIA FINANCIERA PERSONAL</span></div>
    </section>
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-brand"><img class="auth-brand-image" src="/finflow-logo-light.svg" alt="FinFlow" width="390" height="96" /></div>
          <h1>Empieza a construir tu futuro</h1>
          <p>Crea tu cuenta y da el primer paso hacia el control de tus finanzas.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="name">Nombre completo</label>
            <input
              id="name"
              type="text"
              formControlName="name"
              placeholder="Juan Pérez"
              [class.input-error]="name?.invalid && name?.touched"
            />
            @if (name?.invalid && name?.touched) {
              <span class="error-msg">El nombre es requerido</span>
            }
          </div>

          <div class="form-group">
            <label for="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              autocomplete="email"
              inputmode="email"
              formControlName="email"
              placeholder="tu@correo.com"
              [class.input-error]="email?.invalid && email?.touched"
            />
            @if (email?.invalid && email?.touched) {
              <span class="error-msg">Correo inválido</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Contraseña</label>
            <div class="password-input-wrap">
<input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              autocomplete="new-password"
              formControlName="password"
              placeholder="••••••••"
              [class.input-error]="password?.invalid && password?.touched"
            />
<button class="password-visibility-toggle" type="button" (click)="showPassword.set(!showPassword())" [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="showPassword()">{{ showPassword() ? 'Ocultar' : 'Mostrar' }}</button>
</div>
            @if (password?.invalid && password?.touched) {
              <span class="error-msg">Mínimo 8 caracteres</span>
            }
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirmar contraseña</label>
            <div class="password-input-wrap">
<input
              id="confirmPassword"
              [type]="showConfirmPassword() ? 'text' : 'password'"
              autocomplete="new-password"
              formControlName="confirmPassword"
              placeholder="••••••••"
              [class.input-error]="
                form.errors?.['passwordMismatch'] &&
                (form.get('confirmPassword')?.touched || form.get('confirmPassword')?.dirty)
              "
            />
<button class="password-visibility-toggle" type="button" (click)="showConfirmPassword.set(!showConfirmPassword())" [attr.aria-label]="showConfirmPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="showConfirmPassword()">{{ showConfirmPassword() ? 'Ocultar' : 'Mostrar' }}</button>
</div>
            @if (
              form.errors?.['passwordMismatch'] &&
              (form.get('confirmPassword')?.touched || form.get('confirmPassword')?.dirty)
            ) {
              <span class="error-msg">Las contraseñas no coinciden</span>
            }
          </div>

          @if (errorMsg()) {
            <div class="alert-error" role="alert" aria-live="polite">{{ errorMsg() }}</div>
          }

          @if (form.get('password')?.value && form.get('confirmPassword')?.value && !form.errors?.['passwordMismatch']) {
            <p class="password-match-indicator" role="status">Las contraseñas coinciden.</p>
          }
          <section class="registration-privacy privacy-entry" aria-labelledby="registration-privacy-heading">
            <span class="privacy-entry-label">PRIVACIDAD · TU DECISIÓN</span>
            <h2 id="registration-privacy-heading">Tratamiento de datos personales</h2>
            <p><strong>Responsable:</strong> {{ policy()?.controllerName || 'SoftDevCode S.A.S.' }} ·
              NIT {{ policy()?.controllerNit || '901796447' }}</p>
            @if (policy()?.ready) {
              <p>Para crear tu cuenta, revisa la política vigente y elige si deseas recibir novedades comerciales.</p>
              <button #privacyTrigger type="button" class="privacy-open-modal" (click)="openPrivacyModal()">
                {{ privacyReviewed() ? 'Revisar mi autorización' : 'Leer política y autorizar' }}
              </button>
              @if (privacyReviewed()) {
                <p class="privacy-reviewed" role="status">Autorización revisada ·
                  Promociones {{ form.controls.marketingConsent.value ? 'aceptadas' : 'no autorizadas' }}</p>
              }
            } @else {
              <p class="privacy-pending" role="status">Después de crear tu cuenta entrarás al inicio de FinFlow y verás automáticamente una ventana con información sobre el tratamiento de tus datos. La política formal sigue pendiente de aprobación y todavía no se registra una autorización legal.</p>
            }
            @if (privacyError()) {
              <span class="error-msg" role="alert">{{ privacyError() }}</span>
            }
          </section>
          <button type="submit" class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Creando cuenta...' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="auth-footer">
          ¿Ya tienes cuenta?
          <a routerLink="/login">Inicia sesión</a>
        </p>
        <p class="auth-footer"><button type="button" class="privacy-footer-button" (click)="openPrivacyModal()">Tratamiento de datos personales</button></p>

        <p class="auth-creator-credit">Creado por <strong>AEVQOR</strong></p>
      </div>
      @if (privacyModalOpen()) {
        <div class="ff-consent-backdrop" role="presentation" (click)="closePrivacyModal()">
          <section #privacyDialog class="ff-consent-modal" role="dialog" aria-modal="true"
                   aria-labelledby="ff-consent-title" aria-describedby="ff-consent-explainer"
                   (click)="$event.stopPropagation()" tabindex="-1">
            <header class="ff-consent-header">
              <div>
                <span>FINFLOW · PRIVACIDAD</span>
                <h2 id="ff-consent-title">Tratamiento de datos personales</h2>
                <p id="ff-consent-explainer">SoftDevCode S.A.S. · NIT 901796447 · FinFlow / AEVQOR</p>
              </div>
              <button data-modal-close type="button" class="ff-consent-close"
                      aria-label="Cerrar información de privacidad" (click)="closePrivacyModal()">×</button>
            </header>
            <div class="ff-consent-scroll" tabindex="0" aria-label="Información de tratamiento de datos">
              <app-privacy-policy [policy]="policy()"/>
            </div>
            <footer class="ff-consent-footer">
              @if (policy()?.ready) {
                <label class="ff-consent-check">
                  <input type="checkbox" [checked]="form.controls.privacyAccepted.value ?? false"
                         (change)="form.controls.privacyAccepted.setValue($any($event.target).checked)" />
                  <span>He leído la política y autorizo expresamente el tratamiento necesario para utilizar FinFlow.</span>
                </label>
                <label class="ff-consent-check">
                  <input type="checkbox" [checked]="form.controls.marketingConsent.value ?? false"
                         (change)="form.controls.marketingConsent.setValue($any($event.target).checked)" />
                  <span>Opcional: quiero recibir noticias y promociones. Puedo retirar esta autorización.</span>
                </label>
                <button type="button" class="ff-consent-confirm"
                        [disabled]="!form.controls.privacyAccepted.value"
                        (click)="confirmPrivacyReview()">Confirmar mi decisión</button>
              } @else {
                <p class="ff-consent-pending" role="status">Este documento todavía está en revisión. Puedes leerlo, pero no se guarda ningún consentimiento hasta su aprobación y publicación.</p>
                <button type="button" class="ff-consent-confirm" (click)="closePrivacyModal()">Entendido</button>
              }
              <p class="ff-consent-more">Para consultas y solicitudes de derechos,
                <a routerLink="/privacy" (click)="closePrivacyModal()">consulta el centro de privacidad.</a>
              </p>
            </footer>
          </section>
        </div>
      }
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: '../login/login.component.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private privacy = inject(PrivacyService);
  readonly policy = signal<PrivacyPolicy | null>(null);
  readonly privacyError = signal('');
  readonly privacyModalOpen = signal(false);
  readonly privacyReviewed = signal(false);
  @ViewChild('privacyDialog') private privacyDialog?: ElementRef<HTMLElement>;

  openPrivacyModal() {
    this.privacyModalOpen.set(true);
    this.privacyReviewed.set(false);
    this.privacyError.set('');
    setTimeout(() => this.privacyDialog?.nativeElement.querySelector<HTMLElement>('[data-modal-close]')?.focus(), 0);
  }

  closePrivacyModal() {
    this.privacyModalOpen.set(false);
  }

  confirmPrivacyReview() {
    if (!this.policy()?.ready || !this.form.controls.privacyAccepted.value) return;
    this.privacyReviewed.set(true);
    this.privacyError.set('');
    this.closePrivacyModal();
  }

  @HostListener('document:keydown', ['$event'])
  onPrivacyDialogKeydown(event: KeyboardEvent) {
    if (!this.privacyModalOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closePrivacyModal();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = this.privacyDialog?.nativeElement;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]'
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
    this.privacy.policy().subscribe({
      next: value => this.policy.set(value),
      error: () => this.policy.set(null)
    });
  }

  loading = signal(false);
  errorMsg = signal('');
  showPassword = signal(false);
  showConfirmPassword = signal(false);

  form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      privacyAccepted: [false],
      marketingConsent: [false],
    },
    { validators: passwordMatchValidator }
  );

  get name() { return this.form.get('name'); }
  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.policy()?.ready && (!this.form.controls.privacyAccepted.value || !this.privacyReviewed())) {
      this.privacyError.set('Lee y confirma tu autorización para continuar.');
      this.openPrivacyModal();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.privacyError.set('');
    const { name, email, password, confirmPassword, privacyAccepted, marketingConsent } = this.form.getRawValue();

    this.auth.register({
      name: name!, email: email!, password: password!, confirmPassword: confirmPassword!,
      ...(this.policy()?.ready ? {
        privacyAccepted: Boolean(privacyAccepted),
        privacyVersion: this.policy()!.version,
        marketingConsent: Boolean(marketingConsent)
      } : {})
    }).subscribe({
      next: result => {
        this.toast.success('¡Cuenta creada exitosamente!');
        // First enter the financial home; only then open the one-time notice.
        // This must not be confused with a legal authorization receipt.
        void this.router.navigate(['/dashboard']).then(navigated => {
          if (navigated) {
            this.privacy.queueSignupNotice(result.user.id);
          } else {
            this.loading.set(false);
            this.errorMsg.set('La cuenta se creó, pero no pudimos abrir el inicio. Entra desde el panel principal.');
          }
        }).catch(() => {
          this.loading.set(false);
          this.errorMsg.set('La cuenta se creó, pero hubo un error de navegación. Intenta abrir el inicio.');
        });
      },
      error: (err: string) => {
        this.errorMsg.set(err);
        this.loading.set(false);
      },
    });
  }
}
