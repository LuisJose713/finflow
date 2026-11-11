import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'appCurrency',
  standalone: true,
})
export class AppCurrencyPipe implements PipeTransform {
  transform(value: number | null | undefined, currency?: string | null): string {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const normalizedCurrency = currency?.trim().toUpperCase() || 'COP';
    // Old records with blank currency are COP, matching the backend contract.
    const currencyCode = /^[A-Z]{3}$/.test(normalizedCurrency) ? normalizedCurrency : 'COP';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'code',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
