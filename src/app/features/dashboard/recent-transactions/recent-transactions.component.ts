import { Component, OnInit, inject, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../core/services/toast.service';
import { Transaction } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-recent-transactions',
  templateUrl: './recent-transactions.component.html',
  styleUrls: ['./recent-transactions.component.scss'],
  standalone: true,
  imports: [DatePipe, AppCurrencyPipe, CommonModule],
})
export class RecentTransactionsComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private toast = inject(ToastService);

  transactions = signal<Transaction[]>([]);
  loading = signal(true);

  @Output() deleted = new EventEmitter<string>();

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.transactionService.getRecent(5).subscribe({
      next: (data) => {
        this.transactions.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  confirmDelete(tx: Transaction) {
  if (!confirm(`¿Eliminar "${tx.description}"?`)) return;

    this.transactionService.delete(tx.id).subscribe({
      next: () => {
        this.transactions.update((list) => list.filter((t) => t.id !== tx.id));
        this.toast.success('Transacción eliminada');
        this.deleted.emit(tx.id);
      },
      error: () => this.toast.error('No se pudo eliminar'),
    });
  }

  // ✅ Función trackById para *ngFor
  trackById(index: number, item: Transaction): string {
    return item.id;
  }
}