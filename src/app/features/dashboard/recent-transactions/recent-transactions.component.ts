import { Component, inject, OnInit, signal, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../core/services/toast.service';
import { Transaction } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-recent-transactions',
  standalone: true,
  imports: [DatePipe, AppCurrencyPipe],
  template: `
    <div class="transactions-card">
      <div class="card-header">
        <h2>Transacciones recientes</h2>
        <span class="badge">Últimas 5</span>
      </div>

      @if (loading()) {
        <div class="list">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="transaction-item skeleton"></div>
          }
        </div>
      } @else if (transactions().length === 0) {
        <div class="empty-state">
          <p>No hay transacciones aún</p>
          <small>Agrega tu primera transacción para comenzar</small>
        </div>
      } @else {
        <ul class="list">
          @for (tx of transactions(); track tx.id) {
            <li class="transaction-item">
              <div class="tx-icon" [class]="tx.type">
                {{ tx.type === 'income' ? '↑' : '↓' }}
              </div>
              <div class="tx-info">
                <span class="tx-title">{{ tx.title }}</span>
                <span class="tx-meta">
                  {{ tx.category }} · {{ tx.date | date: 'dd MMM yyyy' }}
                </span>
              </div>
              <div class="tx-actions">
                <span
                  class="tx-amount"
                  [class.income]="tx.type === 'income'"
                  [class.expense]="tx.type === 'expense'"
                >
                  {{ tx.type === 'income' ? '+' : '-' }}{{ tx.amount | appCurrency }}
                </span>
                <button
                  class="btn-delete"
                  (click)="confirmDelete(tx)"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styleUrl: './recent-transactions.component.scss',
})
export class RecentTransactionsComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private toast = inject(ToastService);

  transactions = signal<Transaction[]>([]);
  loading = signal(true);

  deleted = output<string>();

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
    if (!confirm(`¿Eliminar "${tx.title}"?`)) return;

    this.transactionService.delete(tx.id).subscribe({
      next: () => {
        this.transactions.update((list) => list.filter((t) => t.id !== tx.id));
        this.toast.success('Transacción eliminada');
        this.deleted.emit(tx.id);
      },
      error: () => this.toast.error('No se pudo eliminar'),
    });
  }
}
