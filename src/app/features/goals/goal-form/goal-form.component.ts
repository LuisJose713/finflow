import { Component, inject, signal, output, input } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // <-- Para *ngIf
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
  private fb = inject(FormBuilder);
  private goalService = inject(GoalService);
  private toast = inject(ToastService);

  editGoal = input<Goal | null>(null);
  saved = output<void>();

  isOpen = signal(false);
  loading = signal(false);

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    targetAmount: [null as number | null, [Validators.required, Validators.min(1)]],
    currentAmount: [0],
    deadline: ['', Validators.required],
    description: [''],
  });

  get f() {
    return this.form.controls;
  }

  open(goal?: Goal) {
    if (goal) {
      this.form.patchValue({
        title: goal.title,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        deadline: goal.deadline.split('T')[0],
        description: goal.description ?? '',
      });
    }
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.form.reset({ currentAmount: 0 });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const data = this.form.getRawValue() as CreateGoalRequest;
    const goal = this.editGoal();

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