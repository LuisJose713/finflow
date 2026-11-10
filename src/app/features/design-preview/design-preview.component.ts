import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, throwError } from 'rxjs';

import { DashboardComponent } from '../dashboard/dashboard.component';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountService } from '../../core/services/account.service';
import { ExportPdfService } from '../../core/services/export-pdf.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardRefreshService } from '../../core/services/dashboard-refresh.service';

type PreviewSection =
  | 'dashboard' | 'transactions' | 'accounts' | 'goals' | 'budgets'
  | 'planned-expenses' | 'recurring' | 'categories' | 'advisor' | 'security' | 'admin';
type TransactionKind = 'income' | 'expense';

type PreviewNavItem = { id: PreviewSection; name: string; icon: string; subtitle: string };
type PreviewTransaction = {
  id: string; description: string; category: string; date: string; type: TransactionKind;
  amount: number; icon: string; account: string;
};

/**
 * V4 showroom ONLY. It never fetches actual account data.
 * No live mutations, analytics, or user session are needed to review these screens.
 * All numbers and records below are fictional placeholders for visual evaluation.
 */
const SAMPLE_TRANSACTIONS: PreviewTransaction[] = [
  { id: 'tx1', description: 'Nómina mensual', category: 'Ingresos', date: '10 nov 2026', type: 'income', amount: 2600000, icon: '↓', account: 'Cuenta principal' },
  { id: 'tx2', description: 'Supermercado', category: 'Alimentación', date: '09 nov 2026', type: 'expense', amount: 142000, icon: '↑', account: 'Cuenta principal' },
  { id: 'tx3', description: 'Trabajo independiente', category: 'Ingresos', date: '08 nov 2026', type: 'income', amount: 245000, icon: '↓', account: 'Cuenta principal' },
  { id: 'tx4', description: 'Servicios del hogar', category: 'Hogar', date: '06 nov 2026', type: 'expense', amount: 210000, icon: '↑', account: 'Cuenta principal' },
  { id: 'tx5', description: 'Transporte', category: 'Transporte', date: '05 nov 2026', type: 'expense', amount: 85000, icon: '↑', account: 'Efectivo' },
  { id: 'tx6', description: 'Suscripción digital', category: 'Suscripciones', date: '02 nov 2026', type: 'expense', amount: 32000, icon: '↑', account: 'Cuenta principal' },
  { id: 'tx7', description: 'Ahorro programado', category: 'Ahorro', date: '01 nov 2026', type: 'expense', amount: 300000, icon: '↑', account: 'Cuenta principal' },
];

const SAMPLE_ACCOUNTS = [
  { name: 'Cuenta principal', type: 'Cuenta de ahorro', balance: 3450000, last: '•• 4012', symbol: '▣' },
  { name: 'Efectivo', type: 'Dinero disponible', balance: 420000, last: 'COP', symbol: '◫' },
  { name: 'Ahorro personal', type: 'Cuenta de ahorro', balance: 1820000, last: '•• 1180', symbol: '◇' },
];

const SAMPLE_GOALS = [
  { title: 'Fondo de emergencia', detail: 'Protección financiera', saved: 1750000, target: 5000000, icon: '✦', finish: 'Jun 2027' },
  { title: 'Vacaciones', detail: 'Tu próximo destino', saved: 920000, target: 2500000, icon: '◈', finish: 'Abr 2027' },
  { title: 'Equipo de trabajo', detail: 'Inversión personal', saved: 2350000, target: 3500000, icon: '▣', finish: 'Feb 2027' },
];

const SAMPLE_BUDGETS = [
  { name: 'Alimentación', spent: 380000, limit: 650000, icon: '◫' },
  { name: 'Transporte', spent: 165000, limit: 250000, icon: '⇄' },
  { name: 'Entretenimiento', spent: 170000, limit: 200000, icon: '◈' },
  { name: 'Hogar', spent: 610000, limit: 750000, icon: '▣' },
];

const SAMPLE_PLANNED = [
  { title: 'Internet del hogar', category: 'Servicios', amount: 87000, date: '14 nov 2026', status: 'Pendiente' },
  { title: 'Seguro mensual', category: 'Protección', amount: 135000, date: '19 nov 2026', status: 'Pendiente' },
  { title: 'Universidad', category: 'Educación', amount: 420000, date: '25 nov 2026', status: 'Programado' },
];

const SAMPLE_RECURRING = [
  { title: 'Servicio de música', every: 'Mensual · día 5', amount: 24000, state: 'Activa' },
  { title: 'Internet', every: 'Mensual · día 14', amount: 87000, state: 'Activa' },
  { title: 'Ahorro automático', every: 'Mensual · día 1', amount: 300000, state: 'Activa' },
];

const SAMPLE_CATEGORIES = [
  { name: 'Alimentación', kind: 'Gasto', icon: '◫', color: 'coral' },
  { name: 'Transporte', kind: 'Gasto', icon: '⇄', color: 'blue' },
  { name: 'Hogar', kind: 'Gasto', icon: '⌂', color: 'gold' },
  { name: 'Ingresos', kind: 'Ingreso', icon: '↓', color: 'green' },
  { name: 'Educación', kind: 'Gasto', icon: '◇', color: 'violet' },
  { name: 'Ahorro', kind: 'Ahorro', icon: '✦', color: 'green' },
];

/**
 * Existing production Dashboard reused unchanged in layout and business code,
 * but all injected API services are replaced here with memory-only fixtures.
 */
class SyntheticTransactionService {
  private entries = [
    { id: 'demo-1', type: 'expense', amount: 142000, description: 'Supermercado', date: '2026-11-09', categoryId: 10 },
    { id: 'demo-2', type: 'income', amount: 2600000, description: 'Nómina mensual', date: '2026-11-07', categoryId: 11 },
    { id: 'demo-3', type: 'expense', amount: 85000, description: 'Transporte', date: '2026-11-05', categoryId: 10 },
    { id: 'demo-4', type: 'expense', amount: 210000, description: 'Servicios del hogar', date: '2026-11-03', categoryId: 10 },
    { id: 'demo-5', type: 'income', amount: 245000, description: 'Trabajo independiente', date: '2026-11-01', categoryId: 11 },
  ];
  getStats() {
    return of({ totalIncome: 7800000, totalExpenses: 3610000, balance: 4190000, savingsRate: 53.7 });
  }
  getMonthlyStats() {
    const now = new Date();
    const income = [2140000, 2560000, 2300000, 2900000, 2700000, 3060000];
    const expenses = [1280000, 1680000, 1500000, 1810000, 1540000, 1960000];
    return of(income.map((amount, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        income: amount, expenses: expenses[i],
      };
    }));
  }
  getRecent() { return of([...this.entries]); }
  getAll() { return of([...this.entries]); }
  getAvailableYears() { return of([2026]); }
  create(data: any) {
    const item = { ...data, id: `demo-${this.entries.length + 1}`, date: data.date || '2026-11-10' };
    this.entries.unshift(item);
    return of(item);
  }
  delete(id: string) { this.entries = this.entries.filter(e => e.id !== id); return of(void 0); }
  exportPdf() { return throwError(() => new Error('Exportación deshabilitada en la demostración')); }
  exportCsv() { return throwError(() => new Error('Exportación deshabilitada en la demostración')); }
}

const syntheticUser = {
  id: 777, email: 'diseno@finflow.invalid', name: 'Usuario de demostración', role: 'USER',
};

@Component({
  selector: 'app-design-preview',
  standalone: true,
  imports: [RouterLink, FormsModule, DashboardComponent],
  providers: [
    DashboardRefreshService,
    { provide: TransactionService, useClass: SyntheticTransactionService },
    { provide: CategoryService, useValue: { getAll: () => of([
      { id: 10, name: 'Gastos de prueba', type: 'Expense' },
      { id: 11, name: 'Ingresos de prueba', type: 'Income' },
    ]) } },
    { provide: AccountService, useValue: { list: () => of([
      { id: 20, name: 'Cuenta ficticia', currency: 'COP', archived: false, balance: 500000, type: 'cash' },
    ]) } },
    { provide: ExportPdfService, useValue: {
      exportTransactions: () => throwError(() => new Error('No se exportan datos reales en esta demo')),
    } },
    { provide: AuthService, useValue: {
      currentUser: signal(syntheticUser).asReadonly(),
      isAuthenticated: () => true,
      logout: () => { /* preview does not have an authenticated session */ },
    } },
  ],
  templateUrl: './design-preview.component.html',
  styleUrl: './design-preview.component.scss',
})
export class DesignPreviewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly sections: PreviewNavItem[] = [
    { id: 'dashboard', name: 'Dashboard', subtitle: 'Visión general', icon: 'M3 4h8v8H3z M13 4h8v5h-8z M13 11h8v9h-8z M3 14h8v6H3z' },
    { id: 'transactions', name: 'Transacciones', subtitle: 'Movimientos', icon: 'M4 7h16 M4 7l4-4 M4 7l4 4 M20 17H4 M20 17l-4-4 M20 17l-4 4' },
    { id: 'accounts', name: 'Cuentas', subtitle: 'Saldos y billeteras', icon: 'M3 6h18v13H3z M3 10h18 M16 15h2' },
    { id: 'goals', name: 'Metas', subtitle: 'Objetivos de ahorro', icon: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10z M12 12h.01' },
    { id: 'budgets', name: 'Presupuestos', subtitle: 'Control por categoría', icon: 'M4 5h16v14H4z M8 16V9 M12 16v-5 M16 16V7' },
    { id: 'planned-expenses', name: 'Gastos previstos', subtitle: 'Próximos pagos', icon: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M8 17h5' },
    { id: 'recurring', name: 'Recurrentes', subtitle: 'Movimientos periódicos', icon: 'M20 7a8 8 0 0 0-14-2L4 8 M4 4v4h4 M4 17a8 8 0 0 0 14 2l2-3 M20 20v-4h-4' },
    { id: 'categories', name: 'Categorías', subtitle: 'Organización', icon: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z' },
    { id: 'advisor', name: 'Asesor IA', subtitle: 'Ideas financieras', icon: 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z' },
    { id: 'security', name: 'Seguridad', subtitle: 'Privacidad y acceso', icon: 'M12 2l8 4v6c0 5-3.5 8.5-8 10c-4.5-1.5-8-5-8-10V6z M9 12l2 2 4-4' },
    { id: 'admin', name: 'Administración', subtitle: 'Vista del equipo', icon: 'M3 5h18v14H3z M3 10h18 M8 14h3 M14 14h4 M8 17h3' },
  ];
  readonly selected = signal<PreviewSection>('dashboard');
  readonly dark = signal(false);
  readonly menuOpen = signal(false);
  readonly search = signal('');
  readonly transactionFilter = signal<'all' | TransactionKind>('all');
  readonly budgetPeriod = signal<'month' | 'year'>('month');
  readonly goalMode = signal<'all' | 'ongoing'>('all');
  readonly advisorInput = signal('');
  readonly advisorReplies = signal<{ role: 'user' | 'assistant'; text: string }[]>([]);
  readonly accordion = signal<string | null>('first');

  readonly transactions = SAMPLE_TRANSACTIONS;
  readonly accounts = SAMPLE_ACCOUNTS;
  readonly goals = SAMPLE_GOALS;
  readonly budgets = SAMPLE_BUDGETS;
  readonly planned = SAMPLE_PLANNED;
  readonly recurring = SAMPLE_RECURRING;
  readonly categories = SAMPLE_CATEGORIES;

  readonly visibleTransactions = computed(() => {
    const needle = this.search().trim().toLocaleLowerCase('es-CO');
    return this.transactions.filter(tx =>
      (this.transactionFilter() === 'all' || tx.type === this.transactionFilter()) &&
      (!needle || [tx.description, tx.category, tx.account].some(text => text.toLocaleLowerCase('es-CO').includes(needle)))
    );
  });

  readonly activeSection = computed(() => this.sections.find(s => s.id === this.selected())!);
  readonly expensesSum = computed(() => this.transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0));
  readonly incomesSum = computed(() => this.transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const id = params.get('section');
      const current = this.sections.find(item => item.id === id)?.id || 'dashboard';
      this.selected.set(current);
      this.menuOpen.set(false);
    });
  }

  money(amount: number): string { return '$ ' + new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(amount); }
  pct(part: number, whole: number): number { return whole > 0 ? Math.max(0, Math.min(100, Math.round((part / whole) * 100))) : 0; }
  toggleTheme(): void { this.dark.update(value => !value); }
  toggleMobileMenu(): void { this.menuOpen.update(value => !value); }
  closeMenu(): void { this.menuOpen.set(false); }
  setTransactionFilter(value: 'all' | TransactionKind): void { this.transactionFilter.set(value); }
  setSearch(value: string): void { this.search.set(value); }
  setBudgetPeriod(value: 'month' | 'year'): void { this.budgetPeriod.set(value); }
  sendDemoMessage(): void {
    const question = this.advisorInput().trim();
    if (!question) return;
    this.advisorReplies.update(rows => [
      ...rows,
      { role: 'user', text: question },
      { role: 'assistant', text: 'Vista de demostración: aquí FinFlow AI explicaría tus movimientos y propondría acciones. Esta respuesta es ilustrativa y no consulta información real.' },
    ]);
    this.advisorInput.set('');
  }
}
