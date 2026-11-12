import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';

/** Keep native pickers and expose a wrapped value only when the selected text cannot fit. */
@Injectable({ providedIn: 'root' })
export class SelectReadabilityService {
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  constructor() {
    const window = this.document.defaultView;
    if (!window) return;
    const entries = new Map<HTMLSelectElement, { label: HTMLSpanElement; change: () => void }>();
    const context = this.document.createElement('canvas').getContext('2d');
    let frame = 0;
    let destroyed = false;
    const schedule = () => { if (!destroyed && !frame) frame = window.requestAnimationFrame(scan); };
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    const scan = () => {
      frame = 0;
      for (const [select, entry] of entries) {
        if (!select.isConnected) {
          resize?.unobserve(select); select.removeEventListener('change', entry.change);
          entry.label.remove(); entries.delete(select);
        }
      }
      for (const select of this.document.querySelectorAll('select:not([multiple])')) {
        const field = select as HTMLSelectElement;
        let entry = entries.get(field);
        if (!entry) {
          const label = this.document.createElement('span');
          label.className = 'select-readable-value'; label.setAttribute('aria-hidden', 'true'); label.hidden = true;
          field.after(label); entry = { label, change: schedule }; entries.set(field, entry);
          field.addEventListener('change', schedule); resize?.observe(field);
        }
        const text = field.selectedOptions[0]?.textContent?.trim() ?? '';
        const style = window.getComputedStyle(field);
        if (context) context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const available = field.clientWidth - parseFloat(style.paddingLeft || '0') - Math.max(32, parseFloat(style.paddingRight || '0'));
        const clipped = field.clientWidth > 0 && !!text && !!context && context.measureText(text).width > available + 1;
        if (entry.label.textContent !== text) entry.label.textContent = text;
        entry.label.hidden = !clipped;
      }
    };
    const mutations = new MutationObserver(schedule);
    mutations.observe(this.document.body, { subtree: true, childList: true });
    window.addEventListener('resize', schedule); schedule();
    this.document.fonts?.ready.then(schedule);
    this.destroy.onDestroy(() => {
      destroyed = true; mutations.disconnect(); resize?.disconnect(); window.removeEventListener('resize', schedule);
      window.cancelAnimationFrame(frame);
      for (const [field, entry] of entries) { field.removeEventListener('change', entry.change); entry.label.remove(); }
    });
  }
}
