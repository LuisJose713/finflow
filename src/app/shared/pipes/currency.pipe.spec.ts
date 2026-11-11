import { AppCurrencyPipe } from './currency.pipe';

describe('AppCurrencyPipe', () => {
  const pipe = new AppCurrencyPipe();
  it('identifies COP by default and formats Colombian separators', () => {
    expect(pipe.transform(1500000)).toContain('COP');
    expect(pipe.transform(1500000)).toContain('1.500.000');
  });
  it('preserves explicit currencies, zero and the negative sign', () => {
    expect(pipe.transform(12.5, 'USD')).toContain('USD');
    expect(pipe.transform(-50000)).toContain('-');
    expect(pipe.transform(0)).toContain('0');
  });
  it('does not render non-finite or absent amounts as money', () => {
    expect(pipe.transform(null)).toBe('—');
    expect(pipe.transform(NaN)).toBe('—');
    expect(pipe.transform(Infinity)).toBe('—');
  });
  it('treats legacy blank currencies as COP and handles malformed codes', () => {
    for (const currency of [null, undefined, '', '  ', 'invalid']) {
      expect(pipe.transform(1500, currency)).toContain('COP');
    }
    expect(pipe.transform(1500, ' usd ')).toContain('USD');
  });
});
