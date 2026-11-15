import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-session-recovery',
  standalone: true,
  template: `
    <main class="recovery">
      <section class="panel" aria-labelledby="recovery-title">
        <img src="/finflow-logo-light.svg" alt="FinFlow" width="190" height="48"/>
        <p class="eyebrow">CONEXIÓN SEGURA</p>
        <h1 id="recovery-title">Estamos recuperando tu sesión.</h1>
        <p>Tu cuenta no se cerró. No pudimos confirmar la conexión con el servidor.
           Reintentaremos automáticamente, sin pedirte la contraseña ni exponer tus datos.</p>
        <button type="button" (click)="retry()" [disabled]="loading()">
          {{ loading() ? 'Comprobando conexión…' : 'Reintentar ahora' }}
        </button>
        <p class="hint" role="status">{{ loading() ? 'Restableciendo conexión segura…' :
            'Si no tienes internet, vuelve a conectarte. Tus datos no se modificarán.' }}</p>
      </section>
    </main>`,
  styles: [`
    .recovery{min-height:100dvh;display:grid;place-items:center;background:#09192d;
      padding:1.5rem;color:#f9f7f2;font-family:inherit}
    .panel{width:min(100%,490px);background:#152b46;border:1px solid #354763;
      border-radius:22px;padding:clamp(1.5rem,5vw,2.5rem);box-shadow:0 20px 70px #0004}
    .panel img{width:190px;height:auto;display:block;margin-bottom:2rem}
    .eyebrow{font-size:.73rem;letter-spacing:.16em;color:#d5aa67;font-weight:800}
    h1{font-size:clamp(1.45rem,4vw,2rem);line-height:1.2;margin:.75rem 0}
    p{line-height:1.6;color:#dce4ec}
    button{border:0;background:#d5aa67;color:#11253d;padding:.85rem 1.25rem;
      border-radius:11px;font:inherit;font-weight:800;cursor:pointer;margin-top:.75rem}
    button:disabled{opacity:.6;cursor:wait}
    .hint{font-size:.82rem;color:#b7c8d6}
  `],
})
export class SessionRecoveryComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  private readonly requested = this.route.snapshot.queryParamMap.get('returnUrl');
  private readonly returnUrl = this.requested?.startsWith('/') && !this.requested.startsWith('//')
      && !this.requested.startsWith('/login') && !this.requested.startsWith('/session-recovery')
        ? this.requested : '/dashboard';

  constructor() {
    // Read-only session recovery, never automatically retries a money write.
    timer(1500, 8000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.retry());
  }

  retry(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.auth.retrySession().subscribe({
      next: user => {
        this.loading.set(false);
        if (user) void this.router.navigateByUrl(this.returnUrl);
        else void this.router.navigate(['/login']);
      },
      error: () => { this.loading.set(false); },
    });
  }
}
