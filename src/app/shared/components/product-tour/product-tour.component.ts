import { Component, Input, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TransactionWalkthroughService } from '../../../core/services/transaction-walkthrough.service';

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
  template: `
    @if (auth.isAuthenticated()) {
      <button class="tour-launcher" type="button" (click)="openGuide()"
              aria-label="Abrir guía de FinFlow" title="Guía de FinFlow">
        <span aria-hidden="true">?</span><span>Guía</span>
      </button>
      @if (opened() && !blocked) {
        <div class="tour-backdrop" (click)="closeGuide()">
          <section class="tour-panel" role="dialog" aria-modal="true"
                   aria-labelledby="tour-title" aria-describedby="tour-desc"
                   (click)="$event.stopPropagation()" (keydown.escape)="closeGuide()">
            <div class="tour-topline">
              <span>FINFLOW <span class="tour-dot">●</span> EMPIEZA AQUÍ</span>
              <button class="tour-close" type="button" aria-label="Cerrar guía" (click)="closeGuide()">✕</button>
            </div>
            <div class="tour-progress" role="progressbar" [attr.aria-valuemin]="1"
                 [attr.aria-valuemax]="steps.length" [attr.aria-valuenow]="index() + 1"
                 [attr.aria-label]="'Paso ' + (index() + 1) + ' de ' + steps.length">
              <span [style.width.%]="((index() + 1) / steps.length) * 100"></span>
            </div>
            <p class="tour-counter">PASO {{ index() + 1 }} DE {{ steps.length }}</p>
            <div class="tour-icon" aria-hidden="true">{{ current().icon }}</div>
            <h2 id="tour-title">{{ current().title }}</h2>
            <p id="tour-desc">{{ current().description }}</p>
            <button class="tour-practice" type="button" (click)="startTransactionGuide()">
              <span aria-hidden="true">☝</span> Guíame para crear un movimiento
            </button>
            <button class="tour-visit" type="button" (click)="visit()">
              {{ current().action }} <span aria-hidden="true">↗</span>
            </button>
            <div class="tour-actions">
              <button class="tour-skip" type="button" (click)="closeGuide()">Omitir</button>
              <div class="tour-nav">
                <button type="button" class="tour-previous" (click)="previous()" [disabled]="index() === 0">Anterior</button>
                <button type="button" class="tour-next" (click)="next()">
                  {{ index() === steps.length - 1 ? 'Finalizar' : 'Siguiente' }}
                </button>
              </div>
            </div>
          </section>
        </div>
      }
    }
  `,
  styles: [`
    :host{font-family:inherit}
    .tour-launcher{position:fixed;z-index:1100;right:18px;bottom:calc(98px + env(safe-area-inset-bottom));display:flex;
      align-items:center;gap:8px;background:#142d4c;color:#fff;border:1px solid #c6a56f;border-radius:100px;
      padding:10px 15px;box-shadow:0 8px 28px #06162940;cursor:pointer;font-weight:700;font-size:13px}
    .tour-launcher span:first-child{display:grid;place-items:center;width:21px;height:21px;border:1px solid #c6a56f;
      border-radius:50%;color:#e4bd7b;font-size:14px}
    .tour-launcher:focus-visible,.tour-panel button:focus-visible{outline:3px solid #ca9c51;outline-offset:3px}
    .tour-backdrop{position:fixed;inset:0;z-index:3200;background:#061427bd;backdrop-filter:blur(6px);
      display:flex;align-items:center;justify-content:center;padding:16px}
    .tour-panel{width:min(100%,440px);max-height:calc(100dvh - 32px);overflow-y:auto;box-sizing:border-box;
      background:var(--bg-primary,#fff);color:var(--text-primary,#192e48);border:1px solid var(--border,#cdd5df);
      border-radius:22px;padding:24px;box-shadow:0 24px 70px #0005}
    .tour-topline{display:flex;justify-content:space-between;align-items:center;color:var(--text-secondary,#596b81);
      font-size:10px;font-weight:800;letter-spacing:.16em;gap:10px}
    .tour-dot{color:#b59052}
    .tour-close{border:0;background:transparent;color:inherit;font-size:18px;cursor:pointer;padding:7px}
    .tour-progress{height:5px;border-radius:20px;background:#dce3eb;overflow:hidden;margin:16px 0 20px}
    .tour-progress span{display:block;height:100%;background:#b59052;transition:width .2s ease}
    .tour-counter{font-size:11px;font-weight:750;color:#b59052;letter-spacing:.1em}
    .tour-icon{display:grid;place-items:center;width:54px;height:54px;background:#142d4c;border-radius:15px;
      color:#e0b76e;font-size:27px;margin:15px 0}
    h2{font-size:clamp(21px,5vw,26px);line-height:1.2;margin:0 0 12px;font-weight:800}
    #tour-desc{font-size:14px;line-height:1.7;color:var(--text-secondary,#58697d);margin:0 0 20px}
    .tour-practice{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;
      border-radius:12px;padding:13px;margin-bottom:10px;background:#b59052;color:#142d4c;
      font-weight:800;cursor:pointer;font-size:13px}
    .tour-visit{width:100%;border:1px solid var(--border,#cdd5df);color:var(--text-primary,#192e48);
      background:transparent;border-radius:12px;padding:12px;font-weight:750;cursor:pointer}
    .tour-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:24px}
    .tour-nav{display:flex;gap:8px}
    .tour-actions button{padding:11px 13px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700}
    .tour-skip,.tour-previous{border:1px solid var(--border,#cdd5df);background:transparent;color:inherit}
    .tour-previous:disabled{opacity:.4;cursor:not-allowed}
    .tour-next{border:0;background:#142d4c;color:#fff}
    @media(max-width:480px){.tour-backdrop{align-items:flex-end;padding:0}.tour-panel{border-radius:20px 20px 0 0;
      max-height:92dvh;padding:20px 20px calc(20px + env(safe-area-inset-bottom))}.tour-launcher{right:12px;
      bottom:calc(90px + env(safe-area-inset-bottom))}}
    @media(prefers-reduced-motion:reduce){.tour-progress span{transition:none}}
  `]
})
export class ProductTourComponent {
  @Input() blocked = false;
  readonly auth = inject(AuthService);
  private readonly transactionWalkthrough = inject(TransactionWalkthroughService);
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
    { title: 'Protege tu cuenta', description: 'En Seguridad puedes administrar tu contraseña, tus sesiones y vincular Google para acceder con más facilidad.', route: '/security', action: 'Ir a Seguridad', icon: '◇' }
  ];
  readonly current = computed(() => this.steps[this.index()]);
  private readonly keyPrefix = 'finflow-tour-v1-';

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      const signedIn = this.auth.isAuthenticated();
      if (!signedIn || !user) { this.opened.set(false); return; }
      const key = this.keyPrefix + String(user.id || user.email);
      try {
        if (!localStorage.getItem(key)) this.opened.set(true);
      } catch { /* Private browsing: manual launch is still available. */ }
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
    void this.router.navigateByUrl('/transactions').then(() => this.transactionWalkthrough.start());
  }
  visit(): void {
    if (this.current().route === '/transactions') { this.startTransactionGuide(); return; }
    const destination = this.current().route;
    this.closeGuide();
    void this.router.navigateByUrl(destination);
  }
}
