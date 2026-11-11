import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription, map } from 'rxjs';
import { TransactionService } from '../../../core/services/transaction.service';
import { PlannedExpenseService } from '../../../core/services/planned-expense.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { PlannedExpense } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { environment } from '../../../../environments/environment';
import { MonthSummary, calendarKey, dueDateKey, pendingPayments, summarizeMonth } from './monthly-focus.model';

@Component({
  selector: 'app-monthly-focus',
  standalone: true,
  imports: [RouterLink, AppCurrencyPipe],
  templateUrl: './monthly-focus.component.html',
  styleUrl: './monthly-focus.component.scss',
})
export class MonthlyFocusComponent {
  private readonly transactions = inject(TransactionService);
  private readonly planned = inject(PlannedExpenseService);
  private readonly refresh = inject(DashboardRefreshService);
  private readonly destroyRef = inject(DestroyRef);
  private monthRequest?: Subscription;
  private paymentsRequest?: Subscription;

  readonly budgetsReady = environment.budgetsReady;
  readonly today = signal(calendarKey(new Date()));
  readonly monthLabel = computed(() => new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })
    .format(new Date(`${this.today().slice(0, 7)}-01T12:00:00`)));
  readonly summary = signal<MonthSummary | null>(null);
  readonly monthLoading = signal(true);
  readonly monthError = signal(false);
  readonly payments = signal<PlannedExpense[]>([]);
  readonly paymentsLoading = signal(true);
  readonly paymentsError = signal(false);
  readonly pending = computed(() => pendingPayments(this.payments()));
  readonly overdue = computed(() => this.pending().filter(item => {
    const key = dueDateKey(item.dueDate);
    return key !== null && key < this.today();
  }).length);
  readonly hasActivity = computed(() => !!this.summary() && (this.summary()!.income > 0 || this.summary()!.expenses > 0));

  constructor() {
    effect(() => {
      this.refresh.version();
      this.loadMonth();
      this.loadPayments();
    }, { allowSignalWrites: true });
  }

  loadMonth(): void {
    this.monthRequest?.unsubscribe();
    this.today.set(calendarKey(new Date()));
    const monthKey = this.today().slice(0, 7);
    this.monthLoading.set(true);
    this.monthError.set(false);
    this.monthRequest = this.transactions.getMonthlyStats().pipe(
      map(data => summarizeMonth(data, monthKey)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: summary => { this.summary.set(summary); this.monthLoading.set(false); },
      error: () => { this.monthError.set(true); this.monthLoading.set(false); },
    });
  }

  loadPayments(): void {
    this.paymentsRequest?.unsubscribe();
    this.paymentsLoading.set(true);
    this.paymentsError.set(false);
    this.paymentsRequest = this.planned.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        if (!Array.isArray(data)) { this.paymentsError.set(true); }
        else { this.payments.set(data); }
        this.paymentsLoading.set(false);
      },
      error: () => { this.paymentsError.set(true); this.paymentsLoading.set(false); },
    });
  }

  paymentDate(payment: PlannedExpense): string {
    const key = dueDateKey(payment.dueDate);
    if (!key) return 'Sin fecha';
    if (key === this.today()) return 'Vence hoy';
    const formatted = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
      .format(new Date(`${key}T12:00:00`));
    return key < this.today() ? `Venció el ${formatted}` : `Vence el ${formatted}`;
  }
}
