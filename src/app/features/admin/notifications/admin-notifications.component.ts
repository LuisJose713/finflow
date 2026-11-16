import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timer } from 'rxjs';
import { NotificationAdminService, NotificationCampaignList } from '../../../core/services/notification-admin.service';

export function colombiaSchedule(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value + ':00-05:00');
  if (!Number.isFinite(date.getTime())) return null;
  const local = new Date(date.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
  return local === value ? date.toISOString() : null;
}

@Component({
  selector: 'app-admin-notifications', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './admin-notifications.component.html', styleUrl: './admin-notifications.component.scss',
})
export class AdminNotificationsComponent implements OnInit {
  private readonly api = inject(NotificationAdminService);
  private readonly destroyRef = inject(DestroyRef);
  readonly data = signal<NotificationCampaignList | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly cancelling = signal<string | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  title = ''; body = ''; audience: 'SELF' | 'ALL' = 'SELF'; when = '';
  ngOnInit(): void {
    timer(0, 30_000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refresh());
  }
  refresh(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.api.list().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))).subscribe({
      next: data => this.data.set(data),
      error: () => this.error.set('No pudimos consultar los mensajes. Vuelve a intentarlo.'),
    });
  }
  schedule(): void {
    if (this.saving()) return;
    const scheduledAt = colombiaSchedule(this.when);
    this.error.set(''); this.message.set('');
    if (!this.title.trim() || !this.body.trim() || !scheduledAt || Date.parse(scheduledAt) < Date.now() + 30_000) {
      this.error.set('Completa el mensaje y elige una fecha futura en hora de Colombia.'); return;
    }
    this.saving.set(true);
    this.api.schedule({ title: this.title.trim(), body: this.body.trim(), audience: this.audience, scheduledAt })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
        next: () => { this.title = ''; this.body = ''; this.when = ''; this.message.set('Mensaje programado. Puedes cancelarlo antes del envío.'); this.refresh(); },
        error: error => this.error.set(error.error?.error || 'No pudimos programar el mensaje.'),
      });
  }
  cancel(id: string): void {
    if (this.cancelling()) return;
    this.cancelling.set(id); this.error.set(''); this.message.set('');
    this.api.cancel(id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.cancelling.set(null))).subscribe({
      next: () => { this.message.set('Mensaje cancelado.'); this.refresh(); },
      error: error => this.error.set(error.error?.error || 'No pudimos cancelar el mensaje.'),
    });
  }
  status(value: string): string {
    return ({ SCHEDULED: 'Programado', SENDING: 'Procesando', SENT: 'Procesado', FAILED: 'Con error', CANCELLED: 'Cancelado' } as Record<string, string>)[value] || value;
  }
}
