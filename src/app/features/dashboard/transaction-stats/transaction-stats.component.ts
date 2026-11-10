import { Component, inject, signal, computed, effect, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { CommonModule, DecimalPipe } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { TransactionStats } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-transaction-stats',
  standalone: true,
  imports: [AppCurrencyPipe, DecimalPipe],
  templateUrl: './transaction-stats.component.html',
  styleUrls: ['./transaction-stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionStatsComponent {
  private txService = inject(TransactionService);
  private refresh   = inject(DashboardRefreshService);
  private destroyRef = inject(DestroyRef);
  private pending?: Subscription;

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
    this.pending?.unsubscribe();
    this.loading.set(true);
    this.pending = this.txService.getStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next:  data => { this.stats.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });
  }
}