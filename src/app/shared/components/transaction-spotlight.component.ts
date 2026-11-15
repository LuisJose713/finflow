import { Component, DestroyRef, HostListener, Input, computed, effect, inject, signal } from '@angular/core';
import { TransactionWalkthroughService } from '../../../core/services/transaction-walkthrough.service';

interface SpotlightBounds {
  top: number;
  left: number;
  width: number;
  height: number;
  tooltipTop: number;
  tooltipLeft: number;
  above: boolean;
}

/** Uses actual controls. Never creates a financial transaction on the user's behalf. */
@Component({
  selector: 'app-transaction-spotlight',
  standalone: true,
  template: `
    @if (walkthrough.step() >= 0 && !isBlocked()) {
      @if (bounds(); as b) {
        <div class="spotlight-layer" aria-label="Tutorial guiado de FinFlow">
          <div class="shade" aria-hidden="true" style="top:0;left:0;right:0"
               [style.height.px]="b.top"></div>
          <div class="shade" aria-hidden="true" style="left:0;right:0;bottom:0"
               [style.top.px]="b.top + b.height"></div>
          <div class="shade" aria-hidden="true" [style.top.px]="b.top"
               [style.width.px]="b.left" [style.height.px]="b.height" style="left:0"></div>
          <div class="shade" aria-hidden="true" [style.top.px]="b.top"
               [style.left.px]="b.left + b.width" [style.height.px]="b.height" style="right:0"></div>
          <div class="focus-ring" aria-hidden="true" [style.top.px]="b.top"
               [style.left.px]="b.left" [style.width.px]="b.width" [style.height.px]="b.height"></div>
          <section class="spotlight-message" role="status" aria-live="polite" [class.above]="b.above"
                   [style.top.px]="b.tooltipTop" [style.left.px]="b.tooltipLeft">
            <div class="heading">
              <span>FINFLOW · GUÍA PRÁCTICA</span>
              <button type="button" (click)="walkthrough.finish()" aria-label="Salir de la guía">✕</button>
            </div>
            <p class="step-count">PASO {{ walkthrough.step() + 1 }} DE 7</p>
            <h2>{{ current().title }}</h2>
            <p class="description">{{ current().description }}</p>
            @if (walkthrough.step() === 5) {
              <button class="accept-date" type="button" (click)="walkthrough.advance(5)">
                La fecha está bien
              </button>
            }
            <button class="exit" type="button" (click)="walkthrough.finish()">Omitir tutorial</button>
          </section>
        </div>
      }
    }
  `,
  styles: [`
    :host { display:contents }
    .spotlight-layer { position:fixed; inset:0; z-index:3600; pointer-events:none }
    .shade { position:fixed; background:rgba(4,13,31,.75); pointer-events:none }
    .focus-ring { position:fixed; border:3px solid #e5b967; border-radius:12px; box-sizing:border-box;
      box-shadow:0 0 0 2px #fff9,0 0 28px #e5b967aa; pointer-events:none; animation:tour-glow 1.8s ease-in-out infinite }
    @keyframes tour-glow {
      50% { box-shadow:0 0 0 4px #fff8,0 0 36px #e5b967dd }
    }
    .spotlight-message { box-sizing:border-box; position:fixed; width:min(340px,calc(100vw - 24px));
      background:#132b49; color:#fff; border:1px solid #b79459; border-radius:16px; padding:16px 17px;
      box-shadow:0 18px 50px #0008; pointer-events:auto; max-height:44dvh; overflow:auto }
    .heading { display:flex; justify-content:space-between; align-items:center; gap:12px;
      color:#edcb86; font-size:10px; letter-spacing:.11em; font-weight:800 }
    .heading button { background:transparent; color:#fff; border:0; font-size:18px;
      min-width:28px; min-height:28px; cursor:pointer }
    .step-count { margin:11px 0 6px; color:#e0b773; font-weight:700; font-size:11px; letter-spacing:.08em }
    h2 { font-size:18px; margin:0 0 9px; line-height:1.3; color:#fff }
    .description { font-size:13px; line-height:1.55; margin:0; color:#e6eaf1 }
    .exit { border:0; background:transparent; color:#d6e4ff; text-decoration:underline;
      margin-top:14px; padding:5px 0; cursor:pointer; font-size:12px }
    .accept-date { display:block; border:0; border-radius:9px; background:#dfbd7e; color:#152841;
      font-weight:800; cursor:pointer; padding:10px 12px; margin-top:12px; width:100% }
    :is(button):focus-visible { outline:3px solid #e5b967; outline-offset:3px }
    @media(max-width:540px) { .spotlight-message { padding:13px 15px; max-height:38dvh } h2 { font-size:16px } }
    @media(prefers-reduced-motion:reduce) { .focus-ring { animation:none } }
  `]
})
export class TransactionSpotlightComponent {
  readonly walkthrough = inject(TransactionWalkthroughService);
  private readonly destroyRef = inject(DestroyRef);
  readonly isBlocked = signal(false);
  @Input() set blocked(value: boolean) { this.isBlocked.set(Boolean(value)); }

  readonly bounds = signal<SpotlightBounds | null>(null);
  private readonly selectors = ['new', 'type', 'title', 'amount', 'category', 'date', 'save'];
  readonly current = computed(() => [
    { title: 'Pulsa Nueva transacción', description: 'Toca el botón resaltado para comenzar a registrar un movimiento.' },
    { title: 'Selecciona Gasto o Ingreso', description: 'Toca la opción correspondiente. FinFlow mostrará las categorías correctas.' },
    { title: 'Escribe el título', description: 'Cuenta qué pasó: por ejemplo, «Almuerzo». Luego toca el campo de monto.' },
    { title: 'Introduce el monto', description: 'Escribe el valor del movimiento. Luego toca Categoría para continuar.' },
    { title: 'Selecciona una categoría', description: 'Elige una categoría de la lista para organizar este movimiento.' },
    { title: 'Comprueba la fecha', description: 'Puedes cambiarla o confirmar que la fecha propuesta es correcta.' },
    { title: 'Guarda solo si lo deseas', description: 'Comprueba los datos y toca Guardar para registrar el movimiento real. También puedes omitir el tutorial sin guardarlo.' },
  ][Math.max(0, Math.min(6, this.walkthrough.step()))]);

  private attempt = 0;
  private pending: ReturnType<typeof setTimeout> | undefined;
  private readonly refresh = () => this.locate(false);

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.refresh);
      document.addEventListener('scroll', this.refresh, true);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', this.refresh);
        document.removeEventListener('scroll', this.refresh, true);
        clearTimeout(this.pending);
      });
    }
    effect(() => {
      const step = this.walkthrough.step();
      const blocked = this.isBlocked();
      clearTimeout(this.pending);
      if (step < 0 || blocked) {
        this.bounds.set(null);
        return;
      }
      this.attempt = 0;
      this.bounds.set(null);
      this.pending = setTimeout(() => this.locate(true), 0);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.walkthrough.step() >= 0) this.walkthrough.finish();
  }

  private locate(allowScroll: boolean): void {
    const step = this.walkthrough.step();
    if (step < 0 || this.isBlocked() || typeof document === 'undefined') return;
    const target = document.querySelector<HTMLElement>('[data-finflow-tour="' + this.selectors[step] + '"]');
    if (!target || !target.getClientRects().length) {
      if (this.attempt++ < 25) this.pending = setTimeout(() => this.locate(true), 100);
      else this.bounds.set(null);
      return;
    }
    let rect = target.getBoundingClientRect();
    if (allowScroll && (rect.top < 12 || rect.bottom > window.innerHeight - 12)) {
      target.scrollIntoView({ behavior: 'instant', block: 'center' });
      rect = target.getBoundingClientRect();
    }
    const vw = window.innerWidth, vh = window.innerHeight, gap = 7;
    const left = Math.max(0, rect.left - gap), top = Math.max(0, rect.top - gap);
    const right = Math.min(vw, rect.right + gap);
    const bottom = Math.min(vh, rect.bottom + gap);
    const tooltipWidth = Math.min(340, vw - 24), tooltipHeight = Math.min(200, vh * .4);
    const above = vh - bottom < tooltipHeight + 14 && top > tooltipHeight + 14;
    const tooltipTop = above ? Math.max(12, top - tooltipHeight - 12)
      : Math.min(vh - tooltipHeight - 12, bottom + 12);
    const tooltipLeft = Math.max(12, Math.min(vw - tooltipWidth - 12, left));
    this.bounds.set({ top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top),
      tooltipTop: Math.max(12, tooltipTop), tooltipLeft, above });
  }
}
