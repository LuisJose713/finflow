import { Component, inject, ViewChild, signal, computed } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { ExportPdfService } from '../../core/services/export-pdf.service';
import { ToastService } from '../../core/services/toast.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { AddTransactionComponent } from '../../shared/components/add-transaction/add-transaction.component';
import { ToastContainerComponent } from '../../shared/components/toast-container/toast-container.component';
import { TransactionStatsComponent } from './transaction-stats/transaction-stats.component';
import { OverviewComponent } from './overview/overview.component';
import { RecentTransactionsComponent } from './recent-transactions/recent-transactions.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    NavbarComponent,
    AddTransactionComponent,
    ToastContainerComponent,
    TransactionStatsComponent,
    OverviewComponent,
    RecentTransactionsComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  private authService = inject(AuthService);
  private exportService = inject(ExportPdfService);
  private toast = inject(ToastService);

  @ViewChild('recentTx') recentTx!: RecentTransactionsComponent;

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

  onTransactionCreated() {
    this.recentTx?.load();
  }

  exportPdf() {
    this.exportService.exportTransactions().subscribe({
      next: () => this.toast.success('PDF exportado exitosamente'),
      error: () => this.toast.error('Error al exportar PDF'),
    });
  }
}