// import { Component, inject, OnInit, signal, ElementRef, ViewChild, effect } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { TransactionService } from '../../../core/services/transaction.service';
// import { TransactionStats } from '../../../core/models';
// import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';
// import { DecimalPipe } from '@angular/common';
// import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';

// Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

// @Component({
//   selector: 'app-transaction-stats',
//   standalone: true,
//   imports: [AppCurrencyPipe, DecimalPipe],
//   templateUrl: './transaction-stats.component.html',
//   styleUrls: ['./transaction-stats.component.scss'],
// })
// export class TransactionStatsComponent implements OnInit {
//   private transactionService = inject(TransactionService);

//  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;


//   stats = signal<TransactionStats | null>(null);
//   loading = signal(true);

//   /** Getter seguro para el template */
//   get safeStats(): TransactionStats {
//     return this.stats() ?? {
//       totalIncome: 0,
//       totalExpenses: 0,
//       balance: 0,
//       savingsRate: 0,
//     };
//   }

//   ngOnInit() {
//     this.transactionService.getStats().subscribe({
//       next: (data) => {
//         this.stats.set(data);
//         this.loading.set(false);
//       },
//       error: () => this.loading.set(false),
//     });
//   }
// }

import { Component, OnInit, inject, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';
Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

@Component({
  selector: 'app-transaction-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './transaction-stats.component.html',
  styleUrls: ['./transaction-stats.component.scss'],
})
export class TransactionStatsComponent implements OnInit {
  private transactionService = inject(TransactionService);

  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  monthlyStats = signal<any[]>([]);
  filter = signal<'all' | 'income' | 'expense'>('all');
  loading = signal(true);
  chart: Chart | null = null;

  ngOnInit() {
    this.transactionService.getMonthlyStats().subscribe({
      next: (data) => {
        this.monthlyStats.set(data);
        this.loading.set(false);
        setTimeout(() => this.renderChart(), 0);
      },
      error: () => this.loading.set(false),
    });
  }

  setFilter(f: 'all' | 'income' | 'expense') {
    this.filter.set(f);
    this.renderChart();
  }

  renderChart() {
    if (!this.chartCanvas) return;
    if (this.chart) this.chart.destroy();

    const stats = this.monthlyStats();
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

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'doughnut',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#94a3b8' } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` $${ctx.parsed.toLocaleString()}`
            }
          }
        }
      }
    });
  }

  get totalIncome() {
    return this.monthlyStats().reduce((acc, s) => acc + s.income, 0);
  }

  get totalExpenses() {
    return this.monthlyStats().reduce((acc, s) => acc + s.expenses, 0);
  }
}