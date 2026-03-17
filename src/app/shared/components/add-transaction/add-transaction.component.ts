import { Component, inject, signal, output } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { TransactionService } from '../../../core/services/transaction.service';
import { ToastService } from '../../../core/services/toast.service';
import { CreateTransactionRequest, TransactionType } from '../../../core/models';

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <!-- Trigger button -->
    <button class="btn-add" (click)="open()">
      + Nueva transacción
    </button>

    <!-- Modal backdrop -->
    @if (isOpen()) {
      <div class="modal-backdrop" (click)="close()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Nueva transacción</h2>
            <button class="btn-close" (click)="close()">✕</button>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <!-- Type toggle -->
            <div class="type-toggle">
              <button
                type="button"
                class="type-btn"
                [class.active]="form.value.type === 'income'"
                (click)="form.patchValue({ type: 'income' })"
              >
                ↑ Ingreso
              </button>
              <button
                type="button"
                class="type-btn expense"
                [class.active]="form.value.type === 'expense'"
                (click)="form.patchValue({ type: 'expense' })"
              >
                ↓ Gasto
              </button>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>Título</label>
                <input
                  type="text"
                  formControlName="title"
                  placeholder="Ej: Salario mensual"
                  [class.error]="f['title'].invalid && f['title'].touched"
                />
              </div>

              <div class="form-group">
                <label>Monto</label>
                <input
                  type="number"
                  formControlName="amount"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  [class.error]="f['amount'].invalid && f['amount'].touched"
                />
              </div>

              <div class="form-group">
                <label>Categoría</label>
                <select formControlName="category">
                  @for (cat of categories; track cat) {
                    <option [value]="cat">{{ cat }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Fecha</label>
                <input type="date" formControlName="date" />
              </div>

              <div class="form-group full-width">
                <label>Descripción (opcional)</label>
                <textarea
                  formControlName="description"
                  rows="2"
                  placeholder="Notas adicionales..."
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn-cancel" (click)="close()">
                Cancelar
              </button>
              <button type="submit" class="btn-submit" [disabled]="loading()">
                {{ loading() ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styleUrl: './add-transaction.component.scss',
})
export class AddTransactionComponent {
  private fb = inject(FormBuilder);
  private transactionService = inject(TransactionService);
  private toast = inject(ToastService);

  isOpen = signal(false);
  loading = signal(false);

  created = output<void>();

  categories = [
    'Alimentación', 'Transporte', 'Salud', 'Educación',
    'Entretenimiento', 'Servicios', 'Ropa', 'Salario',
    'Inversión', 'Freelance', 'Otros',
  ];

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    type: ['expense' as TransactionType, Validators.required],
    category: ['Otros', Validators.required],
    date: [new Date().toISOString().split('T')[0], Validators.required],
    description: [''],
  });

  get f() { return this.form.controls; }

  open() { this.isOpen.set(true); }
  close() {
    this.isOpen.set(false);
    this.form.reset({
      type: 'expense',
      category: 'Otros',
      date: new Date().toISOString().split('T')[0],
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const data = this.form.getRawValue() as CreateTransactionRequest;

    this.transactionService.create(data).subscribe({
      next: () => {
        this.toast.success('Transacción agregada');
        this.created.emit();
        this.close();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al guardar');
        this.loading.set(false);
      },
    });
  }
}
