import { Injectable, signal } from '@angular/core';

export type DisplayCurrency = 'COP' | 'USD' | 'EUR' | 'GBP' | 'MXN' | 'BRL' | 'CAD';
export interface CurrencyQuote { code: DisplayCurrency; rate: number; date: string | null; }
export const CURRENCIES: ReadonlyArray<{ code: DisplayCurrency; label: string }> = [
  { code: 'COP', label: 'COP · Peso colombiano' },
  { code: 'USD', label: 'USD · Dólar estadounidense' },
  { code: 'EUR', label: 'EUR · Euro' },
  { code: 'GBP', label: 'GBP · Libra esterlina' },
  { code: 'MXN', label: 'MXN · Peso mexicano' },
  { code: 'BRL', label: 'BRL · Real brasileño' },
  { code: 'CAD', label: 'CAD · Dólar canadiense' },
];
const BASE: CurrencyQuote = { code: 'COP', rate: 1, date: null };
export const activeCurrencyQuote = signal<CurrencyQuote>(BASE);
export function convertForDisplay(amount: number, source: string, quote: CurrencyQuote): { amount: number; currency: string } {
  const normalized = /^[A-Z]{3}$/.test((source || '').trim().toUpperCase()) ? source.trim().toUpperCase() : 'COP';
  if (!Number.isFinite(amount)) return { amount, currency: normalized };
  // Never relabel or convert amounts whose true source isn't COP.
  if (normalized !== 'COP' || quote.code === 'COP' || !Number.isFinite(quote.rate) || quote.rate <= 0) {
    return { amount, currency: normalized };
  }
  return { amount: amount * quote.rate, currency: quote.code };
}

@Injectable({ providedIn: 'root' })
export class CurrencyDisplayService {
  readonly quote = activeCurrencyQuote.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');
  readonly options = CURRENCIES;
  private owner: string | null = null;
  private requestId = 0;

  load(owner: string | number | null): void {
    const key = owner == null ? null : String(owner);
    if (this.owner === key) return;
    this.owner = key;
    this.requestId++;
    activeCurrencyQuote.set(BASE);
    this.error.set('');
    if (!key) return;
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey(key)) || 'null');
      if (saved && CURRENCIES.some(v => v.code === saved.code) && saved.code !== 'COP') {
        if (this.valid(saved) && typeof saved.fetchedAt === 'number' && Date.now() - saved.fetchedAt < 72 * 60 * 60 * 1000) {
          activeCurrencyQuote.set({ code: saved.code as DisplayCurrency, rate: saved.rate, date: saved.date });
        }
        void this.select(saved.code as DisplayCurrency);
      }
    } catch { /* Browsers can deny local storage. COP remains safe. */ }
  }

  async select(code: DisplayCurrency): Promise<void> {
    if (!CURRENCIES.some(v => v.code === code)) return;
    const id = ++this.requestId;
    const owner = this.owner;
    this.error.set('');
    if (code === 'COP') {
      activeCurrencyQuote.set(BASE);
      this.save(owner, { ...BASE, fetchedAt: Date.now() });
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    try {
      const response = await fetch('https://api.frankfurter.dev/v2/rate/cop/' + code.toLowerCase(), {
        headers: { Accept: 'application/json' }, cache: 'no-store',
      });
      if (!response.ok) throw new Error('Proveedor de divisas no disponible');
      const quote: unknown = await response.json();
      if (!this.valid(quote)) throw new Error('Tasa de cambio no válida');
      if (id !== this.requestId || owner !== this.owner) return;
      const dated = quote as { rate: number; date: string };
      activeCurrencyQuote.set({ code, rate: dated.rate, date: dated.date });
      this.save(owner, { code, rate: dated.rate, date: dated.date, fetchedAt: Date.now() });
    } catch {
      if (id === this.requestId) this.error.set('No pudimos consultar la tasa. La moneda anterior se conserva.');
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }

  private valid(value: any): value is { code?: DisplayCurrency; rate: number; date: string; fetchedAt?: number } {
    return value && typeof value.rate === 'number' && Number.isFinite(value.rate)
      && value.rate > 0 && value.rate < 1000 && typeof value.date === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
      && Date.parse(value.date + 'T00:00:00Z') <= Date.now() + 86400000
      && Date.parse(value.date + 'T00:00:00Z') >= Date.now() - 14 * 86400000;
  }

  private storageKey(owner: string): string { return 'finflow.displayCurrency.' + owner; }
  private save(owner: string | null, data: CurrencyQuote & { fetchedAt: number }): void {
    if (!owner) return;
    try { localStorage.setItem(this.storageKey(owner), JSON.stringify(data)); } catch { /* Cosmetic setting only. */ }
  }
}
