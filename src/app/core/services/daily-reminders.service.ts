import { Injectable, signal } from '@angular/core';

type ReminderSlot = { hour: number; title: string; body: string; url: string };
const DAILY: ReminderSlot[] = [
  {
    hour: 10,
    title: 'Es hora de registrar tus movimientos',
    body: 'Mantén tus finanzas al día. Registra tus ingresos y gastos.',
    url: '/transactions'
  },
  {
    hour: 16,
    title: '¿Cuánto has gastado hoy?',
    body: 'Consulta el resumen de tus gastos de hoy en FinFlow.',
    url: '/dashboard'
  }
];

/**
 * Browser-open reminders only. Closed-browser/PWA push requires a dedicated
 * authenticated server push subscription and job scheduler.
 */
@Injectable({ providedIn: 'root' })
export class DailyRemindersService {
  readonly supported = typeof window !== 'undefined' && 'Notification' in window;
  readonly enabled = signal(false);
  readonly permission = signal<NotificationPermission>(
    this.supported ? Notification.permission : 'denied'
  );
  private userId: string | null = null;
  private timer?: ReturnType<typeof setInterval>;

  start(userId: string | null): void {
    if (this.userId === userId) return;
    this.stop();
    this.userId = userId;
    if (!userId || !this.supported) return;
    const preferred = this.read(this.preferenceKey(userId)) === 'true';
    this.enabled.set(preferred && Notification.permission === 'granted');
    this.permission.set(Notification.permission);
    this.timer = setInterval(() => { void this.tick(); }, 20_000);
    void this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.userId = null;
    this.enabled.set(false);
  }

  async enable(): Promise<boolean> {
    if (!this.userId || !this.supported) return false;
    // Called directly from a user click: required by browsers / iOS installed PWAs.
    const permission = await Notification.requestPermission();
    this.permission.set(permission);
    const ok = permission === 'granted';
    this.write(this.preferenceKey(this.userId), String(ok));
    this.enabled.set(ok);
    if (ok) {
      await this.ensureWorker();
      await this.tick();
    }
    return ok;
  }

  disable(): void {
    if (this.userId) this.write(this.preferenceKey(this.userId), 'false');
    this.enabled.set(false);
  }

  private async tick(): Promise<void> {
    const id = this.userId;
    if (!id || !this.enabled() || Notification.permission !== 'granted') return;
    const now = new Date();
    const slot = DAILY.find(item => now.getHours() === item.hour && now.getMinutes() < 5);
    if (!slot) return;
    const today = [now.getFullYear(), now.getMonth() + 1, now.getDate()].join('-');
    const stamp = `finflow.reminder.sent.${id}.${today}.${slot.hour}`;
    if (this.read(stamp)) return;
    // Commit the local marker before display so a late tab wake cannot duplicate it.
    this.write(stamp, '1');
    try {
      const registration = await this.ensureWorker();
      if (registration?.showNotification) {
        await registration.showNotification(slot.title, {
          body: slot.body,
          icon: '/icons/finflow-192.png',
          badge: '/icons/finflow-192.png',
          tag: `finflow-daily-${slot.hour}`,
          data: { url: slot.url }
        });
      } else {
        const notification = new Notification(slot.title, {
          body: slot.body,
          icon: '/icons/finflow-192.png',
          tag: `finflow-daily-${slot.hour}`
        });
        notification.onclick = () => { window.focus(); location.assign(slot.url); };
      }
    } catch {
      // Do not pretend delivery succeeded when browser notifications are unavailable.
      this.write(stamp, '');
    }
  }

  private async ensureWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    try {
      return await navigator.serviceWorker.register('/finflow-notifications-sw.js');
    } catch {
      return null;
    }
  }

  private preferenceKey(id: string): string { return `finflow.reminder.enabled.${id}`; }
  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  private write(key: string, value: string): void {
    try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key); }
    catch { /* Storage may be unavailable in private browsing. */ }
  }
}
