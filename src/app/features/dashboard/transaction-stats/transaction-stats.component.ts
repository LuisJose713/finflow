import { Component, DestroyRef, inject, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DecimalPipe } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { TransactionStats } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-transaction-stats',
  standalone: true,
  imports: [AppCurrencyPipe, DecimalPipe, RouterLink],
  templateUrl: './transaction-stats.component.html',
  styleUrls: ['./transaction-stats.component.scss'],
})
export class TransactionStatsComponent {
  private txService = inject(TransactionService);
  private refresh   = inject(DashboardRefreshService);
  private readonly destroyRef = inject(DestroyRef);

  stats   = signal<TransactionStats | null>(null);
  loading = signal(true);
  loadError = signal(false);

  safeStats = computed<TransactionStats>(() => this.stats() ?? {
    totalIncome: 0, totalExpenses: 0, balance: 0, savingsRate: 0,
  });

  savingsProgress = computed(() => {
    const value = this.safeStats().savingsRate;
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  });

  constructor() {
    effect(() => {
      this.refresh.version();
      this.load();
    }, { allowSignalWrites: true }); // 👈
  }

  load() {
    this.loading.set(true);
    this.loadError.set(false);
    this.txService.getStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }
}