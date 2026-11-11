import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { TransactionService } from '../../../core/services/transaction.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { OverviewComponent } from './overview.component';

describe('OverviewComponent', () => {
  let fixture: ComponentFixture<OverviewComponent>;
  let component: OverviewComponent;
  let service: jasmine.SpyObj<TransactionService>;
  let requests: Subject<any[]>[];

  function monthKey(monthsAgo = 0): string {
    const today = new Date();
    const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function respond(data: any[], request = requests[requests.length - 1]): void {
    request.next(data);
    request.complete();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    requests = [];
    service = jasmine.createSpyObj<TransactionService>('TransactionService', ['getMonthlyStats']);
    service.getMonthlyStats.and.callFake(() => {
      const request = new Subject<any[]>();
      requests.push(request);
      return request.asObservable();
    });
    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [provideRouter([]), { provide: TransactionService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(OverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows a real empty state instead of a synthetic zero chart', () => {
    respond([]);

    expect(component.chartPoints()).toEqual([]);
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Tu actividad aparecerá aquí');
    expect(fixture.nativeElement.querySelector('.chart-empty a').getAttribute('href')).toBe('/transactions');
  });

  it('fills missing months only when the selected period has actual activity', () => {
    respond([{ month: monthKey(2), income: '500', expenses: 125 }]);

    expect(component.chartPoints().length).toBe(6);
    expect(component.chartPoints().filter(point => point.income > 0).length).toBe(1);
    expect(component.totalIncome()).toBe(500);
    expect(component.totalExpenses()).toBe(125);
    expect(component.netValue()).toBe(375);
    expect(component.loading()).toBeFalse();
  });

  it('offers a wider period when activity exists outside the six month view', () => {
    respond([{ month: monthKey(8), income: 200, expenses: 50 }]);

    expect(component.chartPoints()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No hay actividad en este periodo');
    fixture.nativeElement.querySelector('.chart-empty button').click();
    fixture.detectChanges();

    expect(component.scope()).toBe('year');
    expect(component.chartPoints().length).toBe(12);
    expect(component.totalIncome()).toBe(200);
    expect(service.getMonthlyStats).toHaveBeenCalledTimes(1);
  });

  it('treats zero totals as no activity', () => {
    respond([{ month: monthKey(), income: 0, expenses: 0 }]);

    expect(component.chartPoints()).toEqual([]);
    expect(component.hasHistory()).toBeFalse();
  });

  for (const invalid of [
    null,
    [{ month: '2026-13', income: 100, expenses: 20 }],
    [{ month: '2026-11', income: null, expenses: 20 }],
    [{ month: '2026-11', income: 100, expenses: -20 }],
  ]) {
    it(`shows an error instead of invented financial data for ${JSON.stringify(invalid)}`, () => {
      respond(invalid as any);

      expect(component.loadError()).toBeTrue();
      expect(component.loading()).toBeFalse();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Tu actividad aparecerá aquí');
    });
  }

  it('cancels stale refreshes so they cannot overwrite the latest totals or error state', () => {
    const stale = requests[0];
    TestBed.inject(DashboardRefreshService).trigger();
    fixture.detectChanges();

    expect(stale.observed).toBeFalse();
    expect(component.loading()).toBeTrue();
    respond([{ month: monthKey(), income: 900, expenses: 100 }]);
    stale.next([{ month: monthKey(), income: 1, expenses: 0 }]);
    stale.error(new Error('stale failure'));

    expect(component.totalIncome()).toBe(900);
    expect(component.loadError()).toBeFalse();
    expect(component.loading()).toBeFalse();
  });

  it('retains filters on failure and retry', () => {
    component.setScope('year');
    component.setFilter('expense');
    requests[0].error(new Error('offline'));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.retry-btn').click();
    fixture.detectChanges();
    respond([{ month: monthKey(), income: 500, expenses: 100 }]);

    expect(component.scope()).toBe('year');
    expect(component.filter()).toBe('expense');
    expect(component.loadError()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.income-line')).toBeNull();
    expect(fixture.nativeElement.querySelector('.expense-line')).not.toBeNull();
  });

  it('supports keyboard exploration without reloading when a service responds synchronously', () => {
    service.getMonthlyStats.and.returnValue(of([{ month: monthKey(), income: 500, expenses: 100 }]));
    TestBed.inject(DashboardRefreshService).trigger();
    fixture.detectChanges();
    const chart: SVGSVGElement = fixture.nativeElement.querySelector('.trend-chart');
    chart.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();

    expect(component.selectedMonth()).toBe(component.chartPoints()[0].monthKey);
    expect(fixture.nativeElement.querySelector('.selected-values')).not.toBeNull();
    expect(service.getMonthlyStats).toHaveBeenCalledTimes(2);
    const lastButton: HTMLButtonElement = fixture.nativeElement.querySelector('.point-button:last-child');
    expect(lastButton.getAttribute('aria-label')).toContain(String(new Date().getFullYear()));
    lastButton.click();
    fixture.detectChanges();
    expect(component.activePoint()?.income).toBe(500);
    expect(service.getMonthlyStats).toHaveBeenCalledTimes(2);
  });

  it('cancels the active request when the card is destroyed', () => {
    const request = requests[0];
    fixture.destroy();
    expect(request.observed).toBeFalse();
    request.next([{ month: monthKey(), income: 500, expenses: 100 }]);
    expect(component.monthlyData()).toEqual([]);
  });
});
