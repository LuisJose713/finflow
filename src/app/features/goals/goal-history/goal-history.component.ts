import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { GoalService } from '../../../core/services/goal.service';
import { Goal, GoalContribution } from '../../../core/models';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';

@Component({
    selector: 'app-goal-history',
    imports: [CommonModule, DatePipe, DecimalPipe, AppCurrencyPipe],
    templateUrl: './goal-history.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./goal-history.component.scss']
})
export class GoalHistoryComponent {
  private goalService = inject(GoalService);

  isOpen        = signal(false);
  loading       = signal(false);
  goal          = signal<Goal | null>(null);
  contributions = signal<GoalContribution[]>([]);

  get progressPct(): number {
    const g = this.goal();
    if (!g || !g.targetAmount) return 0;
    return Math.min((g.currentAmount / g.targetAmount) * 100, 100);
  }

  get totalAbonaado(): number {
    return this.contributions().reduce((acc, c) => acc + c.amount, 0);
  }

  open(goal: Goal) {
    this.goal.set(goal);
    this.contributions.set([]);
    this.isOpen.set(true);
    this.loading.set(true);

    this.goalService.getContributions(goal.id).subscribe({
      next:  (data) => { this.contributions.set(data); this.loading.set(false); },
      error: ()     => this.loading.set(false),
    });
  }

  close() {
    this.isOpen.set(false);
    this.goal.set(null);
    this.contributions.set([]);
  }
}