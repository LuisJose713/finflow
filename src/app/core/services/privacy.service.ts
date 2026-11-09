import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '@environments/environment';

export interface PrivacyPolicy {
  version: string;
  effectiveDate: string;
  ready: boolean;
  controllerName: string;
  controllerNit: string;
  contactEmail: string;
  contactAddress: string;
  contactPhone: string;
  rights: string[];
  marketingOptional: boolean;
}
export interface PrivacyStatus {
  accepted: boolean;
  version: string;
  policyReady: boolean;
  marketingConsent: boolean;
  acceptedAt?: string;
}
export interface PrivacyConsentReceipt {
  policy_version: string;
  marketing_opt_in: boolean;
  source: string;
  accepted_at: string;
}
export interface PrivacyRightsRequest {
  id: number;
  request_type: 'ACCESS' | 'RECTIFY' | 'DELETE' | 'REVOKE';
  description: string | null;
  status: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl + '/privacy';

  // Keep a per-tab, per-user onboarding notice until the new account owner
  // sees and dismisses it. This is informational and is NOT consent.
  private readonly noticeStorageKey = 'finflow.signupPrivacyNoticeUserId';
  private readonly _signupNoticeUserId = signal<string | null>(
    sessionStorage.getItem(this.noticeStorageKey)
  );
  readonly signupNoticeUserId = this._signupNoticeUserId.asReadonly();

  queueSignupNotice(userId: string | number) {
    const id = String(userId);
    sessionStorage.setItem(this.noticeStorageKey, id);
    this._signupNoticeUserId.set(id);
  }

  dismissSignupNotice() {
    sessionStorage.removeItem(this.noticeStorageKey);
    this._signupNoticeUserId.set(null);
  }

  policy() {
    return this.http.get<PrivacyPolicy>(this.api + '/policy');
  }
  status() {
    return this.http.get<PrivacyStatus>(this.api + '/status');
  }
  consent(privacyAccepted: boolean, policyVersion: string, marketingConsent: boolean) {
    return this.http.post<{ accepted: boolean; version: string }>(this.api + '/consent', {
      accepted: privacyAccepted,
      policyVersion,
      marketingConsent
    });
  }
  updateMarketing(marketingConsent: boolean) {
    return this.http.post<{ marketingConsent: boolean; saved: boolean }>(this.api + '/marketing', { marketingConsent });
  }
  receipt() {
    return this.http.get<{ consents: PrivacyConsentReceipt[] }>(this.api + '/receipt');
  }
  rightsRequest(type: PrivacyRightsRequest['request_type'], description: string) {
    return this.http.post<{ id: number; status: string; message: string }>(this.api + '/rights-request', {
      type,
      description
    });
  }
  rightsRequests() {
    return this.http.get<PrivacyRightsRequest[]>(this.api + '/rights-requests');
  }
}
