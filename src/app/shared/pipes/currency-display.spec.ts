import { activeCurrencyQuote, convertForDisplay } from '../../core/services/currency-display.service';
import { AppCurrencyPipe } from './currency.pipe';
describe('global display currency conversion', () => {
  afterEach(() => activeCurrencyQuote.set({ code: 'COP', rate: 1, date: null }));
  it('converts original COP only, preserving the input amount', () => {
    const quote = { code: 'USD' as const, rate: 0.00025, date: '2026-11-14' };
    expect(convertForDisplay(100000, 'COP', quote)).toEqual({amount:25,currency:'USD'});
    expect(convertForDisplay(100000, 'USD', quote)).toEqual({amount:100000,currency:'USD'});
    expect(convertForDisplay(100000, 'EUR', quote)).toEqual({amount:100000,currency:'EUR'});
  });
  it('renders selected currency across all appCurrency callers', () => {
    const pipe = new AppCurrencyPipe();
    activeCurrencyQuote.set({ code:'USD',rate:0.00025,date:'2026-11-14' });
    expect(pipe.transform(100000)).toContain('USD');
    expect(pipe.transform(100000)).toContain('25,00');
  });
});
