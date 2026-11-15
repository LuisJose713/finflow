import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  // Never convert sums which are already in non-COP, nor mutate ledger figures.
  if (normalized !== 'COP' || quote.code === 'COP' || !Number.isFinite(quote.rate) || quote.rate <= 0) {
    return { amount, currency: normalized };
  }
  return { amount: amount * quote.rate, currency: quote.code };
}

interface StoredQuote extends CurrencyQuote { fetchedAt: number; }
interface FxResponse { base: string; quote: string; rate: number; date: string }

@Injectable({ providedIn: 'root' })
export class CurrencyDisplayService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = environment.apiUrl + '/preferences/currency';
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
    const id = ++this.requestId;
    this.error.set('');
    this.loading.set(false);
    activeCurrencyQuote.set(BASE);
    if (!key) return;
    const cache = this.readCache(key);
    if (cache) activeCurrencyQuote.set(cache);
    void this.restoreFromAccount(key, id);
  }

  async select(code: DisplayCurrency): Promise<void> {
    if (!CURRENCIES.some(c => c.code === code) || !this.owner) return;
    const id = ++this.requestId;
    const owner = this.owner;
    this.error.set('');
    this.loading.set(true);
    try {
      // Obtain the quote first; never persist a currency that cannot be shown safely.
      const quote = code === 'COP' ? BASE : await this.fetchQuote(code);
      if (id !== this.requestId || this.owner !== owner) return;
      const saved = await firstValueFrom(this.http.put<{currency: string}>(this.endpoint, { currency: code }));
      if (id !== this.requestId || this.owner !== owner) return;
      if (saved.currency !== code) throw new Error('Unexpected server preference');
      activeCurrencyQuote.set(quote);
      this.writeCache(owner, { ...quote, fetchedAt: Date.now() });
    } catch {
      if (id === this.requestId) this.error.set('No se pudo guardar tu moneda predeterminada. Se conserva la anterior.');
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }

  private async restoreFromAccount(owner: string, id: number): Promise<void> {
    try {
      const value = await firstValueFrom(this.http.get<{currency: string}>(this.endpoint));
      if (id !== this.requestId || this.owner !== owner) return;
      const selected = CURRENCIES.find(c => c.code === value.currency)?.code ?? 'COP';
      if (selected === 'COP') {
        activeCurrencyQuote.set(BASE);
        this.writeCache(owner, { ...BASE, fetchedAt: Date.now() });
        return;
      }
      const cache = this.readCache(owner);
      if (cache?.code === selected) activeCurrencyQuote.set(cache);
      else activeCurrencyQuote.set(BASE);
      try {
        const quote = await this.fetchQuote(selected);
        if (id !== this.requestId || this.owner !== owner) return;
        activeCurrencyQuote.set(quote);
        this.writeCache(owner, { ...quote, fetchedAt: Date.now() });
      } catch {
        if (id === this.requestId) this.error.set('No hay tasa reciente para ' + selected + '. Mostramos COP temporalmente.');
      }
    } catch {
      // On offline startup a previously verified short-lived quote may remain usable.
      if (id === this.requestId) this.error.set('Sin conexión para sincronizar la moneda. Reintenta desde Ajustes.');
    }
  }

  private async fetchQuote(code: DisplayCurrency): Promise<CurrencyQuote> {
    const res = await fetch('https://api.frankfurter.dev/v2/rate/cop/' + code.toLowerCase(),
      { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) throw new Error('FX provider unavailable');
    const body: FxResponse = await res.json();
    if (body?.base?.toUpperCase() !== 'COP' || body?.quote?.toUpperCase() !== code
        || !this.validRate(body.rate, body.date)) throw new Error('Untrusted FX quote');
    return { code, rate: body.rate, date: body.date };
  }

  private validRate(rate: number, date: string): boolean {
    if (!Number.isFinite(rate) || rate <= 0 || rate >= 1000
        || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const time = Date.parse(date + 'T00:00:00Z');
    return Number.isFinite(time) && time <= Date.now() + 86400000 && time >= Date.now() - 14 * 86400000;
  }
  private readCache(owner: string): CurrencyQuote | null {
    try {
      const stored: StoredQuote = JSON.parse(localStorage.getItem('finflow.displayCurrency.' + owner) ?? 'null');
      if (!stored || !CURRENCIES.some(c => c.code === stored.code) || !Number.isFinite(stored.fetchedAt)
          || Date.now() - stored.fetchedAt < 0 || Date.now() - stored.fetchedAt > 72 * 3600000) return null;
      if (stored.code === 'COP') return BASE;
      if (!this.validRate(stored.rate, stored.date!)) return null;
      return { code: stored.code, rate: stored.rate, date: stored.date };
    } catch { return null; }
  }
  private writeCache(owner: string, value: StoredQuote): void {
    try { localStorage.setItem('finflow.displayCurrency.' + owner, JSON.stringify(value)); } catch { /* optional */ }
  }
}
