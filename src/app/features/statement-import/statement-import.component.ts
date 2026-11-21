import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AccountService, FinancialAccount } from '@core/services/account.service';
import { CategoryService } from '@core/services/category.service';
import { DashboardRefreshService } from '@core/services/dashboard-refresh.service';
import {
  StatementImportService, StatementDraft, ImportPreview, ImportResult,
  ImportedType, ImportApproved
} from '@core/services/statement-import.service';
import { ToastService } from '@core/services/toast.service';
import { Category } from '@core/models';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { ToastContainerComponent } from '@shared/components/toast-container/toast-container.component';

interface EditableDraft extends StatementDraft { include: boolean; }

@Component({
  selector: 'app-statement-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, ToastContainerComponent],
  templateUrl: './statement-import.component.html',
  styleUrls: ['./statement-import.component.scss']
})
export class StatementImportComponent {
  private readonly importer = inject(StatementImportService);
  private readonly accountService = inject(AccountService);
  private readonly categoryService = inject(CategoryService);
  private readonly refresh = inject(DashboardRefreshService);
  private readonly toast = inject(ToastService);

  readonly accounts = signal<FinancialAccount[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly accountId = signal<number | null>(null);
  readonly preview = signal<ImportPreview | null>(null);
  readonly rows = signal<EditableDraft[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly result = signal<ImportResult | null>(null);
  readonly eligibleCount = computed(() => this.rows().filter(r => r.include && this.valid(r)).length);
  readonly currency = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' });
  file: File | null = null;

  constructor() {
    this.accountService.list().subscribe({
      next: items => {
        this.accounts.set(items.filter(item => !item.archived && item.currency === 'COP'));
      },
      error: () => this.toast.error('No se pudieron cargar tus billeteras')
    });
    this.categoryService.getAll().subscribe({
      next: items => this.categories.set(items),
      error: () => this.toast.error('No se pudieron cargar las categorías')
    });
  }

  onFile(event: Event): void {
    this.file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.clearPreview();
  }

  onAccount(value: number | string | null): void {
    this.accountId.set(value ? Number(value) : null);
    this.clearPreview();
  }

  private clearPreview(): void {
    this.preview.set(null);
    this.rows.set([]);
    this.result.set(null);
  }

  analyze(): void {
    const accountId = this.accountId();
    if (!accountId || !this.file) {
      this.toast.warning('Selecciona una billetera y un extracto primero');
      return;
    }
    const extension = this.file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'pdf'].includes(extension ?? '') || this.file.size > 3 * 1024 * 1024) {
      this.toast.warning('Elige CSV, Excel (.xlsx) o PDF de máximo 3 MB');
      return;
    }
    this.loading.set(true);
    this.clearPreview();
    this.importer.preview(this.file, accountId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: response => {
          this.preview.set(response);
          this.rows.set(response.rows.map(row => ({
            ...row,
            include: row.status === 'ready'
          })));
          if (response.rows.some(r => r.status === 'review' || r.status === 'transfer'))
            this.toast.warning('Algunos movimientos necesitan tu revisión');
        },
        error: err => this.toast.error(this.errorMessage(err, 'No pudimos analizar el extracto'))
      });
  }

  updateRow(index: number, update: Partial<EditableDraft>): void {
    this.rows.update(rows => rows.map(row =>
      row.rowNumber === index ? { ...row, ...update } : row
    ));
  }

  valid(row: EditableDraft): boolean {
    return row.status !== 'duplicate' && row.currency === 'COP' &&
      (row.type === 'income' || row.type === 'expense') &&
      Number.isFinite(row.amount) && row.amount > 0 &&
      !!row.date && !!row.description?.trim();
  }

  categoriesFor(type: ImportedType): Category[] {
    const expected = type === 'income' ? 'income' : 'expense';
    return this.categories().filter(category => category.type.toLowerCase() === expected);
  }

  statusLabel(row: StatementDraft): string {
    switch (row.status) {
      case 'duplicate': return 'Posible duplicado';
      case 'transfer': return 'Revisar transferencia';
      case 'review': return 'Revisión necesaria';
      default: return 'Listo';
    }
  }

  save(): void {
    const account = this.accountId();
    const chosen = this.rows().filter(r => r.include);
    if (!account || !chosen.length || chosen.some(r => !this.valid(r))) {
      this.toast.warning('Revisa monto, fecha, tipo y moneda antes de guardar');
      return;
    }
    if (!window.confirm(
      '¿Confirmas importar ' + chosen.length + ' movimientos a la billetera seleccionada? ' +
      'Esta acción cambiará tu balance.'
    )) return;

    const approved: ImportApproved[] = this.rows().map(row => ({
      rowNumber: row.rowNumber,
      date: row.date,
      description: row.description.trim(),
      amount: Number(row.amount),
      type: row.type,
      categoryId: row.categoryId,
      accountId: account,
      currency: row.currency,
      include: row.include
    }));
    this.saving.set(true);
    this.importer.confirm(approved)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: result => {
          this.result.set(result);
          this.preview.set(null);
          this.rows.set([]);
          this.file = null;
          this.refresh.trigger();
          this.toast.success(result.created + ' movimientos importados');
        },
        error: err => this.toast.error(this.errorMessage(err, 'No se importó ningún movimiento'))
      });
  }

  private errorMessage(error: any, fallback: string): string {
    const text = error?.error?.detail ?? error?.error?.message;
    return typeof text === 'string' && text.length < 180 ? text : fallback;
  }
}
