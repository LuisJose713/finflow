import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, HttpEventType, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { apiDeadlineInterceptor } from './api-deadline.interceptor';

describe('API request deadlines', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([apiDeadlineInterceptor])), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient); requests = TestBed.inject(HttpTestingController);
  });
  afterEach(() => requests.verify({ ignoreCancelled: true }));

  it('ends a stalled write even after Sent and never resends the amount', fakeAsync(() => {
    let error: HttpErrorResponse | undefined;
    const url = environment.apiUrl + '/transactions';
    http.post(url, { amount: 25000 }).subscribe({ error: value => error = value });
    const pending = requests.expectOne(url);
    pending.event({ type: HttpEventType.Sent });
    tick(25001);
    expect(error?.status).toBe(504);
    expect(pending.cancelled).toBeTrue();
    requests.expectNone(url);
  }));

  it('gives reports a longer bounded wait', fakeAsync(() => {
    const url = environment.apiUrl + '/transactions/export/xlsx';
    let failed = false;
    http.get(url, { responseType: 'blob' }).subscribe({ error: () => failed = true });
    const pending = requests.expectOne(url);
    tick(30000); expect(failed).toBeFalse();
    pending.flush(new Blob(['report']));
    tick(100000); expect(failed).toBeFalse();
  }));
});
