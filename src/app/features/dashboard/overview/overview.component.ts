import {
  Component,
  inject,
  OnInit,
  signal,
  ElementRef,
  viewChild,
  AfterViewInit,
} from '@angular/core';
import { TransactionService } from '../../../core/services/transaction.service';
import { Transaction } from '../../../core/models';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

@Component({
  selector: 'app-overview',
  standalone: true,
  template: `
    <div class="overview-card">
      <div class="card-header">
        <h2>Resumen mensual</h2>
        <div class="legend">
          <span class="legend-item income">Ingresos</span>
          <span class="legend-item expense">Gastos</span>
        </div>
      </div>

      @if (loading()) {
        <div class="chart-skeleton"></div>
      } @else {
        <div class="chart-wrapper">
          <canvas #chartCanvas></canvas>
        </div>
      }
    </div>
  `,
  styleUrl: './overview.component.scss',
})
export class OverviewComponent implements OnInit, AfterViewInit {
  private transactionService = inject(TransactionService);

  chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  loading = signal(true);
  monthlyData = signal<MonthlyData[]>([]);

  ngOnInit() {
    this.transactionService.getAll(1, 100).subscribe({
      next: ({ data }) => {
        this.monthlyData.set(this.groupByMonth(data));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit() {
    // Chart renders after data loads
  }

  private groupByMonth(transactions: Transaction[]): MonthlyData[] {
    const map = new Map<string, MonthlyData>();

    transactions.forEach((t) => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleString('es', { month: 'short', year: '2-digit' });

      if (!map.has(key)) {
        map.set(key, { month: label, income: 0, expenses: 0 });
      }

      const entry = map.get(key)!;
      if (t.type === 'income') entry.income += t.amount;
      else entry.expenses += t.amount;
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);
  }

  getBarHeight(value: number): number {
    const max = Math.max(
      ...this.monthlyData().flatMap((d) => [d.income, d.expenses])
    );
    return max > 0 ? (value / max) * 100 : 0;
  }
}
