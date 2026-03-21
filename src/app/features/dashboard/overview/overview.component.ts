import {
  Component,
  inject,
  OnInit,
  signal,
  ElementRef,
  viewChild,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';

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
export class OverviewComponent implements OnInit, OnDestroy {
  private transactionService = inject(TransactionService);

  chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  loading = signal(true);
  monthlyData = signal<MonthlyData[]>([]);
  filter = signal<'all' | 'income' | 'expense'>('all');

  // Expose Math to template
  readonly Math = Math;

  private animationId: number | null = null;

  // Chart colors — keep in sync with your CSS vars if desired
  private readonly C_INC      = '#22c55e';
  private readonly C_INC_TRACK = 'rgba(34, 197, 94, 0.15)';
  private readonly C_EXP      = '#ef4444';
  private readonly C_EXP_TRACK = 'rgba(239, 68, 68, 0.15)';

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
        // Wait a tick for @if to render the canvas
        setTimeout(() => this.renderChart(), 0);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy() {
    this.cancelAnimation();
  }

  setFilter(f: 'all' | 'income' | 'expense') {
    this.filter.set(f);
    this.renderChart();
  }

  renderChart() {
    const canvasRef = this.chartCanvas();
    if (!canvasRef) return;

    this.cancelAnimation();

    const canvas = canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;

    const outerR = W * 0.44;
    const outerW = W * 0.12;
    const innerR = W * 0.30;
    const innerW = W * 0.12;

    const TAU   = Math.PI * 2;
    const START = -Math.PI / 2; // top

    const income  = this.totalIncome;
    const expense = this.totalExpenses;
    const expFrac = income > 0 ? Math.min(expense / income, 1) : 0;

    const showIncome  = this.filter() !== 'expense';
    const showExpense = this.filter() !== 'income';

    const DURATION = 900;
    const startTime = performance.now();

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const drawRing = (
      r: number,
      lineW: number,
      fraction: number,
      color: string,
      trackColor: string,
    ) => {
      // Track
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.strokeStyle = trackColor;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.stroke();

      if (fraction <= 0) return;

      // Filled arc
      ctx.beginPath();
      ctx.arc(cx, cy, r, START, START + TAU * fraction);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.stroke();
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t       = Math.min(elapsed / DURATION, 1);
      const p       = easeOut(t);

      ctx.clearRect(0, 0, W, H);

      if (showIncome) {
        drawRing(outerR, outerW, p, this.C_INC, this.C_INC_TRACK);
      }

      if (showExpense) {
        drawRing(innerR, innerW, expFrac * p, this.C_EXP, this.C_EXP_TRACK);
      }

      if (t < 1) {
        this.animationId = requestAnimationFrame(tick);
      }
    };

    this.animationId = requestAnimationFrame(tick);
  }

  private cancelAnimation() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private formatMonth(key: string): string {
    const [year, month] = key.split('-');
    const date = new Date(+year, +month - 1);
    return date.toLocaleString('es', { month: 'short', year: '2-digit' });
  }

  get totalIncome(): number {
    return this.monthlyData().reduce((acc, s) => acc + s.income, 0);
  }

  get totalExpenses(): number {
    return this.monthlyData().reduce((acc, s) => acc + s.expenses, 0);
  }

  get netValue(): number {
    return this.totalIncome - this.totalExpenses;
  }
}