import { Component, DestroyRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { Subscription, finalize, map } from 'rxjs';
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
  imports: [AppCurrencyPipe, RouterLink, DecimalPipe],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent {
  private readonly txService = inject(TransactionService);
  private readonly refresh = inject(DashboardRefreshService);
  private readonly destroyRef = inject(DestroyRef);
  private loadSubscription?: Subscription;

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly monthlyData = signal<MonthlyData[]>([]);
  readonly filter = signal<'all' | 'income' | 'expense'>('all');
  readonly chartType = signal<'line' | 'donut'>(this.readChartType());
  readonly selectedDonutSegment = signal<'income' | 'expense' | null>(null);
  readonly scope = signal<'six' | 'year'>('six');
  readonly selectedMonth = signal<string | null>(null);
  readonly activePoint = computed(() => this.chartPoints().find(p => p.monthKey === this.selectedMonth()) ?? null);

  readonly filteredData = computed(() => {
    if (!this.monthlyData().length) return [];
    const count = this.scope() === 'six' ? 6 : 12;
    // Always show a continuous calendar timeline, even when the API omits empty months.
    const today = new Date();
    const stats = new Map(this.monthlyData().map(row => [row.monthKey, row]));
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (count - 1 - index), 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return stats.get(monthKey) ?? { monthKey, month: this.formatMonth(monthKey), income: 0, expenses: 0 };
    });
  });
  readonly totalIncome = computed(() => this.filteredData().reduce((sum, point) => sum + point.income, 0));
  readonly totalExpenses = computed(() => this.filteredData().reduce((sum, point) => sum + point.expenses, 0));
  readonly netValue = computed(() => this.totalIncome() - this.totalExpenses());
  readonly donutTotal = computed(() => (this.filter() !== 'expense' ? this.totalIncome() : 0) + (this.filter() !== 'income' ? this.totalExpenses() : 0));
  readonly donutIncomePercent = computed(() => this.donutTotal() > 0 && this.filter() !== 'expense' ? this.totalIncome() / this.donutTotal() * 100 : 0);
  readonly donutExpensePercent = computed(() => this.donutTotal() > 0 && this.filter() !== 'income' ? this.totalExpenses() / this.donutTotal() * 100 : 0);
  readonly highlightedDonutSegment = computed<'income' | 'expense' | null>(() => {
    if (this.filter() === 'income') return 'income';
    if (this.filter() === 'expense') return 'expense';
    return this.selectedDonutSegment();
  });
  readonly highlightedDonutValue = computed(() => {
    const selected = this.highlightedDonutSegment();
    return selected === 'income' ? this.totalIncome() : selected === 'expense' ? this.totalExpenses() : this.donutTotal();
  });
  readonly highlightedDonutLabel = computed(() => this.highlightedDonutSegment() === 'income' ? 'Ingresos' : this.highlightedDonutSegment() === 'expense' ? 'Gastos' : 'Total del periodo');
  readonly highlightedDonutPercent = computed(() => this.highlightedDonutSegment() === 'income' ? this.donutIncomePercent() : this.highlightedDonutSegment() === 'expense' ? this.donutExpensePercent() : null);
  selectDonutSegment(segment: 'income' | 'expense'): void {
    if (this.filter() === 'income' || this.filter() === 'expense') return;
    this.selectedDonutSegment.set(segment);
  }
  readonly hasHistory = computed(() => this.monthlyData().some(row => row.income > 0 || row.expenses > 0));

  readonly chartPoints = computed<ChartPoint[]>(() => {
    const rows = this.filteredData();
    // Calendar padding must not turn an empty account or period into a zero-valued chart.
    if (!rows.some(row => row.income > 0 || row.expenses > 0)) return [];
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
      untracked(() => this.load());
    }, { allowSignalWrites: true });
  }

  load(): void {
    // A later refresh owns the result; older requests must never overwrite it.
    this.loadSubscription?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(false);
    this.loadSubscription = this.txService.getMonthlyStats().pipe(
      map(data => this.parseMonthlyData(data)),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: data => {
        this.monthlyData.set(data);
        if (!this.chartPoints().some(point => point.monthKey === this.selectedMonth())) {
          this.selectedMonth.set(null);
        }
      },
      error: () => this.loadError.set(true),
    });
  }

  setChartType(type: 'line' | 'donut'): void {
    this.chartType.set(type);
    try { localStorage.setItem('finflow.dashboard.chartType', type); } catch { /* Storage can be unavailable. */ }
  }
  private readChartType(): 'line' | 'donut' {
    try { return localStorage.getItem('finflow.dashboard.chartType') === 'donut' ? 'donut' : 'line'; }
    catch { return 'line'; }
  }

  setScope(scope: 'six' | 'year'): void { this.scope.set(scope); this.selectedMonth.set(null); }
  selectPoint(monthKey: string): void { this.selectedMonth.set(monthKey); }
  selectFromPointer(event: PointerEvent): void {
    const svg = event.currentTarget as SVGSVGElement;
    const bounds = svg.getBoundingClientRect();
    const rows = this.chartPoints();
    if (!bounds.width || !rows.length) return;
    const x = ((event.clientX - bounds.left) / bounds.width) * 680;
    const nearest = rows.reduce((best, point) => Math.abs(point.x - x) < Math.abs(best.x - x) ? point : best);
    this.selectedMonth.set(nearest.monthKey);
  }
  moveSelection(delta: number): void {
    const rows = this.chartPoints();
    if (!rows.length) return;
    const current = rows.findIndex(row => row.monthKey === this.selectedMonth());
    const index = current < 0
      ? (delta < 0 ? rows.length - 1 : 0)
      : Math.max(0, Math.min(rows.length - 1, current + delta));
    this.selectedMonth.set(rows[index].monthKey);
  }
  setFilter(filter: 'all' | 'income' | 'expense'): void { this.filter.set(filter); this.selectedDonutSegment.set(null); }

  monthLabel(key: string): string {
    const [year, month] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
  }

  private parseMonthlyData(data: unknown): MonthlyData[] {
    if (!Array.isArray(data)) throw new Error('Invalid monthly statistics');
    const months = new Set<string>();
    return data.map(row => {
      if (typeof row?.month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month) || months.has(row.month)) {
        throw new Error('Invalid statistics month');
      }
      months.add(row.month);
      return {
        monthKey: row.month,
        month: this.formatMonth(row.month),
        income: this.amount(row.income),
        expenses: this.amount(row.expenses),
      };
    }).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }

  private amount(value: unknown): number {
    const n = typeof value === 'number' || (typeof value === 'string' && value.trim() !== '') ? Number(value) : NaN;
    // Corrupt financial data is an error, not a fabricated zero.
    if (!Number.isFinite(n) || n < 0) throw new Error('Invalid monthly amount');
    return n;
  }

  private makePath(rows: ChartPoint[], field: 'incomeY' | 'expenseY'): string {
    return rows.map((row, index) => `${index === 0 ? 'M' : 'L'} ${row.x.toFixed(1)} ${row[field].toFixed(1)}`).join(' ');
  }

  private formatMonth(key: string): string {
    const [year, month] = key.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(new Date(year, month - 1, 1)).replace('.', '');
  }
}
