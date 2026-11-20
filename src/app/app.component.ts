import { DashboardRefreshService } from './core/services/dashboard-refresh.service';
import { FinanceSyncPollingService } from './core/services/finance-sync-polling.service';
import { SelectReadabilityService } from './core/services/select-readability.service';
import { DailyRemindersService } from './core/services/daily-reminders.service';
import { Component, ElementRef, HostListener, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { catchError, filter, forkJoin, of } from 'rxjs';
import { AuthService } from './core/services/auth.service';
import { PrivacyPolicy, PrivacyService } from './core/services/privacy.service';
import { UpdateNoticeComponent } from './shared/components/update-notice.component';
import { ProductTourComponent } from './shared/components/product-tour/product-tour.component';
import { TransactionSpotlightComponent } from './shared/components/transaction-spotlight.component';
import { PrivacyPolicyComponent } from './shared/components/privacy-policy.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, PrivacyPolicyComponent, UpdateNoticeComponent, ProductTourComponent, TransactionSpotlightComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private readonly selectReadability = inject(SelectReadabilityService);
  private readonly financeSync = inject(DashboardRefreshService);
  private readonly remoteSync = inject(FinanceSyncPollingService);
  readonly auth = inject(AuthService);
  private readonly privacy = inject(PrivacyService);
  private readonly reminders = inject(DailyRemindersService);
  private readonly router = inject(Router);
  readonly currentRoute = signal(this.router.url);
  readonly privacyStatusLoaded = signal(false);
  // This describes the education notice revision, not a legal policy version.
  readonly noticeRevision = 'notice-v2';

  readonly needsConsent = signal(false);
  readonly policy = signal<PrivacyPolicy | null>(null);
  readonly accepted = signal(false);
  readonly marketing = signal(false);
  readonly saving = signal(false);
  readonly privacyError = signal('');

  // Existing and newly registered accounts see this education notice once
  // for each policy version in this browser. It is NOT consent.
  readonly showSignupNotice = computed(() => {
    const requestedId = this.privacy.signupNoticeUserId();
    const currentUser = this.auth.currentUser();
    const route = this.currentRoute();
    const policy = this.policy();
    this.privacy.noticeRevision();

    if (!this.auth.isAuthenticated() || !route.startsWith('/dashboard')
        || this.needsConsent()) {
      return false;
    }

    // The informational notice must not depend on /privacy/status succeeding.
    // For a published policy, wait for the actual consent status first.
    if (policy?.ready && !this.privacyStatusLoaded()) return false;

    const userIdentity = currentUser?.id || currentUser?.email;
    if (!userIdentity) return false;
    const version = (policy?.version || '2026-11-09-v1') + ':' + this.noticeRevision;
    const preview = /(?:[?&])privacy=1(?:&|$)/.test(route);

    // Show the informational onboarding notice only when registration explicitly
    // queued it for this account. Existing users must not see it at every login.
    // Preview remains available for QA and never records legal consent.
    const queuedForCurrentUser = requestedId != null
      && String(requestedId) === String(userIdentity);
    return preview || (queuedForCurrentUser
      && !this.privacy.isNoticeAcknowledged(userIdentity, version));
  });
  @ViewChild('signupDialog') private signupDialog?: ElementRef<HTMLElement>;

  dismissSignupNotice() {
    const user = this.auth.currentUser();
    const userIdentity = user?.id || user?.email;
    const version = (this.policy()?.version || '2026-11-09-v1') + ':' + this.noticeRevision;
    if (userIdentity) {
      this.privacy.acknowledgeNotice(userIdentity, version);
    } else {
      this.privacy.dismissSignupNotice();
    }
    // Remove preview query so the modal actually stays dismissed.
    if (/(?:[?&])privacy=1(?:&|$)/.test(this.currentRoute())) {
      void this.router.navigate([], {
        queryParams: { privacy: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleSignupNoticeKeyboard(event: KeyboardEvent) {
    if (!this.showSignupNotice() || this.needsConsent()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.dismissSignupNotice();
      return;
    }
    if (event.key !== 'Tab') return;
    const dialog = this.signupDialog?.nativeElement;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex="0"]'
    )).filter(element => element.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  constructor() {
    this.auth.ensureSession().subscribe();
    effect(onCleanup => {
      const user = this.auth.currentUser();
      if (!this.auth.isAuthenticated() || !user?.id) {
        this.financeSync.stop();
        this.remoteSync.stop();
        return;
      }
      this.financeSync.start();
      this.remoteSync.start(String(user.id));
      onCleanup(() => { this.financeSync.stop(); this.remoteSync.stop(); });
    });
    effect(() => {
      const user = this.auth.currentUser();
      this.reminders.start(this.auth.isAuthenticated() && user?.email ? String(user.email).toLowerCase() : null);
    });
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.currentRoute.set(event.urlAfterRedirects));
    effect(() => {
      if (this.showSignupNotice() && !this.needsConsent()) {
        setTimeout(() => {
          if (this.showSignupNotice()) {
            this.signupDialog?.nativeElement.querySelector<HTMLElement>(
              '[data-signup-dismiss]'
            )?.focus();
          }
        }, 0);
      }
    });
    effect(onCleanup => {
      const token = this.auth.isAuthenticated();
      this.needsConsent.set(false);
      this.privacyStatusLoaded.set(false);
      this.accepted.set(false);
      this.privacyError.set('');
      if (!token) return;
      const sub = forkJoin({
        status: this.privacy.status().pipe(catchError(() => of(null))),
        policy: this.privacy.policy().pipe(catchError(() => of(null)))
      }).subscribe({
        next: ({ status, policy }) => {
          this.policy.set(policy);
          // Only a successful check with a published policy can open the
          // authorization dialog. The backend still enforces consent.
          this.needsConsent.set(Boolean(policy?.ready && status?.policyReady && !status.accepted));
          this.privacyStatusLoaded.set(true);
        },
        error: () => {
          // Do not suppress the informational notice when an API is down.
          this.privacyStatusLoaded.set(true);
        }
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  confirmConsent() {
    const policy = this.policy();
    if (!policy?.ready || !this.accepted() || this.saving()) return;
    this.privacyError.set('');
    this.saving.set(true);
    this.privacy.consent(true, policy.version, this.marketing()).subscribe({
      next: () => {
        const user = this.auth.currentUser();
        if (user) this.privacy.acknowledgeNotice(user.id || user.email, policy.version + ':' + this.noticeRevision);
        this.needsConsent.set(false);
        this.saving.set(false);
      },
      error: () => {
        this.privacyError.set('No se pudo guardar la autorización. Inténtalo nuevamente.');
        this.saving.set(false);
      }
    });
  }
}
