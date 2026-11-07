import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
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
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, CommonModule, PrivacyPolicyComponent],
  template: `
    <div class="auth-wrapper">
      <section class="auth-showcase" aria-label="Conoce FinFlow">
      <div class="showcase-brand"><span class="showcase-logo">F<span>·</span></span><span>FinFlow <small>PERSONAL FINANCE</small></span></div>
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
          <div class="auth-brand"><span class="auth-brand-mark">F·</span> FinFlow</div>
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
          <section class="registration-privacy">
            <h2>Tu privacidad importa</h2>
            <p *ngIf="!policyReady()" class="registration-warning" role="status">Estamos preparando la política de tratamiento de datos. No se habilitarán nuevas cuentas hasta que los datos legales estén completos.</p>
            <details *ngIf="policyReady()">
              <summary>Leer política de tratamiento de datos personales</summary>
              <app-privacy-policy [policy]="policy()"></app-privacy-policy>
            </details>
            <label class="privacy-check">
              <input type="checkbox" formControlName="privacyAccepted" [disabled]="!policyReady()"/>
              <span>He leído la política de tratamiento de datos y autorizo el uso de la información necesaria para prestar FinFlow.</span>
            </label>
            @if (form.get('privacyAccepted')?.invalid && form.get('privacyAccepted')?.touched) {
              <span class="error-msg">Debes aceptar la política vigente para registrarte.</span>
            }
            <label class="privacy-check">
              <input type="checkbox" formControlName="marketingConsent"/>
              <span>Opcional: quiero recibir información comercial y promociones por correo.</span>
            </label>
          </section>
          <button type="submit" class="btn-primary" [disabled]="loading() || !policyReady()">
            {{ loading() ? 'Creando cuenta...' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="auth-footer">
          ¿Ya tienes cuenta?
          <a routerLink="/login">Inicia sesión</a>
        </p>
        <p class="auth-creator-credit">Creado por <strong>AEVQOR</strong></p>
      </div>
    </div>
  `,
  styleUrl: '../login/login.component.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private privacy = inject(PrivacyService);
  readonly policy = signal<PrivacyPolicy | null>(null);
  readonly policyReady = signal(false);

  constructor() {
    this.privacy.policy().subscribe({
      next: p => { this.policy.set(p); this.policyReady.set(p.ready); },
      error: () => this.policyReady.set(false)
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
      privacyAccepted: [false, Validators.requiredTrue],
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

    this.loading.set(true);
    this.errorMsg.set('');

    if (!this.policyReady() || !this.policy()) {
      this.errorMsg.set('Aún no podemos procesar el registro: política de privacidad pendiente.');
      this.loading.set(false);
      return;
    }
    const { name, email, password, confirmPassword, privacyAccepted, marketingConsent } = this.form.getRawValue();
    this.auth.register({
      name: name!, email: email!, password: password!, confirmPassword: confirmPassword!,
      privacyAccepted: Boolean(privacyAccepted),
      privacyVersion: this.policy()!.version,
      marketingConsent: Boolean(marketingConsent)
    }).subscribe({
      next: () => {
        this.toast.success('¡Cuenta creada exitosamente!');
        this.router.navigate(['/dashboard']);
      },
      error: (err: string) => {
        this.errorMsg.set(err);
        this.loading.set(false);
      },
    });
  }
}
