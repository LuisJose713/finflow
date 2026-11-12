import { DismissibleCardDirective } from '../../shared/directives/dismissible-card.directive';
import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { timer } from 'rxjs';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AdminOverview, AdminPlatformHealth, AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DismissibleCardDirective, CommonModule, NavbarComponent, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private readonly api = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  readonly auth = inject(AuthService);
  readonly overview = signal<AdminOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly monitor = signal<AdminPlatformHealth | null>(null);
  readonly monitorLoading = signal(false);
  readonly monitorError = signal('');
  readonly monthMax = computed(() =>
    Math.max(1, ...(this.overview()?.monthlyActivity ?? []).map(m => Number(m.transactions)))
  );

  ngOnInit() {
    this.refresh();
    // Stop polling when the admin leaves this page; avoid duplicate requests.
    timer(0, 60_000).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshMonitor());
  }

  refreshMonitor() {
    if (this.monitorLoading()) return;
    this.monitorLoading.set(true);
    this.monitorError.set('');
    this.api.getPlatformHealth().subscribe({
      next: result => {
        this.monitor.set(result);
        this.monitorLoading.set(false);
      },
      error: err => {
        // Never show stale UP indicators when the status endpoint fails.
        this.monitor.set(null);
        this.monitorError.set(err.status === 403
          ? 'No tienes permisos para consultar este monitor.'
          : err.status === 401
            ? 'Tu sesión ha expirado.'
            : 'No pudimos comprobar los servicios. Inténtalo nuevamente.');
        this.monitorLoading.set(false);
      }
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'UP': return 'Operativo';
      case 'DOWN': return 'No responde';
      case 'NOT_CONFIGURED': return 'Sin configurar';
      case 'DEGRADED': return 'Con incidencias';
      default: return 'No disponible';
    }
  }
  refresh() {
    // El backend verifica ROLE_ADMIN. No bloquear por un perfil local aún sin hidratar.
    this.loading.set(true);
    this.error.set('');
    this.api.getOverview().subscribe({
      next: data => { this.overview.set(data); this.loading.set(false); },
      error: err => {
        this.overview.set(null);
        this.error.set(err.status === 403
          ? 'Esta cuenta no tiene permiso de administración.'
          : err.status === 401
          ? 'Tu sesión expiró. Inicia sesión nuevamente.'
          : 'No pudimos cargar las estadísticas. Comprueba tu conexión e inténtalo otra vez.');
        this.loading.set(false);
      }
    });
  }
}
