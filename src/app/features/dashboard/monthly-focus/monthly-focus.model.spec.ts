import { PlannedExpense } from '../../../core/models';
import { calendarKey, dueDateKey, pendingPayments, summarizeMonth } from './monthly-focus.model';

describe('Monthly focus financial context', () => {
  it('uses the selected calendar month and keeps a negative balance', () => {
    expect(summarizeMonth([
      { month: '2026-11', income: '100000', expenses: '150000' },
      { month: '2026-10', income: 900000, expenses: 1000 },
    ], '2026-11')).toEqual({ income: 100000, expenses: 150000, balance: -50000 });
  });

  it('shows an empty month independently of historical income', () => {
    expect(summarizeMonth([{ month: '2026-10', income: 200, expenses: 20 }], '2026-11'))
      .toEqual({ income: 0, expenses: 0, balance: 0 });
  });

  it('rejects missing or invalid amounts instead of presenting reassuring zeros', () => {
    for (const income of [null, undefined, '', 'not-a-number', -1, Infinity]) {
      expect(() => summarizeMonth([{ month: '2026-11', income, expenses: 0 }], '2026-11')).toThrow();
    }
    expect(() => summarizeMonth({}, '2026-11')).toThrow();
  });

  it('uses calendar dates and rejects impossible dates', () => {
    expect(calendarKey(new Date(2026, 10, 1, 23, 45))).toBe('2026-11-01');
    expect(dueDateKey('2026-11-01T00:00:00')).toBe('2026-11-01');
    expect(dueDateKey('2026-02-30')).toBeNull();
    expect(dueDateKey('invalid')).toBeNull();
  });

  it('orders pending payments by calendar date and excludes executed and cancelled items', () => {
    const payment = (id: string, extra: Partial<PlannedExpense> = {}): PlannedExpense => ({
      id, userId: 1, title: id, amount: 50000, status: 'pending', createdAt: '', ...extra,
    });
    const source = [
      payment('undated'), payment('future', { dueDate: '2026-12-01' }),
      payment('overdue', { dueDate: '2026-10-31' }),
      payment('done', { status: 'done' }), payment('cancelled', { status: 'cancelled' }),
      payment('executed', { executedTransactionId: 'transaction-1' }),
    ];
    expect(pendingPayments(source).map(item => item.id)).toEqual(['overdue', 'future', 'undated']);
    expect(source[0].id).toBe('undated');
  });
});
