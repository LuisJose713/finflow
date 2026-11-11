import { PlannedExpense } from '../../../core/models';

export interface MonthSummary { income: number; expenses: number; balance: number; }

/** Calendar dates deliberately use local components, not a UTC ISO conversion. */
export function calendarKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function summarizeMonth(data: unknown, monthKey: string): MonthSummary {
  if (!Array.isArray(data)) throw new Error('Invalid monthly summary');
  let income = 0;
  let expenses = 0;
  for (const row of data) {
    if (row?.month !== monthKey) continue;
    income += amount(row.income);
    expenses += amount(row.expenses);
  }
  return { income, expenses, balance: income - expenses };
}

function amount(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') {
    throw new Error('Missing financial amount');
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error('Invalid financial amount');
  return parsed;
}

export function dueDateKey(value?: string): string | null {
  const key = value?.slice(0, 10) ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return calendarKey(date) === key ? key : null;
}

export function pendingPayments(data: PlannedExpense[]): PlannedExpense[] {
  return data.filter(item => item.status === 'pending' && !item.executedTransactionId)
    .sort((a, b) => (dueDateKey(a.dueDate) ?? '9999').localeCompare(dueDateKey(b.dueDate) ?? '9999')
      || a.title.localeCompare(b.title));
}
