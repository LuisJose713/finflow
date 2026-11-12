import { CurrencyInputDirective } from '../../../shared/directives/currency-input.directive';
import { Component, inject, signal, output } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GoalService } from '../../../core/services/goal.service';
import { ToastService } from '../../../core/services/toast.service';
import { Goal, CreateGoalRequest } from '../../../core/models';

@Component({
  selector: 'app-goal-form',
  standalone: true,
  imports: [CurrencyInputDirective, ReactiveFormsModule, CommonModule],
  templateUrl: './goal-form.component.html',
  styleUrls: ['./goal-form.component.scss'],
})
export class GoalFormComponent {
  private fb          = inject(FormBuilder);
  private goalService = inject(GoalService);
  private toast       = inject(ToastService);

  editGoal  = signal<Goal | null>(null);
  saved     = output<void>();
  isOpen    = signal(false);
  loading   = signal(false);
  error     = signal('');


  form = this.fb.group({
    title:         ['', [Validators.required, Validators.minLength(2)]],
    targetAmount:  [null as number | null, [Validators.required, Validators.min(1)]],
    currentAmount: [null as number | null],
    deadline:      ['', Validators.required],
    description:   [''],
  });

  get f() { return this.form.controls; }


  open(goal?: Goal) {
    this.error.set('');
    this.editGoal.set(goal ?? null);
    if (goal) {
      this.form.patchValue({
        title:         goal.title,
        targetAmount:  goal.targetAmount,
        currentAmount: null,
        deadline:      goal.deadline.split('T')[0],
        description:   goal.description ?? '',
      });
    } else {
      this.form.reset({ currentAmount: null });
    }
    this.isOpen.set(true);
  }

  close() {
    if (this.loading()) return;
    this.error.set('');
    this.isOpen.set(false);
    this.editGoal.set(null);
    this.form.reset({ currentAmount: null });
  }


  onSubmit() {
    if (this.loading()) return;
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completa el título, un monto objetivo válido y la fecha límite.');
      return;
    }
    this.loading.set(true);
    const raw  = this.form.getRawValue();
    const goal = this.editGoal();

    const data: CreateGoalRequest = {
      title:         raw.title!.trim(),
      targetAmount:  raw.targetAmount!,
      currentAmount: raw.currentAmount ?? 0,
      deadline:      raw.deadline!,
      description:   raw.description ?? '',
    };

    if (data.title.length < 2 || !Number.isFinite(data.targetAmount) || data.targetAmount <= 0 ||
        !Number.isFinite(data.currentAmount ?? 0) || (data.currentAmount ?? 0) < 0 ||
        (data.currentAmount ?? 0) > data.targetAmount) {
      this.error.set('Revisa el título y los valores: el ahorro inicial debe estar entre cero y el objetivo.');
      this.loading.set(false);
      return;
    }

    const request$ = goal
      ? this.goalService.update(goal.id, {
          title: data.title, targetAmount: data.targetAmount,
          deadline: data.deadline, description: data.description,
        }) // No enviar currentAmount=0 al editar: conservar aportes existentes.
      : this.goalService.create(data);

    request$.subscribe({
      next: () => {
        this.toast.success(goal ? 'Meta actualizada' : 'Meta creada');
        this.saved.emit();
        this.loading.set(false);
        this.close();
      },
      error: (err: HttpErrorResponse) => {
        const message = err.status === 401 ? 'La sesión expiró. Inicia sesión nuevamente.'
          : err.status === 400 ? 'Revisa el monto, el título y la fecha límite.'
          : err.status === 409 ? 'No se pudo guardar la meta por un conflicto de datos.'
          : err.status === 0 ? 'No hay conexión con el servidor. Reintenta en unos momentos.'
          : 'La meta no pudo guardarse. Verifica el servidor e inténtalo otra vez.';
        this.error.set(message);
        this.toast.error(message);
        this.loading.set(false);
      },
    });
  }
}
