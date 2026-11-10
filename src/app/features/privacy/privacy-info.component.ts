import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import {
  PrivacyConsentReceipt,
  PrivacyPolicy,
  PrivacyRightsRequest,
  PrivacyService,
  PrivacyStatus
} from '../../core/services/privacy.service';
import { PrivacyPolicyComponent } from '../../shared/components/privacy-policy.component';

@Component({
    selector: 'app-privacy-info',
    imports: [RouterLink, FormsModule, PrivacyPolicyComponent],
    templateUrl: './privacy-info.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './privacy-info.component.scss'
})
export class PrivacyInfoComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly privacy = inject(PrivacyService);
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly policy = signal<PrivacyPolicy | null>(null);
  readonly status = signal<PrivacyStatus | null>(null);
  readonly receipts = signal<PrivacyConsentReceipt[]>([]);
  readonly requests = signal<PrivacyRightsRequest[]>([]);
  readonly loading = signal(false);
  readonly message = signal('');
  readonly error = signal('');

  marketingConsent = false;
  requestType: PrivacyRightsRequest['request_type'] = 'ACCESS';
  requestDescription = '';

  ngOnInit() {
    this.privacy.policy().subscribe({
      next: result => this.policy.set(result),
      error: () => this.error.set('No pudimos cargar la versión de la política.')
    });
    if (this.isAuthenticated()) this.refreshPrivateData();
  }

  refreshPrivateData() {
    this.privacy.status().subscribe({
      next: result => {
        this.status.set(result);
        this.marketingConsent = result.marketingConsent;
      },
      error: () => this.error.set('No pudimos consultar tu historial de autorizaciones.')
    });
    this.privacy.receipt().subscribe({
      next: result => this.receipts.set(result.consents),
      error: () => {}
    });
    this.privacy.rightsRequests().subscribe({
      next: result => this.requests.set(result),
      error: () => {}
    });
  }

  saveMarketing() {
    if (this.loading() || !this.status()?.accepted) return;
    this.loading.set(true);
    this.message.set('');
    this.error.set('');
    this.privacy.updateMarketing(this.marketingConsent).subscribe({
      next: () => {
        this.message.set('Tu preferencia de comunicaciones comerciales quedó registrada.');
        this.loading.set(false);
        this.refreshPrivateData();
      },
      error: () => {
        this.error.set('No se pudo guardar la preferencia. Inténtalo nuevamente.');
        this.loading.set(false);
      }
    });
  }

  submitRightsRequest() {
    if (this.loading() || this.requestDescription.trim().length > 500) return;
    this.loading.set(true);
    this.message.set('');
    this.error.set('');
    this.privacy.rightsRequest(this.requestType, this.requestDescription.trim()).subscribe({
      next: result => {
        this.message.set('Solicitud #' + result.id + ' registrada. Su atención no es automática.');
        this.requestDescription = '';
        this.loading.set(false);
        this.refreshPrivateData();
      },
      error: () => {
        this.error.set('No se pudo registrar la solicitud. Inténtalo nuevamente.');
        this.loading.set(false);
      }
    });
  }
}
