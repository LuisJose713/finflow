import { Component, inject } from '@angular/core';
import { WebUpdateService } from '../../core/services/web-update.service';

@Component({
  selector: 'app-update-notice', standalone: true,
  template: `@if (updates.available()) {
    <aside role="status" aria-live="polite" aria-label="Actualización de FinFlow">
      <strong>Hay una nueva versión de FinFlow</strong>
      <p>Guarda lo que estés editando antes de actualizar.</p>
      <div><button type="button" (click)="updates.reload()">Actualizar</button>
      <button type="button" class="later" (click)="updates.dismiss()">Más tarde</button></div>
    </aside>
  }`,
  styles: [`
    aside{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:max(90px,calc(24px + env(safe-area-inset-bottom)));z-index:1500;box-sizing:border-box;width:min(360px,calc(100vw - 32px));padding:18px;border:1px solid #c9a56780;border-radius:18px;background:var(--bg-primary,#0e1c30);color:var(--text-primary,#f7f3e9);box-shadow:0 12px 40px #0004;font-size:.9rem}
    strong{display:block;line-height:1.45}p{color:var(--text-secondary,#aebed2);font-size:.8rem;line-height:1.5;margin:6px 0 14px}div{display:flex;gap:8px;flex-wrap:wrap}
    button{min-height:44px;padding:8px 16px;border:1px solid #c9a567;border-radius:10px;background:#c9a567;color:#0a1729;font:inherit;font-weight:650;cursor:pointer}.later{color:inherit;border-color:var(--border,#526174);background:transparent}button:focus-visible{outline:3px solid #c9a567;outline-offset:3px}
  `],
})
export class UpdateNoticeComponent { readonly updates = inject(WebUpdateService); }
