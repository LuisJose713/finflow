import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { TransactionService } from '../../../core/services/transaction.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';

interface MonthlyData { month: string; monthKey: string; income: number; expenses: number; }
interface ChartPoint { monthKey: string; month: string; x: number; incomeY: number; expenseY: number; income: number; expenses: number; }

/**
 * FinFlow V4: accessible SVG trend, rendered from the actual monthly-stats API.
 * No synthetic financial data or 60fps animation loop.
 */
@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [AppCurrencyPipe],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent {
  private readonly txService = inject(TransactionService);
  private readonly refresh = inject(DashboardRefreshService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly monthlyData = signal<MonthlyData[]>([]);
  readonly filter = signal<'all' | 'income' | 'expense'>('all');
  readonly scope = signal<'six' | 'year'>('six');

  readonly filteredData = computed(() => {
    const count = this.scope() === 'six' ? 6 : 12;
    return this.monthlyData().slice(-count);
  });
  readonly totalIncome = computed(() => this.filteredData().reduce((sum, point) => sum + point.income, 0));
  readonly totalExpenses = computed(() => this.filteredData().reduce((sum, point) => sum + point.expenses, 0));
  readonly netValue = computed(() => this.totalIncome() - this.totalExpenses());

  readonly chartPoints = computed<ChartPoint[]>(() => {
    const rows = this.filteredData();
    if (!rows.length) return [];
    const max = Math.max(1, ...rows.flatMap(row => [row.income, row.expenses]));
    const range = Math.max(rows.length - 1, 1);
    return rows.map((row, index) => {
      const x = rows.length === 1 ? 340 : 28 + index * (624 / range);
      return {
        ...row,
        x,
        incomeY: 170 - (row.income / max) * 128,
        expenseY: 170 - (row.expenses / max) * 128,
      };
    });
  });

  readonly incomePath = computed(() => this.makePath(this.chartPoints(), 'incomeY'));
  readonly expensePath = computed(() => this.makePath(this.chartPoints(), 'expenseY'));

  constructor() {
    effect(() => {
      this.refresh.version();
      this.load();
    }, { allowSignalWrites: true });
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.txService.getMonthlyStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        const values = Array.isArray(data) ? data : [];
        this.monthlyData.set(values
          .filter((s: any) => typeof s?.month === 'string' && /^\d{4}-\d{2}$/.test(s.month))
          .map((s: any) => ({
            monthKey: s.month,
            month: this.formatMonth(s.month),
            income: this.amount(s.income),
            expenses: this.amount(s.expenses),
          }))
          .sort((a: MonthlyData, b: MonthlyData) => a.monthKey.localeCompare(b.monthKey)));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  setScope(scope: 'six' | 'year'): void { this.scope.set(scope); }
  setFilter(filter: 'all' | 'income' | 'expense'): void { this.filter.set(filter); }

  private amount(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  private makePath(rows: ChartPoint[], field: 'incomeY' | 'expenseY'): string {
    return rows.map((row, index) => `${index === 0 ? 'M' : 'L'} ${row.x.toFixed(1)} ${row[field].toFixed(1)}`).join(' ');
  }

  private formatMonth(key: string): string {
    const [year, month] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '');
  }
}
