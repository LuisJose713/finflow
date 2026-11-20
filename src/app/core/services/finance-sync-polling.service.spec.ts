import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { DashboardRefreshService } from './dashboard-refresh.service';
import { FinanceSyncPollingService } from './finance-sync-polling.service';

describe('FinanceSyncPollingService', () => {
  let service: FinanceSyncPollingService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(FinanceSyncPollingService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { service.stop(); http.verify(); });
  it('initializes with only the authenticated owner cursor, never financial payloads', () => {
    service.start('owner-one');
    const request = http.expectOne(environment.apiUrl.replace(/\/$/, '') + '/sync/cursor');
    expect(request.request.method).toBe('GET');
    request.flush({ cursor: 42 });
  });
  it('resets the owner cursor when the logged-in account changes', () => {
    service.start('owner-one');
    http.expectOne(environment.apiUrl.replace(/\/$/, '') + '/sync/cursor').flush({ cursor: 30 });
    service.start('owner-two');
    http.expectOne(environment.apiUrl.replace(/\/$/, '') + '/sync/cursor').flush({ cursor: 0 });
  });
});
