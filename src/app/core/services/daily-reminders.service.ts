import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Injectable, signal } from '@angular/core';

/**
 * Server-managed Web Push for authenticated users. Browser permission does
 * not prove an active subscription; verify it before reporting enabled.
 */
@Injectable({ providedIn: 'root' })
export class DailyRemindersService {
  private readonly http = inject(HttpClient);
  private readonly pushApi = environment.apiUrl + '/notifications/push';
  readonly supported = typeof window !== 'undefined' && 'Notification' in window;
  readonly enabled = signal(false);
  readonly permission = signal<NotificationPermission>(
    this.supported ? Notification.permission : 'denied'
  );
  private userId: string | null = null;
  private readonly allowedEmail = 'stpptx@icloud.com';

  start(userId: string | null): void {
    if (this.userId === userId) return;
    this.stop();
    this.userId = userId;
    if (!userId || userId.toLowerCase() !== this.allowedEmail || !this.supported) return;
    const preferred = this.read(this.preferenceKey(userId)) === 'true';
    // A saved toggle is not a verified server push subscription.
    this.enabled.set(false);
    if (preferred && Notification.permission === 'granted') void this.restorePushState(userId);
    this.permission.set(Notification.permission);
    // Background delivery is scheduled by the server, not by an open browser tab.
  }

  stop(): void {
    this.userId = null;
    this.enabled.set(false);
  }

  private async restorePushState(user: string): Promise<void> {
    try {
      const registration = await this.ensureWorker();
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription || this.userId !== user) return;
      const config = await firstValueFrom(this.http.get<{enabled:boolean;publicKey:string}>(this.pushApi + '/config'));
      if (this.userId === user && config.enabled && config.publicKey) this.enabled.set(true);
    } catch { /* Do not report stale browser permission as delivered push. */ }
  }

  async enable(): Promise<boolean> {
    if (!this.userId || this.userId.toLowerCase() !== this.allowedEmail || !this.supported) return false;
    // Called directly from a user click: required by browsers / iOS installed PWAs.
    const permission = await Notification.requestPermission();
    this.permission.set(permission);
    const ok = permission === 'granted';
    if (!ok) {
      this.enabled.set(false);
      this.write(this.preferenceKey(this.userId), 'false');
      return false;
    }
    try {
      await this.subscribePush();
      if (!this.userId) return false;
      this.write(this.preferenceKey(this.userId), 'true');
      this.enabled.set(true);
      return true;
    } catch {
      this.enabled.set(false);
      if (this.userId) this.write(this.preferenceKey(this.userId), 'false');
      return false;
    }
  }

  disable(): void {
    if (this.userId) this.write(this.preferenceKey(this.userId), 'false');
    this.enabled.set(false);
    void this.unsubscribePush();
  }

  private async subscribePush(): Promise<void> {
    const registration = await this.ensureWorker();
    if (!registration || !('pushManager' in registration)) throw new Error('Push no disponible');
    const config = await firstValueFrom(this.http.get<{ enabled: boolean; publicKey: string }>(this.pushApi + '/config'));
    if (!config.enabled || !config.publicKey) throw new Error('Servidor Web Push no configurado');
    const key = this.decodeKey(config.publicKey);
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    await firstValueFrom(this.http.post(this.pushApi + '/subscriptions', subscription.toJSON()));
  }

  async testPush(): Promise<number> {
    if (!this.enabled()) throw new Error('Activa las notificaciones primero');
    const result = await firstValueFrom(this.http.post<{ acceptedByPushServices: number }>(this.pushApi + '/test', {}));
    return result.acceptedByPushServices;
  }

  private async unsubscribePush(): Promise<void> {
    const registration = await this.ensureWorker();
    const subscription = await registration?.pushManager?.getSubscription();
    if (!subscription) return;
    try { await firstValueFrom(this.http.request('DELETE', this.pushApi + '/subscriptions', { body: { endpoint: subscription.endpoint } })); }
    finally { await subscription.unsubscribe(); }
  }

  private decodeKey(value: string): Uint8Array<ArrayBuffer> {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
    const raw = atob(padded);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return bytes;
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
