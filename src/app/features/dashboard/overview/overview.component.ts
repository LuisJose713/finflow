// import {
//   Component,
//   inject,
//   OnInit,
//   signal,
//   ElementRef,
//   viewChild,
//   AfterViewInit,
// } from '@angular/core';
// import { TransactionService } from '../../../core/services/transaction.service';
// import { Transaction } from '../../../core/models';

// interface MonthlyData {
//   month: string;
//   income: number;
//   expenses: number;
// }

// @Component({
//   selector: 'app-overview',
//   standalone: true,
//   templateUrl: './overview.component.html',
//   styleUrl: './overview.component.scss',
// })
// export class OverviewComponent implements OnInit, AfterViewInit {
//   private transactionService = inject(TransactionService);

//   chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

//   loading = signal(true);
//   monthlyData = signal<MonthlyData[]>([]);

//   ngOnInit() {
//     this.transactionService.getAll(1, 100).subscribe({
//       next: ({ data }) => {
//         this.monthlyData.set(this.groupByMonth(data));
//         this.loading.set(false);
//       },
//       error: () => this.loading.set(false),
//     });
//   }

//   ngAfterViewInit() {
//     // Chart renders after data loads
//   }

//   private groupByMonth(transactions: Transaction[]): MonthlyData[] {
//     const map = new Map<string, MonthlyData>();

//     transactions.forEach((t) => {
//       const date = new Date(t.date);
//       const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
//       const label = date.toLocaleString('es', { month: 'short', year: '2-digit' });

//       if (!map.has(key)) {
//         map.set(key, { month: label, income: 0, expenses: 0 });
//       }

//       const entry = map.get(key)!;
//       if (t.type === 'income') entry.income += t.amount;
//       else entry.expenses += t.amount;
//     });

//     return Array.from(map.entries())
//       .sort(([a], [b]) => a.localeCompare(b))
//       .slice(-6)
//       .map(([, v]) => v);
//   }

//   getBarHeight(value: number): number {
//     const max = Math.max(
//       ...this.monthlyData().flatMap((d) => [d.income, d.expenses])
//     );
//     return max > 0 ? (value / max) * 100 : 0;
//   }
// }


import {
  Component,
  inject,
  OnInit,
  signal,
  ElementRef,
  viewChild,
  AfterViewInit,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent implements OnInit, AfterViewInit {
  private transactionService = inject(TransactionService);

  chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  loading = signal(true);
  monthlyData = signal<MonthlyData[]>([]);
  filter = signal<'all' | 'income' | 'expense'>('all');
  private chart: Chart | null = null;

  ngOnInit() {
    this.transactionService.getMonthlyStats().subscribe({
      next: (data) => {
        const mapped = data.map((s: any) => ({
          month: this.formatMonth(s.month),
          income: s.income,
          expenses: s.expenses,
        }));
        this.monthlyData.set(mapped);
        this.loading.set(false);
        setTimeout(() => this.renderChart(), 0);
      },
      error: () => this.loading.set(false),
    });
  }

  ngAfterViewInit() {}

  setFilter(f: 'all' | 'income' | 'expense') {
    this.filter.set(f);
    this.renderChart();
  }

  private formatMonth(key: string): string {
    const [year, month] = key.split('-');
    const date = new Date(+year, +month - 1);
    return date.toLocaleString('es', { month: 'short', year: '2-digit' });
  }

  renderChart() {
    const canvas = this.chartCanvas();
    if (!canvas) return;
    if (this.chart) this.chart.destroy();

    const stats = this.monthlyData();
    const labels = stats.map(s => s.month);
    const datasets = [];

    if (this.filter() !== 'expense') {
      datasets.push({
        label: 'Ingresos',
        data: stats.map(s => s.income),
        backgroundColor: stats.map(() => 'rgba(34, 197, 94, 0.7)'),
        borderColor: stats.map(() => 'rgba(34, 197, 94, 1)'),
        borderWidth: 2,
      });
    }

    if (this.filter() !== 'income') {
      datasets.push({
        label: 'Egresos',
        data: stats.map(s => s.expenses),
        backgroundColor: stats.map(() => 'rgba(239, 68, 68, 0.7)'),
        borderColor: stats.map(() => 'rgba(239, 68, 68, 1)'),
        borderWidth: 2,
      });
    }

    this.chart = new Chart(canvas.nativeElement, {
      type: 'doughnut',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8' } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` $${ctx.parsed.toLocaleString('es-CO')}`
            }
          }
        }
      }
    });
  }

  get totalIncome() {
    return this.monthlyData().reduce((acc, s) => acc + s.income, 0);
  }

  get totalExpenses() {
    return this.monthlyData().reduce((acc, s) => acc + s.expenses, 0);
  }
}