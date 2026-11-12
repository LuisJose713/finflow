import { DismissibleCardDirective } from '../../../shared/directives/dismissible-card.directive';
import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { GoalService } from '../../../core/services/goal.service';
import { ToastService } from '../../../core/services/toast.service';
import { Goal } from '../../../core/models';
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';
import { ToastContainerComponent } from '../../../shared/components/toast-container/toast-container.component';
import { AppCurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { GoalFormComponent } from '../goal-form/goal-form.component';
import { GoalAbonoComponent } from '../goal-abono/goal-abono.component';
import { GoalHistoryComponent } from '../goal-history/goal-history.component';


@Component({
  selector: 'app-goals-list',
  standalone: true,
  imports: [DismissibleCardDirective, 
    CommonModule,
    DecimalPipe,
    NavbarComponent,
    ToastContainerComponent,
    AppCurrencyPipe,
    GoalFormComponent,
    GoalAbonoComponent, 
    GoalHistoryComponent
  ],
  templateUrl: './goals-list.component.html',
  styleUrls: ['./goals-list.component.scss'],
})
export class GoalsListComponent implements OnInit {
  private goalService = inject(GoalService);
  private toast       = inject(ToastService);

  goals   = signal<Goal[]>([]);
  loading = signal(true);

  @ViewChild('goalForm')  goalForm!:  GoalFormComponent;
  @ViewChild('goalAbono') goalAbono!: GoalAbonoComponent;
  @ViewChild('goalHistory') goalHistory!: GoalHistoryComponent;


  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.goalService.getAll().subscribe({
      next:  (data) => { this.goals.set(data); this.loading.set(false); },
      error: ()     => this.loading.set(false),
    });
  }

  delete(goal: Goal) {
    if (!confirm(`¿Eliminar "${goal.title}"?`)) return;
    this.goalService.delete(goal.id).subscribe({
      next:  () => {
        this.goals.update(list => list.filter(g => g.id !== goal.id));
        this.toast.success('Meta eliminada');
      },
      error: () => this.toast.error('Error al eliminar'),
    });
  }

  progressPct(goal: Goal): number {
    if (!goal.targetAmount) return 0;
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      active:    'Activa',
      completed: 'Completada',
      cancelled: 'Cancelada',
    };
    return labels[status] ?? status;
  }

  trackByGoal(_: number, goal: Goal) { return goal.id; }
}
