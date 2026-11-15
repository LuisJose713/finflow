import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { GoogleSignInComponent } from '../../../shared/components/google-sign-in/google-sign-in.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, GoogleSignInComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  loading = signal(false);
  errorMsg = signal('');
  showPassword = signal(false);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get email() { return this.form.get('email'); }
  get password() { return this.form.get('password'); }

  onGoogleLogin(): void {
    this.toast.success('¡Bienvenido a FinFlow!');
    void this.router.navigate(['/dashboard']);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    this.auth.login(this.form.getRawValue() as any).subscribe({
      next: () => {
        this.toast.success('¡Bienvenido de vuelta!');
        this.router.navigate(['/dashboard']);
      },
      error: (err: string) => {
        this.errorMsg.set(err);
        this.loading.set(false);
      },
    });
  }
}
