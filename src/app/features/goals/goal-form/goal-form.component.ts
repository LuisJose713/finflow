import { Component, inject, signal, output } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { GoalService } from '../../../core/services/goal.service';
import { ToastService } from '../../../core/services/toast.service';
import { Goal, CreateGoalRequest } from '../../../core/models';

@Component({
  selector: 'app-goal-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
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

  // Signals de display para los campos con formato
  targetDisplay  = signal('');
  currentDisplay = signal('');

  form = this.fb.group({
    title:         ['', [Validators.required, Validators.minLength(2)]],
    targetAmount:  [null as number | null, [Validators.required, Validators.min(1)]],
    currentAmount: [null as number | null],
    deadline:      ['', Validators.required],
    description:   [''],
  });

  get f() { return this.form.controls; }

  private fmt(value: number | null): string {
    if (value == null) return '';
    return value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  open(goal?: Goal) {
    this.editGoal.set(goal ?? null);
    if (goal) {
      this.form.patchValue({
        title:         goal.title,
        targetAmount:  goal.targetAmount,
        currentAmount: null,
        deadline:      goal.deadline.split('T')[0],
        description:   goal.description ?? '',
      });
      this.targetDisplay.set(this.fmt(goal.targetAmount));
      this.currentDisplay.set('');
    } else {
      this.form.reset({ currentAmount: null });
      this.targetDisplay.set('');
      this.currentDisplay.set('');
    }
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.editGoal.set(null);
    this.form.reset({ currentAmount: null });
    this.targetDisplay.set('');
    this.currentDisplay.set('');
  }

  onInput(event: Event, controlName: 'targetAmount' | 'currentAmount'): void {
    const input   = event.target as HTMLInputElement;
    const raw     = input.value.replace(/\D/g, '');
    if (!raw) {
      this.form.get(controlName)?.setValue(null, { emitEvent: false });
      if (controlName === 'targetAmount') this.targetDisplay.set('');
      else this.currentDisplay.set('');
      input.value = '';
      return;
    }
    const numeric   = parseInt(raw, 10);
    const formatted = numeric.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    input.value = formatted;
    this.form.get(controlName)?.setValue(numeric, { emitEvent: false });
    if (controlName === 'targetAmount') this.targetDisplay.set(formatted);
    else this.currentDisplay.set(formatted);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const raw  = this.form.getRawValue();
    const goal = this.editGoal();

    const data: CreateGoalRequest = {
      title:         raw.title!,
      targetAmount:  raw.targetAmount!,
      currentAmount: raw.currentAmount ?? 0,
      deadline:      raw.deadline!,
      description:   raw.description ?? '',
    };

    const request$ = goal
      ? this.goalService.update(goal.id, data)
      : this.goalService.create(data);

    request$.subscribe({
      next: () => {
        this.toast.success(goal ? 'Meta actualizada' : 'Meta creada');
        this.saved.emit();
        this.close();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al guardar la meta');
        this.loading.set(false);
      },
    });
  }
}