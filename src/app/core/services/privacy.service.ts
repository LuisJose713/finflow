import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
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
