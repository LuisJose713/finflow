import { Component, inject, signal, output, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TransactionService } from '../../../core/services/transaction.service';
import { CategoryService } from '../../../core/services/category.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { CreateTransactionRequest, TransactionType, Category } from '../../../core/models';

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './add-transaction.component.html',
  styleUrls: ['./add-transaction.component.scss'],
})
export class AddTransactionComponent implements OnInit {
  private fb             = inject(FormBuilder);
  private txService      = inject(TransactionService);
  private categoryService= inject(CategoryService);
  private toast          = inject(ToastService);
  private refresh        = inject(DashboardRefreshService);

  isOpen         = signal(false);
  loading        = signal(false);
  allCategories  = signal<Category[]>([]);
  filteredCategories = signal<Category[]>([]);
  amountDisplay  = signal('');

  created = output<void>();

  form = this.fb.group({
    amount:      [null as number | null, [Validators.required, Validators.min(0.01)]],
    type:        ['expense' as TransactionType, Validators.required],
    categoryId:  [null as number | null, Validators.required],
    description: ['', [Validators.required, Validators.minLength(2)]],
    date:        [new Date().toISOString().split('T')[0], Validators.required],
    currency:    ['COP'],
    status:      ['completed'],
  });

  get f() { return this.form.controls; }

  ngOnInit() {
    this.categoryService.getAll().subscribe({
      next: cats => {
        this.allCategories.set(cats);
        this.filterCategories('expense');
      }
    });
    this.form.get('type')!.valueChanges.subscribe(type => {
      this.filterCategories(type!);
      this.form.patchValue({ categoryId: null });
    });
  }

  filterCategories(type: string) {
    const mapped = type === 'income' ? 'Income' : 'Expense';
    this.filteredCategories.set(this.allCategories().filter(c => c.type === mapped));
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

  open()  { this.amountDisplay.set(''); this.isOpen.set(true); }

  close() {
    this.isOpen.set(false);
    this.amountDisplay.set('');
    this.form.reset({
      type: 'expense', categoryId: null,
      date: new Date().toISOString().split('T')[0],
      currency: 'COP', status: 'completed',
    });
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    const data = this.form.getRawValue() as CreateTransactionRequest;

    this.txService.create(data).subscribe({
      next: () => {
        this.toast.success('Transacción agregada');
        this.refresh.trigger(); // 👈 dispara el signal — todos los componentes reaccionan
        this.created.emit();
        this.close();
        this.loading.set(false);
      },
      error: () => { this.toast.error('Error al guardar'); this.loading.set(false); },
    });
  }
}