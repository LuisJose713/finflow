import { Pipe, PipeTransform } from '@angular/core';
import { activeCurrencyQuote, convertForDisplay } from '../../core/services/currency-display.service';

@Pipe({
  name: 'appCurrency',
  standalone: true,
  pure: false, // The user's preferred quote is reactive, not an input binding.
})
export class AppCurrencyPipe implements PipeTransform {
  private readonly formats = new Map<string, Intl.NumberFormat>();
  transform(value: number | null | undefined, currency?: string | null, display: 'code' | 'symbol' = 'code'): string {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const normalizedCurrency = currency?.trim().toUpperCase() || 'COP';
    // Old records with blank currency are COP, matching the backend contract.
    const currencyCode = /^[A-Z]{3}$/.test(normalizedCurrency) ? normalizedCurrency : 'COP';
    const displayed = convertForDisplay(Number(value), currencyCode, activeCurrencyQuote());
    const shownCode = displayed.currency;
    const key = shownCode + ':' + display;
    if (!this.formats.has(key)) this.formats.set(key, new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: shownCode,
      currencyDisplay: shownCode === 'COP' && display === 'symbol' ? 'narrowSymbol' : 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }));
    return this.formats.get(key)!.format(displayed.amount);
  }
}
