import { Component, inject, signal, output, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { Transaction } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
    selector: 'app-recent-transactions',
    templateUrl: './recent-transactions.component.html',
    styleUrls: ['./recent-transactions.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    imports: [DatePipe, AppCurrencyPipe, CommonModule]
})
export class RecentTransactionsComponent {
  private txService  = inject(TransactionService);
  private toast      = inject(ToastService);
  private refresh    = inject(DashboardRefreshService);

  transactions = signal<Transaction[]>([]);
  loading      = signal(true);
  deleted      = output<string>();

  constructor() {
    effect(() => {
      this.refresh.version();
      this.load();
    }, { allowSignalWrites: true }); // 👈
  }

  load() {
    this.loading.set(true);
    this.txService.getRecent().subscribe({
      next:  data => { this.transactions.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }

  confirmDelete(tx: Transaction) {
    if (!confirm(`¿Eliminar "${tx.description}"?`)) return;
    this.txService.delete(tx.id).subscribe({
      next: () => {
        this.transactions.update(list => list.filter(t => t.id !== tx.id));
        this.toast.success('Transacción eliminada');
        this.deleted.emit(tx.id);
        this.refresh.trigger();
      },
      error: () => this.toast.error('No se pudo eliminar'),
    });
  }

  trackById(_: number, item: Transaction) { return item.id; }
}