import { Component, DestroyRef, HostListener, Input, computed, effect, inject, signal } from '@angular/core';
import { TransactionWalkthroughService } from '../../core/services/transaction-walkthrough.service';

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
  templateUrl: './transaction-spotlight.component.html',
  styleUrls: ['./transaction-spotlight.component.scss']
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
    // Keep the highlighted action in view, including inside scrollable dialogs.
    let rect = target.getBoundingClientRect();
    if (allowScroll && (rect.top < 190 || rect.bottom > window.innerHeight - 190)) {
      target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      rect = target.getBoundingClientRect();
    }

    // "Gasto / Ingreso" is a two-button choice. Highlight the buttons, not
    // their layout wrapper (which includes padding and can bleed into Título).
    if (step === 1) {
      const choices = Array.from(target.querySelectorAll<HTMLElement>('.type-btn'))
        .filter(button => button.getClientRects().length > 0)
        .map(button => button.getBoundingClientRect());
      if (choices.length) {
        const x = Math.min(...choices.map(b => b.left));
        const y = Math.min(...choices.map(b => b.top));
        const right = Math.max(...choices.map(b => b.right));
        const bottom = Math.max(...choices.map(b => b.bottom));
        rect = new DOMRect(x, y, right - x, bottom - y);
      }
    }

    const vw = window.innerWidth, vh = window.innerHeight, gap = 4;
    const left = Math.max(0, rect.left - gap), top = Math.max(0, rect.top - gap);
    const right = Math.min(vw, rect.right + gap);
    const bottom = Math.min(vh, rect.bottom + gap);

    // Prefer showing the instruction ABOVE the highlighted field; that leaves
    // the next input visible for the very next interaction.
    const compact = vw <= 600;
    const tooltipWidth = Math.min(328, vw - 24);
    const tooltipHeight = Math.min(compact ? 158 : 188, vh * 0.38);
    const spaceAbove = top - 12;
    const spaceBelow = vh - bottom - 12;

    // Phones: use a compact top/bottom instruction dock, so successive form
    // controls are never hidden behind the explanation card.
    let above: boolean;
    let tooltipTop: number;
    if (compact && vh >= 430) {
      above = top > tooltipHeight + 34;
      tooltipTop = above ? 10 : vh - tooltipHeight - 10;
    } else {
      above = spaceAbove >= tooltipHeight + 12 ||
        (spaceAbove > spaceBelow && spaceAbove >= 130);
      tooltipTop = above ? top - tooltipHeight - 12 : bottom + 12;
    }

    tooltipTop = Math.max(10, Math.min(tooltipTop, vh - tooltipHeight - 10));
    const tooltipLeft = Math.max(12, Math.min(vw - tooltipWidth - 12, left));
    this.bounds.set({
      top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top),
      tooltipTop, tooltipLeft, above
    });
  }
}
