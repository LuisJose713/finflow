import { Component, DestroyRef, inject, signal, computed, output, effect, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, finalize, map } from 'rxjs';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { Transaction } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
  selector: 'app-recent-transactions',
  templateUrl: './recent-transactions.component.html',
  styleUrls: ['./recent-transactions.component.scss'],
  standalone: true,
  imports: [DatePipe, AppCurrencyPipe, CommonModule, RouterLink],
})
export class RecentTransactionsComponent {
  private txService  = inject(TransactionService);
  private toast      = inject(ToastService);
  private refresh    = inject(DashboardRefreshService);
  private readonly destroyRef = inject(DestroyRef);
  private loadSubscription?: Subscription;

  transactions = signal<Transaction[]>([]);
  loading      = signal(true);
  readonly refreshing = signal(false);
  readonly loadError = signal(false);
  readonly selectedType = signal<'all' | 'income' | 'expense'>('all');
  readonly visibleTransactions = computed(() => {
    const type = this.selectedType();
    return type === 'all' ? this.transactions() : this.transactions().filter(tx => tx.type === type);
  });
  readonly incomeCount = computed(() => this.transactions().filter(tx => tx.type === 'income').length);
  readonly expenseCount = computed(() => this.transactions().filter(tx => tx.type === 'expense').length);
  readonly deletingIds = signal<ReadonlySet<string>>(new Set());
  deleted      = output<string>();

  constructor() {
    effect(() => {
      this.refresh.version();
      untracked(() => this.load());
    }, { allowSignalWrites: true });
  }

  load(): void {
    this.loadSubscription?.unsubscribe();
    // Avoid replacing already rendered financial movements with skeleton rows
    // on refresh. On failure, show the last-known result with a clear warning.
    const keepVisible = this.transactions().length > 0;
    this.loading.set(!keepVisible);
    this.refreshing.set(keepVisible);
    this.loadError.set(false);
    this.loadSubscription = this.txService.getRecent().pipe(
      map(data => {
        if (!Array.isArray(data)) throw new Error('Invalid recent transactions');
        return data;
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.loading.set(false);
        this.refreshing.set(false);
      }),
    ).subscribe({
      next: data => this.transactions.set(data),
      error: () => this.loadError.set(true),
    });
  }

  confirmDelete(tx: Transaction) {
    if (this.deletingIds().has(tx.id)) return;
    if (!confirm(`¿Eliminar "${tx.description}"?`)) return;
    this.deletingIds.update(ids => new Set([...ids, tx.id]));
    this.txService.delete(tx.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.deletingIds.update(ids => {
        const remaining = new Set(ids);
        remaining.delete(tx.id);
        return remaining;
      })),
    ).subscribe({
      next: () => {
        // A request started before the deletion cannot put the removed row back.
        this.loadSubscription?.unsubscribe();
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
