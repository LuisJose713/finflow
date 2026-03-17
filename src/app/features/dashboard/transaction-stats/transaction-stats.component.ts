import { Component, inject, OnInit, signal } from '@angular/core';
import { TransactionService } from '../../../core/services/transaction.service';
import { TransactionStats } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { DecimalPipe } from '@angular/common'

@Component({
  selector: 'app-transaction-stats',
  standalone: true,
  imports: [AppCurrencyPipe, DecimalPipe],
  templateUrl: './transaction-stats.component.html',
  styleUrls: ['./transaction-stats.component.scss'],
})
export class TransactionStatsComponent implements OnInit {
  private transactionService = inject(TransactionService);

  stats = signal<TransactionStats | null>(null);
  loading = signal(true);

  /** Getter seguro para el template */
  get safeStats(): TransactionStats {
    return this.stats() ?? {
      totalIncome: 0,
      totalExpenses: 0,
      balance: 0,
      savingsRate: 0,
    };
  }

  ngOnInit() {
    this.transactionService.getStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}