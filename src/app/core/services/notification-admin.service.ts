import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface NotificationCampaign {
  id: string; title: string; body: string; audience: 'SELF' | 'ALL'; scheduledAt: string;
  status: 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  acceptedWeb: number; failedWeb: number; nativeDevices: number;
}
export interface NotificationSchedule {
  title: string; body: string; audience: 'SELF' | 'ALL'; scheduledAt: string;
}
export interface NotificationCampaignList {
  capabilities: { webReady: boolean; timezone: string; webSubscriptions: number; nativeDevices: number };
  campaigns: NotificationCampaign[];
}
@Injectable({ providedIn: 'root' })
export class NotificationAdminService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = environment.apiUrl + '/admin/notifications';
  list() { return this.http.get<NotificationCampaignList>(this.endpoint); }
  schedule(input: NotificationSchedule) { return this.http.post<NotificationCampaign>(this.endpoint, input); }
  cancel(id: string) { return this.http.delete<void>(this.endpoint + '/' + encodeURIComponent(id)); }
}
