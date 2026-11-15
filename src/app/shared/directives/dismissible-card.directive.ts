import { AfterViewInit, DestroyRef, Directive, ElementRef, Renderer2, RendererStyleFlags2, effect, inject, input, signal } from '@angular/core';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';

/** Only presentation headers opt in. Financial records and consent dialogs never do. */
@Directive({ selector: '[appDismissibleCard]', standalone: true })
export class DismissibleCardDirective implements AfterViewInit {
  readonly cardId = input.required<string>({ alias: 'appDismissibleCard' });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly preferences = inject(UiPreferencesService);
  private readonly destroy = inject(DestroyRef);
  private initialized = signal(false);
  private close?: HTMLButtonElement;

  constructor() {
    effect(() => {
      if (!this.initialized()) return;
      const hidden = this.preferences.isHidden(this.cardId());
      const enabled = this.preferences.canCustomize();
      const busy = this.preferences.isSaving(this.cardId());
      if (this.close) { this.close.hidden = !enabled; this.close.disabled = busy; }
      // A hidden presentation is entirely absent, with no residual restore icon.
      if (hidden) this.renderer.setStyle(this.host, 'display', 'none', RendererStyleFlags2.Important);
      else this.renderer.removeStyle(this.host, 'display', RendererStyleFlags2.Important);
    });
  }

  ngAfterViewInit() {
    this.close = this.renderer.createElement('button');
    this.close!.type = 'button'; this.close!.textContent = '×';
    this.renderer.setAttribute(this.close, 'aria-label', 'Ocultar presentación');
    this.renderer.setAttribute(this.close, 'title', 'Ocultar esta tarjeta');
    this.style(this.close!, { position: 'absolute', top: '10px', right: '10px', width: '44px', height: '44px',
      border: '1px solid #ffffff40', borderRadius: '10px', background: '#09162a70', color: '#ffffff',
      cursor: 'pointer', fontSize: '24px', lineHeight: '1', zIndex: '2' });
    this.renderer.setStyle(this.host, 'position', 'relative');
    this.renderer.setStyle(this.host, 'padding-right', '64px');
    this.renderer.appendChild(this.host, this.close);

    const removeClose = this.renderer.listen(this.close, 'click', (event: Event) => { event.stopPropagation(); this.preferences.setHidden(this.cardId(), true); });
    this.initialized.set(true);
    this.destroy.onDestroy(() => { removeClose(); this.close?.remove(); });
  }

  private style(element: HTMLElement, styles: Record<string, string>) {
    Object.entries(styles).forEach(([key, value]) => this.renderer.setStyle(element, key.replace(/[A-Z]/g, c => '-' + c.toLowerCase()), value));
  }
}
