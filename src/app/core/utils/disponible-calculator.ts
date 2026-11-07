/**
 * FinFlow Disponible — read-only estimate, NOT a bank statement.
 * All amounts are COP; integer cents prevent floating-point drift in sums.
 * Do not count future income before it is deposited.
 * Pending recurring entries are not automatically added: they may duplicate
 * planned expenses. Users must mark paid planned expenses as completed.
 */
export interface AvailableAccount {
  balance: number;
  currency: string;
  archived: boolean;
}
export interface AvailableExpense {
  amount: number;
  status: string;
  dueDate?: string | null;
}
export interface AvailableCalculation {
  balanceCop: number;
  pendingCop: number;
  reserveCop: number;
  availableCop: number;
  spendableCop: number;
  daysUntilPayday: number;
  dailyCop: number;
  pendingCount: number;
  unplannedCount: number;
}
export function todayLocalISO(today: Date = new Date()): string {
  const n = (x: number) => String(x).padStart(2, "0");
  return String(today.getFullYear()) + "-" + n(today.getMonth()+1) + "-" + n(today.getDate());
}
export function addLocalDays(day: string, days: number): string {
  const date = parseDayUTC(day);
  if (!date) return "";
  return new Date(date + days * 86400000).toISOString().slice(0,10);
}
function parseDayUTC(day: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!m) return null;
  const year=Number(m[1]), month=Number(m[2]), date=Number(m[3]);
  const parsed = Date.UTC(year,month-1,date);
  const test = new Date(parsed);
  return test.getUTCFullYear()===year && test.getUTCMonth()+1===month && test.getUTCDate()===date ? parsed : null;
}
function cents(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 1e12) return 0;
  return Math.round(value*100);
}
/** A valid next-payday date must fall after the current day, within one year. */
export function calculateAvailable(
  accounts: readonly AvailableAccount[],
  expenses: readonly AvailableExpense[],
  reserveCop: number,
  nextPayday: string,
  today: string = todayLocalISO()
): AvailableCalculation | null {
  const t=parseDayUTC(today), p=parseDayUTC(nextPayday);
  if(t===null || p===null || p<=t || p-t>366*86400000) return null;
  if(!Number.isFinite(reserveCop) || reserveCop < 0 || reserveCop>1e12) return null;
  const active=accounts.filter(a=>!a.archived && a.currency.trim().toUpperCase()==="COP");
  const balanceCents=active.reduce((s,a)=>s+Math.round(Number(a.balance)*100),0);
  if (!Number.isSafeInteger(balanceCents)) return null;
  let pendingCents=0,pendingCount=0,unplannedCount=0;
  for(const e of expenses){
    if(e.status?.toLowerCase()!=="pending") continue;
    if(!e.dueDate){unplannedCount++;continue;}
    const due=parseDayUTC(e.dueDate.slice(0,10));
    if(due===null){unplannedCount++;continue;}
    if(due>=p) continue; // Payday itself is in the next period.
    pendingCents+=cents(Number(e.amount)); pendingCount++;
  }
  const reserveCents=cents(reserveCop);
  const availableCents=balanceCents-pendingCents-reserveCents;
  if (![pendingCents,availableCents].every(Number.isSafeInteger)) return null;
  const dayCount=Math.round((p-t)/86400000);
  return {
    balanceCop:balanceCents/100,pendingCop:pendingCents/100,reserveCop:reserveCents/100,
    availableCop:availableCents/100,spendableCop:Math.max(0,availableCents)/100,
    daysUntilPayday:dayCount,dailyCop:Math.floor(Math.max(0,availableCents)/dayCount)/100,
    pendingCount,unplannedCount
  };
}
