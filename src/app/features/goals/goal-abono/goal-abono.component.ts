// import { Component, inject, signal, output } from '@angular/core';
// import { CommonModule, DecimalPipe } from '@angular/common';
// import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
// import { GoalService } from '../../../core/services/goal.service';
// import { ToastService } from '../../../core/services/toast.service';
// import { Goal } from '../../../core/models';

// @Component({
//   selector: 'app-goal-abono',
//   standalone: true,
//   imports: [CommonModule, ReactiveFormsModule, DecimalPipe],
//   templateUrl: './goal-abono.component.html',
//   styleUrls: ['./goal-abono.component.scss'],
// })
// export class GoalAbonoComponent {
//   private fb          = inject(FormBuilder);
//   private goalService = inject(GoalService);
//   private toast       = inject(ToastService);

//   saved = output<void>();

//   isOpen  = signal(false);
//   loading = signal(false);
//   goal    = signal<Goal | null>(null);

//   form = this.fb.group({
//     amount: [null as number | null, [Validators.required, Validators.min(1)]],
//   });

//   get f() { return this.form.controls; }

//   get progressPct(): number {
//     const g = this.goal();
//     if (!g || !g.targetAmount) return 0;
//     return Math.min((g.currentAmount / g.targetAmount) * 100, 100);
//   }

//   get remaining(): number {
//     const g = this.goal();
//     if (!g) return 0;
//     return Math.max(g.targetAmount - g.currentAmount, 0);
//   }

//   open(goal: Goal) {
//     this.goal.set(goal);
//     this.form.reset();
//     this.isOpen.set(true);
//   }

//   close() {
//     this.isOpen.set(false);
//     this.form.reset();
//   }

//   onSubmit() {
//     if (this.form.invalid) {
//       this.form.markAllAsTouched();
//       return;
//     }

//     const g = this.goal();
//     if (!g) return;

//     this.loading.set(true);
//     const amount = this.form.getRawValue().amount!;

//     this.goalService.addContribution(g.id, { amount }).subscribe({
//       next: () => {
//         this.toast.success('Abono registrado exitosamente');
//         this.saved.emit();
//         this.close();
//         this.loading.set(false);
//       },
//       error: () => {
//         this.toast.error('Error al registrar el abono');
//         this.loading.set(false);
//       },
//     });
//   }
// }

import { Component, inject, signal, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { GoalService } from '../../../core/services/goal.service';
import { ToastService } from '../../../core/services/toast.service';
import { Goal } from '../../../core/models';

@Component({
  selector: 'app-goal-abono',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DecimalPipe],
  templateUrl: './goal-abono.component.html',
  styleUrls: ['./goal-abono.component.scss'],
})
export class GoalAbonoComponent {
  private fb          = inject(FormBuilder);
  private goalService = inject(GoalService);
  private toast       = inject(ToastService);

  saved = output<void>();

  isOpen        = signal(false);
  loading       = signal(false);
  goal          = signal<Goal | null>(null);
  amountDisplay = signal('');

  form = this.fb.group({
    amount: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  get f() { return this.form.controls; }

  get progressPct(): number {
    const g = this.goal();
    if (!g || !g.targetAmount) return 0;
    return Math.min((g.currentAmount / g.targetAmount) * 100, 100);
  }

  get remaining(): number {
    const g = this.goal();
    if (!g) return 0;
    return Math.max(g.targetAmount - g.currentAmount, 0);
  }

  open(goal: Goal) {
    this.goal.set(goal);
    this.form.reset();
    this.amountDisplay.set('');
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
    this.form.reset();
    this.amountDisplay.set('');
  }

  onInput(event: Event): void {
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

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const g = this.goal();
    if (!g) return;

    this.loading.set(true);
    const amount = this.form.getRawValue().amount!;

    this.goalService.addContribution(g.id, { amount }).subscribe({
      next: () => {
        this.toast.success('Abono registrado exitosamente');
        this.saved.emit();
        this.close();
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Error al registrar el abono');
        this.loading.set(false);
      },
    });
  }
}