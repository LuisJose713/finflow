import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AddTransactionComponent } from './add-transaction.component';
import { TransactionService } from '../../../core/services/transaction.service';
import { CategoryService } from '../../../core/services/category.service';
import { AccountService } from '../../../core/services/account.service';
import { ToastService } from '../../../core/services/toast.service';
import { DashboardRefreshService } from '../../../core/services/dashboard-refresh.service';
import { Transaction } from '../../../core/models';

describe('Movement form monetary contract', () => {
  let component: AddTransactionComponent;
  let fixture: ComponentFixture<AddTransactionComponent>;
  let writes: Subject<Transaction>;
  let api: jasmine.SpyObj<TransactionService>;
  const record: Transaction = { id: '7', userId: 777, amount: 1250.5, type: 'expense', categoryId: 10,
    accountId: 20, description: 'Compra', date: '2026-11-12T00:00:00', currency: 'COP', status: 'pending', createdAt: '' };
  beforeEach(() => {
    writes = new Subject<Transaction>();
    api = jasmine.createSpyObj('Transactions', ['create', 'update']);
    api.create.and.returnValue(writes); api.update.and.returnValue(writes);
    TestBed.configureTestingModule({ imports: [AddTransactionComponent], providers: [
      { provide: TransactionService, useValue: api },
      { provide: CategoryService, useValue: { getAll: () => of([{ id: 10, name: 'Compras', type: 'Expense' }]) } },
      { provide: AccountService, useValue: { list: () => of([]) } },
      { provide: ToastService, useValue: jasmine.createSpyObj('Toast', ['success', 'error']) },
      { provide: DashboardRefreshService, useValue: { trigger: jasmine.createSpy('refresh') } },
    ] });
    fixture = TestBed.createComponent(AddTransactionComponent); component = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(() => TestBed.resetTestingModule());
  it('submits COP cents from the real formatted input without multiplying by 100', () => {
    component.open(); fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[formControlName="amount"]') as HTMLInputElement;
    input.value = '1.250,50'; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('blur'));
    component.form.patchValue({ description: 'Compra', categoryId: 10 }); component.onSubmit();
    expect(api.create).toHaveBeenCalledWith(jasmine.objectContaining({ amount: 1250.5, currency: 'COP' }));
    expect(input.value).toBe('1.250,50');
  });
  it('prevents duplicate monetary writes and keeps the form until the response', () => {
    component.open(record); component.onSubmit(); component.onSubmit(); component.close();
    expect(api.update).toHaveBeenCalledTimes(1); expect(component.isOpen()).toBeTrue();
    writes.next(record); expect(component.isOpen()).toBeFalse();
  });
  it('updates the existing record while preserving its pending status and wallet', () => {
    component.open(record); component.onSubmit();
    expect(api.create).not.toHaveBeenCalled();
    expect(api.update).toHaveBeenCalledWith('7', jasmine.objectContaining({ status: 'pending', accountId: 20, amount: 1250.5 }));
  });
});
