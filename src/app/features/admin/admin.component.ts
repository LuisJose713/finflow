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
    if (this.auth.currentUser()?.role !== 'ADMIN') {
      this.error.set('Acceso reservado a la cuenta administradora.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api.getOverview().subscribe({
      next: data => { this.overview.set(data); this.loading.set(false); },
      error: err => {
        this.error.set(err.status === 403
          ? 'No tienes permisos para consultar estas estadísticas.'
          : 'No fue posible obtener las estadísticas. Inténtalo nuevamente.');
        this.loading.set(false);
      }
    });
  }
}
