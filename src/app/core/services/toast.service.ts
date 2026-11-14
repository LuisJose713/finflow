import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly defaultDurationMs = 4000;
  private readonly maxVisibleToasts = 2;
  private readonly lastShown = new Map<string, number>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    const now = Date.now();
    // Ignore repetitions for four seconds, even if the user closes one early.
    for (const [key, timestamp] of this.lastShown) {
      if (now - timestamp >= this.defaultDurationMs) this.lastShown.delete(key);
    }
    const key = type + ':' + cleanMessage;
    if (this.lastShown.has(key)) return;
    this.lastShown.set(key, now);

    // No toast can remain pinned indefinitely, including errors (duration 0).
    const visibleFor = Number.isFinite(duration) && duration > 0
      ? Math.min(duration, this.defaultDurationMs) : this.defaultDurationMs;
    const toast: Toast = {
      id: crypto.randomUUID(),
      message: cleanMessage,
      type,
      duration: visibleFor,
    };
    const current = this._toasts();
    if (current.length >= this.maxVisibleToasts) this.dismiss(current[0].id);
    this._toasts.update(items => [...items, toast]);
    this.timers.set(toast.id, setTimeout(() => this.dismiss(toast.id), visibleFor));
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error'); }
  warning(message: string): void { this.show(message, 'warning'); }

  dismiss(id: string): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) clearTimeout(timer);
    this.timers.delete(id);
    this._toasts.update(items => items.filter(toast => toast.id !== id));
  }
}
