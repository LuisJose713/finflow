import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { Transaction } from '../../../core/models';
import { TransactionService } from '../../../core/services/transaction.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { ToastService } from '../../../core/services/toast.service';
import { RecentTransactionsComponent } from './recent-transactions.component';

describe('RecentTransactionsComponent', () => {
  let fixture: ComponentFixture<RecentTransactionsComponent>;
  let component: RecentTransactionsComponent;
  let service: jasmine.SpyObj<TransactionService>;
  let toast: jasmine.SpyObj<ToastService>;
  let requests: Subject<Transaction[]>[];
  let deletion: Subject<void>;
  const transaction: Transaction = {
    id: 'tx-1', userId: 1, amount: 125, type: 'expense', categoryId: 1,
    description: 'Compra de prueba', date: '2026-11-10', currency: 'USD',
    status: 'completed', createdAt: '2026-11-10T12:00:00Z',
  };

  function respond(data: Transaction[], request = requests[requests.length - 1]): void {
    request.next(data);
    request.complete();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    requests = [];
    deletion = new Subject<void>();
    service = jasmine.createSpyObj<TransactionService>('TransactionService', ['getRecent', 'delete']);
    service.getRecent.and.callFake(() => {
      const request = new Subject<Transaction[]>();
      requests.push(request);
      return request.asObservable();
    });
    service.delete.and.returnValue(deletion.asObservable());
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    await TestBed.configureTestingModule({
      imports: [RecentTransactionsComponent],
      providers: [
        provideRouter([]),
        { provide: TransactionService, useValue: service },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RecentTransactionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('distinguishes a request error from an empty account and offers a working retry', () => {
    requests[0].error(new Error('offline'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No hay transacciones aún');
    fixture.nativeElement.querySelector('.state-action').click();
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    respond([transaction]);

    expect(component.loadError()).toBeFalse();
    expect(fixture.nativeElement.querySelector('ul.list')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain(transaction.description);
  });

  it('shows an actionable empty state only for a successful empty response', () => {
    respond([]);
    expect(fixture.nativeElement.textContent).toContain('No hay transacciones aún');
    expect(fixture.nativeElement.querySelector('.empty-state a').getAttribute('href')).toBe('/transactions');
    expect(component.loadError()).toBeFalse();
  });

  it('treats a malformed successful response as a loading error', () => {
    respond(null as any);
    expect(component.loadError()).toBeTrue();
    expect(component.loading()).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('No hay transacciones aún');
  });

  it('respects the currency of each recorded transaction', () => {
    respond([transaction]);
    expect(fixture.nativeElement.querySelector('.tx-amount').textContent).toContain('USD');
    expect(fixture.nativeElement.querySelector('.tx-amount').textContent).not.toContain('COP');
  });

  it('cancels an older refresh before accepting the newest movements', () => {
    const stale = requests[0];
    TestBed.inject(DashboardRefreshService).trigger();
    fixture.detectChanges();

    expect(stale.observed).toBeFalse();
    expect(component.loading()).toBeTrue();
    respond([transaction]);
    stale.next([]);
    stale.error(new Error('stale failure'));

    expect(component.transactions()).toEqual([transaction]);
    expect(component.loadError()).toBeFalse();
  });

  it('prevents repeated delete requests and exposes the pending state accessibly', () => {
    respond([transaction]);
    const confirmation = spyOn(window, 'confirm').and.returnValue(true);
    component.confirmDelete(transaction);
    component.confirmDelete(transaction);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-delete');
    expect(button.disabled).toBeTrue();
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(confirmation).toHaveBeenCalledTimes(1);
    expect(service.delete).toHaveBeenCalledOnceWith(transaction.id);
  });

  it('keeps the row and allows retry when a deletion fails', () => {
    respond([transaction]);
    spyOn(window, 'confirm').and.returnValue(true);
    component.confirmDelete(transaction);
    deletion.error(new Error('offline'));
    fixture.detectChanges();

    expect(component.transactions()).toEqual([transaction]);
    expect(component.deletingIds().size).toBe(0);
    expect(fixture.nativeElement.querySelector('.btn-delete').disabled).toBeFalse();
    expect(toast.error).toHaveBeenCalledWith('No se pudo eliminar');
    expect(service.getRecent).toHaveBeenCalledTimes(1);
  });

  it('prevents a request started before deletion from restoring the removed row', () => {
    respond([transaction]);
    component.load();
    const stale = requests[1];
    spyOn(window, 'confirm').and.returnValue(true);
    const deleted = jasmine.createSpy('deleted');
    component.deleted.subscribe(deleted);
    component.confirmDelete(transaction);
    deletion.next();
    deletion.complete();

    expect(stale.observed).toBeFalse();
    stale.next([transaction]);
    stale.complete();
    expect(component.transactions()).toEqual([]);
    expect(deleted).toHaveBeenCalledOnceWith(transaction.id);
    expect(toast.success).toHaveBeenCalledWith('Transacción eliminada');
    fixture.detectChanges();
    expect(requests.length).toBe(3);
    respond([]);
    expect(fixture.nativeElement.textContent).toContain('No hay transacciones aún');
  });

  it('does not send a deletion when the confirmation is dismissed', () => {
    spyOn(window, 'confirm').and.returnValue(false);
    component.confirmDelete(transaction);
    expect(service.delete).not.toHaveBeenCalled();
    expect(component.deletingIds().size).toBe(0);
  });

  it('cancels both loading and deletion subscriptions when destroyed', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.confirmDelete(transaction);
    fixture.destroy();

    expect(requests[0].observed).toBeFalse();
    expect(deletion.observed).toBeFalse();
    deletion.next();
    requests[0].next([transaction]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(component.transactions()).toEqual([]);
  });
});
