import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type QuickCreateRoute =
  | '/goals' | '/planned-expenses'
  | '/accounts' | '/categories' | '/budgets' | '/recurring';

export interface QuickCreateConfig { label: string; route: QuickCreateRoute; }

/** Each screen owns its creation form. The sidebar only requests it to open. */
export const QUICK_CREATE: Record<QuickCreateRoute, QuickCreateConfig> = {
  '/goals': { label: 'Nueva meta', route: '/goals' },
  '/planned-expenses': { label: 'Nuevo gasto planeado', route: '/planned-expenses' },
  '/accounts': { label: 'Nueva billetera', route: '/accounts' },
  '/categories': { label: 'Nueva categoría', route: '/categories' },
  '/budgets': { label: 'Nuevo presupuesto', route: '/budgets' },
  '/recurring': { label: 'Nuevo recurrente', route: '/recurring' }
};

@Injectable({ providedIn: 'root' })
export class QuickCreateService {
  private readonly requests = new Subject<QuickCreateRoute>();
  readonly requested$ = this.requests.asObservable();
  request(route: QuickCreateRoute): void { this.requests.next(route); }
}
