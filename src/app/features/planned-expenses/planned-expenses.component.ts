import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PlannedExpenseService } from '@core/services/planned-expense.service';
import { CategoryService } from '@core/services/category.service';
import { ToastService } from '@core/services/toast.service';
import { DashboardRefreshService } from '@core/services/dashboard-refresh.service';
import { PlannedExpense, Category } from '@core/models/index';
import { NavbarComponent } from '@shared/components/navbar/navbar.component';
import { ToastContainerComponent } from '@shared/components/toast-container/toast-container.component';
import { AppCurrencyPipe } from '@shared/pipes/currency.pipe';

@Component({
    selector: 'app-planned-expenses',
    imports: [
        CommonModule, FormsModule, ReactiveFormsModule,
        ToastContainerComponent,
        NavbarComponent,
        AppCurrencyPipe
    ],
    templateUrl: './planned-expenses.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./planned-expenses.component.scss']
})
export class PlannedExpensesComponent {
  private peService      = inject(PlannedExpenseService);
  private categoryService= inject(CategoryService);
  private toast          = inject(ToastService);
  private refresh        = inject(DashboardRefreshService);
  private fb             = inject(FormBuilder);

  expenses   = signal<PlannedExpense[]>([]);
  categories = signal<Category[]>([]);
  loading    = signal(true);

  // Modal
  showModal   = signal(false);
  editingId   = signal<string | null>(null);
  modalLoading= signal(false);

  // Display signal para monto
  amountDisplay = signal('');

  // Filtro activo
  filterStatus = signal<'all' | 'pending' | 'done' | 'cancelled'>('all');

  // Computed: gastos filtrados
  filtered = computed(() => {
    const f = this.filterStatus();
    if (f === 'all') return this.expenses();
    return this.expenses().filter(e => e.status === f);
  });

  // Computed: totales
  totalPending  = computed(() => this.expenses().filter(e => e.status === 'pending').reduce((a, e) => a + e.amount, 0));
  totalDone     = computed(() => this.expenses().filter(e => e.status === 'done').reduce((a, e) => a + e.amount, 0));
  overdue       = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.expenses().filter(e => e.status === 'pending' && e.dueDate && e.dueDate < today);
  });

  form = this.fb.group({
    title:      ['', [Validators.required, Validators.minLength(2)]],
    amount:     [null as number | null, [Validators.required, Validators.min(1)]],
    categoryId: [null as number | null],
    dueDate:    [''],
    remindAt:   [''],
    notes:      [''],
  });

  get f() { return this.form.controls; }

  constructor() {
    this.peService.getAll().subscribe({
      next:  data => { this.expenses.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false),
    });

    this.categoryService.getAll().subscribe({
      next: cats => this.categories.set(cats.filter(c => c.type === 'Expense')),
    });
  }

  // ── Modal ────────────────────────────────────────────────
  openCreate() {
    this.editingId.set(null);
    this.amountDisplay.set('');
    this.form.reset();
    this.showModal.set(true);
  }

  openEdit(e: PlannedExpense) {
    this.editingId.set(e.id);
    this.amountDisplay.set(e.amount.toLocaleString('es-CO', { maximumFractionDigits: 0 }));
    this.form.patchValue({
      title:      e.title,
      amount:     e.amount,
      categoryId: e.categoryId ?? null,
      dueDate:    e.dueDate?.split('T')[0] ?? '',
      remindAt:   e.remindAt?.split('T')[0] ?? '',
      notes:      e.notes ?? '',
    });
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
    this.amountDisplay.set('');
    this.form.reset();
  }

  onAmountInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const raw   = input.value.replace(/\D/g, '');
    if (!raw) {
      this.form.get('amount')?.setValue(null, { emitEvent: false });
      this.amountDisplay.set('');
      input.value = '';
      return;
    }
    const numeric   = parseInt(raw, 10);
    const formatted = numeric.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    input.value = formatted;
    this.amountDisplay.set(formatted);
    this.form.get('amount')?.setValue(numeric, { emitEvent: false });
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.modalLoading.set(true);
    const raw = this.form.getRawValue();

    const data = {
      title:      raw.title!,
      amount:     raw.amount!,
      categoryId: raw.categoryId ?? undefined,
      dueDate:    raw.dueDate   || undefined,
      remindAt:   raw.remindAt  || undefined,
      notes:      raw.notes     || undefined,
    };

    const id = this.editingId();
    const req$ = id
      ? this.peService.update(id, data)
      : this.peService.create(data);

    req$.subscribe({
      next: (saved) => {
        if (id) {
          this.expenses.update(list => list.map(e => e.id === id ? saved : e));
          this.toast.success('Gasto actualizado');
        } else {
          this.expenses.update(list => [...list, saved]);
          this.toast.success('Gasto planeado creado');
        }
        this.closeModal();
        this.modalLoading.set(false);
      },
      error: () => { this.toast.error('Error al guardar'); this.modalLoading.set(false); },
    });
  }

  // ── Ejecutar ──────────────────────────────────────────────
  execute(e: PlannedExpense) {
    if (!confirm(`¿Confirmas el gasto "${e.title}" por ${e.amount.toLocaleString('es-CO')}?`)) return;
    this.peService.execute(e.id).subscribe({
      next: (updated) => {
        this.expenses.update(list => list.map(x => x.id === e.id ? updated : x));
        this.toast.success('¡Gasto ejecutado! La transacción fue registrada.');
        this.refresh.trigger(); // actualiza el dashboard
      },
      error: () => this.toast.error('Error al ejecutar'),
    });
  }

  // ── Cancelar ──────────────────────────────────────────────
  cancelExpense(e: PlannedExpense) {
    if (!confirm(`¿Cancelar "${e.title}"?`)) return;
    this.peService.cancel(e.id).subscribe({
      next: (updated) => {
        this.expenses.update(list => list.map(x => x.id === e.id ? updated : x));
        this.toast.success('Gasto cancelado');
      },
      error: () => this.toast.error('Error al cancelar'),
    });
  }

  // ── Eliminar ──────────────────────────────────────────────
  delete(e: PlannedExpense) {
    if (!confirm(`¿Eliminar "${e.title}"?`)) return;
    this.peService.delete(e.id).subscribe({
      next: () => {
        this.expenses.update(list => list.filter(x => x.id !== e.id));
        this.toast.success('Eliminado');
      },
      error: () => this.toast.error('Error al eliminar'),
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  categoryName(id?: number) {
    return this.categories().find(c => c.id === id)?.name ?? '—';
  }

  isOverdue(e: PlannedExpense): boolean {
    if (!e.dueDate || e.status !== 'pending') return false;
    return e.dueDate < new Date().toISOString().split('T')[0];
  }

  statusLabel(s: string) {
    return { pending: 'Pendiente', done: 'Ejecutado', cancelled: 'Cancelado' }[s] ?? s;
  }

  todayString() { return new Date().toISOString().split('T')[0]; }

  trackById(_: number, e: PlannedExpense) { return e.id; }
}