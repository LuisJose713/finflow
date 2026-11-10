import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AdminOverview, AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private readonly api = inject(AdminService);
  readonly auth = inject(AuthService);
  readonly overview = signal<AdminOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly monthMax = computed(() =>
    Math.max(1, ...(this.overview()?.monthlyActivity ?? []).map(m => Number(m.transactions)))
  );

  ngOnInit() { this.refresh(); }
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
