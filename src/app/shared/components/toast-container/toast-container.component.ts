import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container" aria-label="Notificaciones de FinFlow">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="toast.type" [attr.role]="toast.type === 'error' ? 'alert' : 'status'">
          <span class="toast-icon">
            @switch (toast.type) {
              @case ('success') { ✓ }
              @case ('error') { ✕ }
              @case ('warning') { ⚠ }
              @default { ℹ }
            }
          </span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button type="button" class="toast-close" [attr.aria-label]="'Cerrar notificación: ' + toast.message" (click)="toastService.dismiss(toast.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: min(360px, calc(100vw - 2rem));
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 0.625rem;
      font-size: 0.875rem;
      font-weight: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      animation: slideIn 0.2s ease;
      color: #fff;

      &.success { background: var(--success); }
      &.error   { background: var(--danger); }
      &.warning { background: var(--warning); }
      &.info    { background: var(--primary); }
    }

    .toast-msg { flex: 1; overflow-wrap: anywhere; }

    .toast-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.8);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0.5rem;
      margin: -0.5rem;
      min-width: 32px;
      min-height: 32px;
      line-height: 1;

      &:hover { color: #fff; }
      &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; border-radius: 4px; }
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
  `],
})
export class ToastContainerComponent {
  toastService = inject(ToastService);
}
