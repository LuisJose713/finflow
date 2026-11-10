import { Component, signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { AccountService } from '../../core/services/account.service';
import { ExportPdfService } from '../../core/services/export-pdf.service';
import { AuthService } from '../../core/services/auth.service';
import { DashboardRefreshService } from '../../core/services/dashboard-refresh.service';

/**
 * Isolated, public design showroom for the FinFlow V4 PREVIEW branch.
 *
 * All financial values are synthetic and remain in browser memory.
 * Providers shadow the live API services so this route never performs a
 * transaction, account, category or export request against production.
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
        income: amount,
        expenses: expenses[i],
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
  id: 777, email: 'diseno@finflow.invalid', name: 'Usuario de demostración', role: 'USER'
};

@Component({
  selector: 'app-design-preview',
  standalone: true,
  imports: [DashboardComponent],
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
      logout: () => { /* no authentication session exists in the demo */ },
    } },
  ],
  template: `
    <div class="preview-banner" role="status">
      <span class="preview-pill">DESIGN PREVIEW · V4</span>
      <span>Datos 100% simulados. Este prototipo no modifica la base de datos ni tu cuenta real.</span>
    </div>
    <app-dashboard />
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .preview-banner {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem .9rem;
      padding: .7rem 1rem; background: #09162a; color: #e9eef8; border-bottom: 1px solid #d7a94d;
      text-align: center; font-size: .78rem; line-height: 1.45;
    }
    .preview-pill {
      padding: .3rem .65rem; border: 1px solid rgba(215,169,77,.5); border-radius: 99px;
      color: #f5d68c; font-size: .63rem; font-weight: 800; letter-spacing: .1em;
    }
    @media(max-width:600px){ .preview-banner { padding-inline: .7rem; font-size: .69rem; } }
  `],
})
export class DesignPreviewComponent {}
