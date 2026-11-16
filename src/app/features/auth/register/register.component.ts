import { Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
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
import { GoogleSignInComponent } from '../../../shared/components/google-sign-in/google-sign-in.component';
import { HttpErrorResponse } from '@angular/common/http';

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
  imports: [ReactiveFormsModule, RouterLink, PrivacyPolicyComponent, GoogleSignInComponent],
  templateUrl: './register.component.html',
  styleUrl: '../login/login.component.scss',
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

  onGoogleCredential(idToken: string) {
    if (this.loading()) return;
    if (this.policy()?.ready && (!this.form.controls.privacyAccepted.value || !this.privacyReviewed())) {
      this.privacyError.set('Lee y confirma la política de tratamiento de datos antes de registrarte con Google.');
      this.openPrivacyModal();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');
    this.auth.googleRegister({
      idToken,
      privacyAccepted: Boolean(this.policy()?.ready && this.form.controls.privacyAccepted.value),
      privacyVersion: this.policy()?.ready ? this.policy()!.version : '',
      marketingConsent: Boolean(this.form.controls.marketingConsent.value),
    }).subscribe({
      next: result => this.finishRegistration(result.user.id),
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        const code = error.error?.code;
        this.errorMsg.set(code === 'GOOGLE_LINK_REQUIRED'
          ? 'Este correo ya tiene una cuenta. Inicia sesión con tu contraseña y vincula Google desde Seguridad.'
          : code === 'PRIVACY_CONSENT_REQUIRED'
            ? 'Debes autorizar la política vigente antes de continuar.'
            : error.status === 0
              ? 'No pudimos conectar con el servidor. Inténtalo nuevamente.'
              : 'No pudimos crear tu cuenta con Google. Inténtalo nuevamente.');
      },
    });
  }

  private finishRegistration(userId: string) {
    this.toast.success('¡Cuenta creada exitosamente!');
    void this.router.navigate(['/dashboard']).then(navigated => {
      if (navigated) {
        this.privacy.queueSignupNotice(userId);
      } else {
        this.loading.set(false);
        this.errorMsg.set('La cuenta se creó, pero no pudimos abrir el inicio. Entra desde el panel principal.');
      }
    }).catch(() => {
      this.loading.set(false);
      this.errorMsg.set('La cuenta se creó, pero hubo un error de navegación. Intenta abrir el inicio.');
    });
  }

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
      next: result => this.finishRegistration(result.user.id),
      error: (err: string) => {
        this.errorMsg.set(err);
        this.loading.set(false);
      },
    });
  }
}
