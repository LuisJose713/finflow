import { CurrencyInputDirective } from '../../directives/currency-input.directive';
import { Component, inject, signal, output, OnInit, Input, HostListener, DestroyRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TransactionService } from '../../../core/services/transaction.service';
import { CategoryService } from '../../../core/services/category.service';
import { AccountService, FinancialAccount } from '../../../core/services/account.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { CreateTransactionRequest, TransactionType, Category, Transaction } from '../../../core/models';

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [CurrencyInputDirective, ReactiveFormsModule, CommonModule],
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.scss'],
})
export class AddTransactionComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private txService      = inject(TransactionService);
  private categoryService= inject(CategoryService);
  private accountService = inject(AccountService);
  private toast          = inject(ToastService);
  private refresh        = inject(DashboardRefreshService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() floating = false;
  @Input() showTrigger = true;
  readonly editing = signal<Transaction | null>(null);

  isOpen         = signal(false);
  loading        = signal(false);
  allCategories  = signal<Category[]>([]);
  accounts = signal<FinancialAccount[]>([]);
  filteredCategories = signal<Category[]>([]);

  created = output<void>();

  form = this.fb.group({
    amount:      [null as number | null, [Validators.required, Validators.min(0.01)]],
    type:        ['expense' as TransactionType, Validators.required],
    categoryId:  [null as number | null, Validators.required],
    accountId:   [null as number | null],
    description: ['', [Validators.required, Validators.minLength(2)]],
    date:        [this.today(), Validators.required],
    currency:    ['COP'],
    status:      ['completed'],
  });

  get f() { return this.form.controls; }
  private today(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  ngOnInit() {
    // The floating control lives in the navbar on every authenticated page.
    // Fetch reference data only when opened, never on every menu navigation.
    this.form.get('type')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.filterCategories(type!);
        this.form.patchValue({ categoryId: null });
      });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen() && !this.loading()) this.close();
  }

  filterCategories(type: string) {
    const mapped = type === 'income' ? 'Income' : 'Expense';
    this.filteredCategories.set(this.allCategories().filter(c => c.type === mapped));
  }


  open(transaction?: Transaction) {
    if (this.loading()) return;
    this.editing.set(transaction ?? null);
    this.form.reset({
      amount: transaction?.amount ?? null,
      description: transaction?.description ?? '',
      type: transaction?.type ?? 'expense', categoryId: transaction?.categoryId ?? null,
      accountId: transaction?.accountId ?? null, date: transaction?.date?.split('T')[0] ?? this.today(),
      currency: transaction?.currency ?? 'COP', status: transaction?.status ?? 'completed',
    }, { emitEvent: false });
    this.isOpen.set(true);
    this.categoryService.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: cats => {
          this.allCategories.set(cats);
          this.filterCategories(this.form.value.type || 'expense');
        },
        error: () => this.toast.error('No pudimos cargar las categorías'),
      });
    this.accountService.list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: accounts => this.accounts.set(accounts.filter(a => (!a.archived || a.id === transaction?.accountId) && a.currency === 'COP')),
        error: () => this.toast.error('No pudimos cargar las cuentas'),
      });
  }

  close() {
    if (this.loading()) return;
    this.isOpen.set(false);
    this.editing.set(null);
    this.form.reset({
      type: 'expense', categoryId: null, accountId: null,
      date: this.today(),
      currency: 'COP', status: 'completed',
    });
  }

  onSubmit() {
    if (this.loading()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    const data = this.form.getRawValue() as CreateTransactionRequest;

    const editing = this.editing();
    const request = editing ? this.txService.update(editing.id, data) : this.txService.create(data);
    request.subscribe({
      next: () => {
        this.toast.success(editing ? 'Movimiento actualizado' : 'Transacción agregada');
        this.refresh.trigger(); // 👈 dispara el signal — todos los componentes reaccionan
        this.created.emit();
        this.loading.set(false);
        this.close();
      },
      error: () => { this.toast.error('No pudimos confirmar el cambio. Revisa el historial antes de volver a guardar.'); this.loading.set(false); },
    });
  }
}
