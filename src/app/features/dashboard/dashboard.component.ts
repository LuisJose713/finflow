import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ExportPdfService } from '../../core/services/export-pdf.service';
import { ToastService } from '../../core/services/toast.service';
import { DailyRemindersService } from '../../core/services/daily-reminders.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';
import { TransactionStatsComponent } from './transaction-stats/transaction-stats.component';
import { OverviewComponent } from './overview/overview.component';
import { RecentTransactionsComponent } from './recent-transactions/recent-transactions.component';
import { MonthlyFocusComponent } from './monthly-focus/monthly-focus.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    NavbarComponent,
    ToastContainerComponent,
    TransactionStatsComponent,
    OverviewComponent,
    RecentTransactionsComponent,
    MonthlyFocusComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private exportService = inject(ExportPdfService);
  private toast = inject(ToastService);
  readonly reminders = inject(DailyRemindersService);

  async activateReminders(): Promise<void> {
    const ok = await this.reminders.enable();
    if (ok) this.toast.success('Recordatorios diarios activados: 10:00 y 16:00');
    else this.toast.error('Permite las notificaciones de FinFlow en tu navegador.');
  }

  deactivateReminders(): void {
    this.reminders.disable();
    this.toast.success('Recordatorios desactivados en este navegador.');
  }

  // Señal para el usuario
  user = signal(this.authService.currentUser());

  // Getter reactivo para el nombre
  firstName = computed(() => {
  return this.authService.currentUser()?.name?.split(' ')[0] ?? '';
});

  // Si quieres actualizar el usuario después de login
  refreshUser() {
    this.user.set(this.authService.currentUser());
  }

  exportPdf() {
    this.exportService.exportTransactions().subscribe({
      next: () => this.toast.success('PDF exportado exitosamente'),
      error: () => this.toast.error('Error al exportar PDF'),
    });
  }
}
