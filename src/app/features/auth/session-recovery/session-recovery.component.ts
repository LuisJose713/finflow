import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-session-recovery',
  standalone: true,
  templateUrl: './session-recovery.component.html',
  styleUrl: './session-recovery.component.css',
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
