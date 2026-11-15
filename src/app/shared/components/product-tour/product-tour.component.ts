import { Component, Input, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TransactionWalkthroughService } from '../../../core/services/transaction-walkthrough.service';
import { PageGuideService } from '../../../core/services/page-guide.service';

interface TourStep {
  title: string;
  description: string;
  route: string;
  action: string;
  icon: string;
}

/**
 * Lightweight, optional tour. It only navigates between pages and never writes
 * financial data. Completion is scoped to the account and browser.
 */
@Component({
  selector: 'app-product-tour',
  standalone: true,
  templateUrl: './product-tour.component.html',
  styleUrls: ['./product-tour.component.scss']
})
export class ProductTourComponent {
  @Input() blocked = false;
  readonly auth = inject(AuthService);
  private readonly transactionWalkthrough = inject(TransactionWalkthroughService);
  readonly pageGuide = inject(PageGuideService);
  private readonly router = inject(Router);
  readonly index = signal(0);
  readonly opened = signal(false);
  readonly steps: TourStep[] = [
    { title: 'Bienvenido a FinFlow', description: 'Tu centro financiero reúne ingresos, gastos y tendencias. Aquí empiezas a ver con claridad cómo se mueve tu dinero.', route: '/dashboard', action: 'Ir a mi inicio', icon: '⌂' },
    { title: 'Registra tus movimientos', description: 'Añade un ingreso o un gasto con título, importe, categoría y fecha. Puedes editarlo y consultar tu historial cuando quieras.', route: '/transactions', action: 'Ver movimientos', icon: '↗' },
    { title: 'Organiza tus billeteras', description: 'Separa tus cuentas y billeteras para saber cuánto tienes en cada una y gestionar transferencias entre las tuyas.', route: '/accounts', action: 'Ver mis billeteras', icon: '▣' },
    { title: 'Controla tu presupuesto', description: 'Establece límites mensuales y revisa cuánto has gastado frente al presupuesto que planeaste.', route: '/budgets', action: 'Ver presupuestos', icon: '◉' },
    { title: 'Construye tus metas', description: 'Crea objetivos de ahorro, registra aportes y observa tu avance hacia lo que quieres conseguir.', route: '/goals', action: 'Ver mis metas', icon: '☆' },
    { title: 'Conoce a tu asesor IA', description: 'Consulta al asesor financiero para explorar tus hábitos y organizar mejor tus decisiones. Sus respuestas son orientativas.', route: '/advisor', action: 'Abrir asesor IA', icon: '✧' },
    { title: 'Programa tus gastos', description: 'Aprende a registrar pagos futuros y sus fechas de vencimiento.', route: '/planned-expenses', action: 'Ver gastos planeados', icon: '▤' },
    { title: 'Organiza tus recurrentes', description: 'Programa movimientos que se repiten mensualmente.', route: '/recurring', action: 'Ver recurrentes', icon: '↻' },
    { title: 'Personaliza categorías', description: 'Crea categorías propias para organizar tus finanzas.', route: '/categories', action: 'Ver categorías', icon: '▦' },
    { title: 'Protege tu cuenta', description: 'En Seguridad puedes administrar tu contraseña, tus sesiones y vincular Google para acceder con más facilidad.', route: '/security', action: 'Ir a Seguridad', icon: '◇' }
  ];
  readonly current = computed(() => this.steps[this.index()]);
  private readonly keyPrefix = 'finflow-tour-v1-';

  constructor() {
    // A tutorial must be user-initiated: never block the dashboard after login.
    effect(() => {
      if (!this.auth.isAuthenticated()) this.opened.set(false);
    });
  }

  openGuide(): void { if (this.blocked) return; this.index.set(0); this.opened.set(true); }
  closeGuide(): void {
    this.opened.set(false);
    const user = this.auth.currentUser();
    if (!user) return;
    try { localStorage.setItem(this.keyPrefix + String(user.id || user.email), 'seen'); } catch {}
  }
  previous(): void { this.index.update(i => Math.max(0, i - 1)); }
  next(): void {
    if (this.index() === this.steps.length - 1) { this.closeGuide(); return; }
    this.index.update(i => i + 1);
  }
  startTransactionGuide(): void {
    this.closeGuide();
    this.pageGuide.finish();
    if (this.router.url.split(/[?#]/)[0] === '/transactions') {
      this.transactionWalkthrough.start();
      return;
    }
    void this.router.navigateByUrl('/transactions').then(() => {
      if (this.router.url.split(/[?#]/)[0] === '/transactions') this.transactionWalkthrough.start();
    });
  }
  startSectionGuide(): void {
    const route = this.current().route;
    if (route === '/transactions') { this.startTransactionGuide(); return; }
    this.closeGuide();
    this.transactionWalkthrough.finish();
    if (this.router.url.split(/[?#]/)[0] === route) {
      this.pageGuide.start(route);
      return;
    }
    void this.router.navigateByUrl(route).then(() => {
      if (this.router.url.split(/[?#]/)[0] === route) this.pageGuide.start(route);
    });
  }

  visit(): void { this.startSectionGuide(); }

}
