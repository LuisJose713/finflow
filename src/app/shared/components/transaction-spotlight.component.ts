import { Component, DestroyRef, HostListener, Input, computed, effect, inject, signal } from '@angular/core';
import { TransactionWalkthroughService } from '../../core/services/transaction-walkthrough.service';
import { PageGuideService } from '../../core/services/page-guide.service';

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
  readonly pageGuide = inject(PageGuideService);
  private readonly destroyRef = inject(DestroyRef);
  readonly isBlocked = signal(false);
  @Input() set blocked(value: boolean) { this.isBlocked.set(Boolean(value)); }

  readonly bounds = signal<SpotlightBounds | null>(null);
  // Keep the page blocked even while a control is loading or a step changes.
  // Without a fallback the overlay briefly disappears, making unrelated buttons clickable.
  readonly visibleBounds = computed<SpotlightBounds>(() => this.bounds() ?? {
    top: 0, left: 0, width: 0, height: 0,
    tooltipTop: 16, tooltipLeft: 12, above: false
  });
  readonly isTransaction = computed(() => this.walkthrough.step() >= 0);
  readonly activeStep = computed(() => this.isTransaction() ? this.walkthrough.step() : this.pageGuide.index());
  readonly totalSteps = computed(() => this.isTransaction() ? 7 : this.pageGuide.total());
  readonly isLastPageStep = computed(() => !this.isTransaction() && this.pageGuide.index() === this.pageGuide.total() - 1);
  private readonly selectors = ['new', 'type', 'title', 'amount', 'category', 'date', 'save'];
  readonly current = computed(() => {
    if (!this.isTransaction()) return this.pageGuide.step() ?? { title: '', description: '' };
    return [
      { title: 'Pulsa Nueva transacción', description: 'Toca el botón resaltado para comenzar a registrar un movimiento.' },
      { title: 'Selecciona Gasto o Ingreso', description: 'Toca una opción para ver las categorías correspondientes.' },
      { title: 'Escribe el título', description: 'Cuenta qué pasó, por ejemplo «Almuerzo». Luego toca Monto.' },
      { title: 'Introduce el monto', description: 'Escribe cuánto ingresaste o gastaste. Luego pasa a Categoría.' },
      { title: 'Selecciona una categoría', description: 'Elige la categoría que mejor describe el movimiento.' },
      { title: 'Comprueba la fecha', description: 'Puedes cambiarla o confirmar que la propuesta es correcta.' },
      { title: 'Revisa antes de guardar', description: 'Solo guarda si quieres registrar este movimiento real. Puedes cerrar la guía sin guardar.' }
    ][Math.max(0, Math.min(6, this.walkthrough.step()))];
  });
  readonly canAdvanceManually = computed(() => !this.isTransaction() && this.pageGuide.step()?.advanceOn === 'manual');
  finish(): void { this.walkthrough.finish(); this.pageGuide.finish(); }
  nextManual(): void { if (this.canAdvanceManually()) this.pageGuide.next(); }

  private attempt = 0;
  private pending: ReturnType<typeof setTimeout> | undefined;
  private readonly refresh = () => this.locate(false);

  // The tutorial is a focused interaction, not a decorative overlay:
  // keyboard users must not reach the sidebar or unrelated form controls.
  private readonly guardKeyboard = (event: KeyboardEvent) => {
    if (this.activeStep() < 0 || this.isBlocked()) return;
    if (event.key === 'Escape' || (event.altKey && event.key === 'ArrowLeft')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private readonly guardFocus = (event: FocusEvent) => {
    if (this.activeStep() < 0 || this.isBlocked()) return;
    const focused = event.target;
    if (!(focused instanceof HTMLElement)) return;
    if (focused.closest('.spotlight-message')) return;
    const selector = this.isTransaction()
      ? '[data-finflow-tour="' + this.selectors[this.walkthrough.step()] + '"]'
      : this.pageGuide.step()?.selector;
    if (selector && focused.closest(selector)) return;
    const highlighted = selector ? document.querySelector<HTMLElement>(selector) : null;
    const focusableSelector = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';
    const preferred = highlighted?.matches(focusableSelector)
      ? highlighted : highlighted?.querySelector<HTMLElement>(focusableSelector);
    const fallback = document.querySelector<HTMLElement>('.spotlight-message .exit');
    (preferred && preferred.getClientRects().length ? preferred : fallback)?.focus({ preventScroll: true });
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.refresh);
      document.addEventListener('scroll', this.refresh, true);
      document.addEventListener('keydown', this.guardKeyboard, true);
      document.addEventListener('focusin', this.guardFocus, true);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('resize', this.refresh);
        document.removeEventListener('scroll', this.refresh, true);
        document.removeEventListener('keydown', this.guardKeyboard, true);
        document.removeEventListener('focusin', this.guardFocus, true);
        clearTimeout(this.pending);
      });
    }
    effect(() => {
      const step = this.activeStep();
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

  @HostListener('document:click', ['$event'])
  onGuideClick(event: MouseEvent): void { this.pageGuide.handleInteraction(event); }

  @HostListener('document:change', ['$event'])
  onGuideChange(event: Event): void { this.pageGuide.handleInteraction(event); }

  @HostListener('document:focusout', ['$event'])
  onGuideFocusout(event: FocusEvent): void { this.pageGuide.handleInteraction(event); }

  private locate(allowScroll: boolean): void {
    const step = this.activeStep();
    if (step < 0 || this.isBlocked() || typeof document === 'undefined') return;
    const selector = this.isTransaction()
      ? '[data-finflow-tour="' + this.selectors[step] + '"]'
      : this.pageGuide.step()?.selector;
    if (!selector) return;
    const target = document.querySelector<HTMLElement>(selector);
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
    if (this.isTransaction() && step === 1) {
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
