import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MonthlyFocusComponent } from './monthly-focus.component';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { calendarKey } from './monthly-focus.model';

describe('MonthlyFocusComponent', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MonthlyFocusComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('keeps monthly data visible when payments fail and allows an independent retry', () => {
    const fixture = TestBed.createComponent(MonthlyFocusComponent);
    fixture.detectChanges();
    http.expectOne(request => request.url.endsWith('/transactions/monthly-stats')).flush([
      { month: calendarKey(new Date()).slice(0, 7), income: 100, expenses: 150 },
    ]);
    http.expectOne(request => request.url.endsWith('/planned-expenses'))
      .flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.componentInstance.summary()?.balance).toBe(-50);
    expect(fixture.nativeElement.textContent).toContain('No pudimos consultar tus pagos');
    expect(fixture.nativeElement.textContent).toContain('más gastos que ingresos');
    fixture.componentInstance.loadPayments();
    http.expectOne(request => request.url.endsWith('/planned-expenses')).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Planear un gasto');
    http.expectNone(request => request.url.endsWith('/transactions/monthly-stats'));
  });

  it('cancels old responses when transactions trigger a refresh', () => {
    const fixture = TestBed.createComponent(MonthlyFocusComponent);
    fixture.detectChanges();
    const oldMonth = http.expectOne(request => request.url.endsWith('/transactions/monthly-stats'));
    const oldPayments = http.expectOne(request => request.url.endsWith('/planned-expenses'));
    TestBed.inject(DashboardRefreshService).trigger();
    fixture.detectChanges();
    expect(oldMonth.cancelled).toBeTrue();
    expect(oldPayments.cancelled).toBeTrue();
    http.expectOne(request => request.url.endsWith('/transactions/monthly-stats')).flush([]);
    http.expectOne(request => request.url.endsWith('/planned-expenses')).flush([]);
  });
});
