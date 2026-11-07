import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  imports: [ReactiveFormsModule, RouterLink],
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
            <input
              id="password"
              type="password"
              autocomplete="new-password"
              formControlName="password"
              placeholder="••••••••"
              [class.input-error]="password?.invalid && password?.touched"
            />
            @if (password?.invalid && password?.touched) {
              <span class="error-msg">Mínimo 8 caracteres</span>
            }
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirmar contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              autocomplete="new-password"
              formControlName="confirmPassword"
              placeholder="••••••••"
              [class.input-error]="
                form.errors?.['passwordMismatch'] &&
                form.get('confirmPassword')?.touched
              "
            />
            @if (
              form.errors?.['passwordMismatch'] &&
              form.get('confirmPassword')?.touched
            ) {
              <span class="error-msg">Las contraseñas no coinciden</span>
            }
          </div>

          @if (errorMsg()) {
            <div class="alert-error" role="alert" aria-live="polite">{{ errorMsg() }}</div>
          }

          <button type="submit" class="btn-primary" [disabled]="loading()">
            {{ loading() ? 'Creando cuenta...' : 'Crear cuenta' }}
          </button>
        </form>

        <p class="auth-footer">
          ¿Ya tienes cuenta?
          <a routerLink="/login">Inicia sesión</a>
        </p>
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

  loading = signal(false);
  errorMsg = signal('');

  form = this.fb.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
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

    const { name, email, password } = this.form.getRawValue() as any;

    this.auth.register({ name, email, password }).subscribe({
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
