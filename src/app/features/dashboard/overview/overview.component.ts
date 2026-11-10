import {
  Component, DestroyRef, NgZone, inject, signal, computed, effect,
  ElementRef, viewChild, afterNextRender,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { TransactionService } from '../../../core/services/transaction.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';

interface MonthlyData { month: string; monthKey: string; income: number; expenses: number; }

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, AppCurrencyPipe],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss',
})
export class OverviewComponent {
  private txService = inject(TransactionService);
  private refresh   = inject(DashboardRefreshService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);

  chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');

  loading     = signal(true);
  monthlyData = signal<MonthlyData[]>([]);
  filter      = signal<'all' | 'income' | 'expense'>('all');
  scope       = signal<'month' | 'all'>('month');
  private chartReady = signal(false);

  readonly Math = Math;

  private filteredData = computed(() => {
    if (this.scope() === 'all') return this.monthlyData();
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.monthlyData().filter(d => d.monthKey === key);
  });

  totalIncome   = computed(() => this.filteredData().reduce((a, s) => a + s.income,   0));
  totalExpenses = computed(() => this.filteredData().reduce((a, s) => a + s.expenses, 0));
  netValue      = computed(() => this.totalIncome() - this.totalExpenses());

  private animationId: number | null = null;
  private chartReadyTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly C_INC       = '#22c55e';
  private readonly C_INC_TRACK = 'rgba(34, 197, 94, 0.15)';
  private readonly C_EXP       = '#ef4444';
  private readonly C_EXP_TRACK = 'rgba(239, 68, 68, 0.15)';

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.cancelAnimation();
      if (this.chartReadyTimer !== null) clearTimeout(this.chartReadyTimer);
    });

    effect(() => {
      this.refresh.version();
      this.load();
    }, { allowSignalWrites: true });

    effect(() => {
      const hasData    = this.filteredData().length > 0;
      const isReady    = this.chartReady();
      const notLoading = !this.loading();
      if (hasData && isReady && notLoading) {
        this.renderChart();
      }
    }, { allowSignalWrites: true });

    afterNextRender(() => {
      this.chartReady.set(true);
    });
  }

  load() {
    if (this.chartReadyTimer !== null) {
      clearTimeout(this.chartReadyTimer);
      this.chartReadyTimer = null;
    }
    this.cancelAnimation();
    this.loading.set(true);
    this.chartReady.set(false);
    this.txService.getMonthlyStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: data => {
        this.monthlyData.set(data.map((s: any) => ({
          monthKey: s.month,
          month:    this.formatMonth(s.month),
          income:   s.income,
          expenses: s.expenses,
        })));
        this.loading.set(false);
        this.chartReadyTimer = setTimeout(() => {
          this.chartReadyTimer = null;
          this.chartReady.set(true);
        }, 50);
      },
      error: () => this.loading.set(false),
    });
  }

  setScope(s: 'month' | 'all') {
    this.scope.set(s); // The reactive render effect redraws once.
  }

  setFilter(f: 'all' | 'income' | 'expense') {
    this.filter.set(f); // No duplicate animation scheduling.
  }

  renderChart() {
    const canvasRef = this.chartCanvas();
    if (!canvasRef) return;
    this.cancelAnimation();

    const canvas = canvasRef.nativeElement;
    const ctx    = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const TAU = Math.PI * 2, START = -Math.PI / 2;

    const income  = this.totalIncome();
    const expense = this.totalExpenses();
    const expFrac = income > 0 ? Math.min(expense / income, 1) : 0;
    const showIncome  = this.filter() !== 'expense';
    const showExpense = this.filter() !== 'income';

    const startTime = performance.now();
    const easeOut   = (t: number) => 1 - Math.pow(1 - t, 3);

    const drawRing = (r: number, lw: number, frac: number, col: string, track: string) => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU);
      ctx.strokeStyle = track; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
      if (frac <= 0) return;
      ctx.beginPath(); ctx.arc(cx, cy, r, START, START + TAU * frac);
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
    };

    const tick = (now: number) => {
      const p = easeOut(Math.min((now - startTime) / 900, 1));
      ctx.clearRect(0, 0, W, H);
      if (showIncome)  drawRing(W * .44, W * .12, p,           this.C_INC, this.C_INC_TRACK);
      if (showExpense) drawRing(W * .30, W * .12, expFrac * p, this.C_EXP, this.C_EXP_TRACK);
      if (p < 1) this.animationId = requestAnimationFrame(tick);
      else this.animationId = null;
    };
    // A 60fps canvas animation must not trigger an Angular-wide change-detection
    // pass on every frame while the user navigates to another menu screen.
    this.zone.runOutsideAngular(() => {
      this.animationId = requestAnimationFrame(tick);
    });
  }

  private cancelAnimation() {
    if (this.animationId !== null) { cancelAnimationFrame(this.animationId); this.animationId = null; }
  }

  private formatMonth(key: string) {
    const [y, m] = key.split('-');
    return new Date(+y, +m - 1).toLocaleString('es', { month: 'short', year: '2-digit' });
  }
}