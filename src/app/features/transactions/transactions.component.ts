import { DismissibleCardDirective } from '../../shared/directives/dismissible-card.directive';
import { Component, inject, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '@core/services/transaction.service';
import { CategoryService } from '@core/services/category.service';
import { ToastService } from '@core/services/toast.service';
import { DashboardRefreshService } from '@core/services/dashboard-refresh.service';
import { Transaction, Category } from '../../core/models/index';
import { AppCurrencyPipe } from '@shared/pipes/currency.pipe';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { ToastContainerComponent } from '@shared/components/toast-container/toast-container.component';
import { AddTransactionComponent } from '@shared/components/add-transaction/add-transaction.component';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [DismissibleCardDirective, 
    CommonModule, DatePipe, FormsModule,
    AppCurrencyPipe, NavbarComponent, ToastContainerComponent
],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss'],
})
export class TransactionsComponent implements OnInit {
  private txService       = inject(TransactionService);
  private categoryService = inject(CategoryService);
  private toast           = inject(ToastService);
  private refresh         = inject(DashboardRefreshService);

  // Datos crudos del backend (sin filtro de descripción)
  allTransactions = signal<Transaction[]>([]);
  categories      = signal<Category[]>([]);
  years           = signal<number[]>([]);
  loading         = signal(true);

  // Filtros que van al backend
  filterType       = signal<string>('');
  filterMonth      = signal<number | null>(null);
  filterYear       = signal<number | null>(null);
  filterCategoryId = signal<number | null>(null);

  // Filtro local — instantáneo, no llama al backend
  filterSearch = signal<string>('');

  // Lista final = filtro backend + filtro local de descripción
  transactions = computed(() => {
    const search = this.filterSearch().toLowerCase().trim();
    if (!search) return this.allTransactions();
    return this.allTransactions().filter(t =>
      t.description?.toLowerCase().includes(search)
    );
  });

  readonly months = [
    { value: 1,  label: 'Enero' },    { value: 2,  label: 'Febrero' },
    { value: 3,  label: 'Marzo' },    { value: 4,  label: 'Abril' },
    { value: 5,  label: 'Mayo' },     { value: 6,  label: 'Junio' },
    { value: 7,  label: 'Julio' },    { value: 8,  label: 'Agosto' },
    { value: 9,  label: 'Septiembre'},{ value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },{ value: 12, label: 'Diciembre' },
  ];

  readonly Math = Math;

  constructor() {
    // The shared floating composer can create a transaction from this page.
    // Keep the history synchronized without requiring a manual reload.
    effect(() => {
      this.refresh.version();
      this.load();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.loadCategories();
    this.loadYears();
  }

  loadCategories() {
    this.categoryService.getAll().subscribe({
      next: (data) => this.categories.set(data),
    });
  }

  loadYears() {
    this.txService.getAvailableYears().subscribe({
      next: (data) => this.years.set(data),
    });
  }

  // Solo llama al backend con filtros de tipo/mes/año/categoría
  load() {
    this.loading.set(true);
    this.txService.getAll(
      this.filterType()       || undefined,
      this.filterMonth()      ?? undefined,
      this.filterYear()       ?? undefined,
      this.filterCategoryId() ?? undefined,
    ).subscribe({
      next:  (data) => { this.allTransactions.set(data); this.loading.set(false); },
      error: ()     => this.loading.set(false),
    });
  }

  clearFilters() {
    this.filterType.set('');
    this.filterMonth.set(null);
    this.filterYear.set(null);
    this.filterCategoryId.set(null);
    this.filterSearch.set('');
    this.load();
  }

  get hasFilters(): boolean {
    return !!(this.filterType() || this.filterMonth() || this.filterYear() ||
              this.filterCategoryId() || this.filterSearch());
  }

  delete(tx: Transaction) {
    if (!confirm(`¿Eliminar "${tx.description}"?`)) return;
    this.txService.delete(tx.id).subscribe({
      next: () => {
        this.allTransactions.update(list => list.filter(t => t.id !== tx.id));
        this.toast.success('Transacción eliminada');
      },
      error: () => this.toast.error('No se pudo eliminar'),
    });
  }

  exportXlsx() {
    this.txService.exportXlsx(
      this.filterType()       || undefined,
      this.filterMonth()      ?? undefined,
      this.filterYear()       ?? undefined,
      this.filterCategoryId() ?? undefined,
      this.filterSearch()     || undefined,
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'FinFlow_Movimientos.xlsx';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => this.toast.error('No se pudo generar el Excel'),
    });
  }

  exportPdf() {
  this.txService.exportPdf(
    this.filterType()       || undefined,
    this.filterMonth()      ?? undefined,
    this.filterYear()       ?? undefined,
    this.filterCategoryId() ?? undefined,
    this.filterSearch()     || undefined,
  ).subscribe({
    next: (blob) => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = 'transacciones.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    error: () => this.toast.error('Error al exportar PDF'),
  });
}

  categoryName(id: number): string {
    return this.categories().find(c => c.id === id)?.name ?? `#${id}`;
  }

  trackById(_: number, tx: Transaction) { return tx.id; }
}
