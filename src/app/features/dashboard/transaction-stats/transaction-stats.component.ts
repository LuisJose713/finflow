import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { TransactionStats } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
    selector: 'app-transaction-stats',
    imports: [AppCurrencyPipe, DecimalPipe],
    templateUrl: './transaction-stats.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./transaction-stats.component.scss']
})
export class TransactionStatsComponent {
  private txService = inject(TransactionService);
  private refresh   = inject(DashboardRefreshService);

  stats   = signal<TransactionStats | null>(null);
  loading = signal(true);

  safeStats = computed<TransactionStats>(() => this.stats() ?? {
    totalIncome: 0, totalExpenses: 0, balance: 0, savingsRate: 0,
  });

  constructor() {
    effect(() => {
      this.refresh.version();
      this.load();
    }, { allowSignalWrites: true }); // 👈
  }

  load() {
    this.loading.set(true);
    this.txService.getStats().subscribe({
      next:  data => { this.stats.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }
}