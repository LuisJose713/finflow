import { ElementRef } from '@angular/core';
import { CurrencyInputDirective } from './currency-input.directive';

describe('CurrencyInputDirective', () => {
  let input: HTMLInputElement;
  let directive: CurrencyInputDirective;
  let value: number | null;

  beforeEach(() => {
    input = document.createElement('input');
    directive = new CurrencyInputDirective(new ElementRef(input));
    value = null;
    directive.registerOnChange(next => { value = next; });
  });

  function enter(text: string): void {
    input.value = text;
    directive.onInput({ target: input } as unknown as Event);
  }

  it('shows two decimals for existing values', () => {
    directive.writeValue(1500);
    expect(input.value).toBe('1.500,00');
  });

  it('keeps model numeric and groups thousands', () => {
    enter('25000');
    expect(value).toBe(25000);
    directive.onBlur();
    expect(input.value).toBe('25.000,00');
  });

  it('accepts Colombian centavos without losing precision', () => {
    enter('1.250,50');
    expect(value).toBe(1250.5);
    directive.onBlur();
    expect(input.value).toBe('1.250,50');
  });

  it('keeps the peso amount while typing and deleting beside thousands separators', () => {
    enter('25000'); enter('25.0000'); expect(value).toBe(250000);
    enter('250.00'); expect(value).toBe(25000);
  });

  it('rejects extra cents, negative and oversized values without changing the amount', () => {
    enter('1250,50'); enter('1.250,505'); expect(value).toBe(1250.5);
    enter('-1250'); expect(value).toBe(1250.5);
    enter('1000000000000,01'); expect(value).toBe(1250.5);
  });

  it('preserves zero and clears an empty field', () => {
    enter('0');
    expect(value).toBe(0);
    directive.onBlur();
    expect(input.value).toBe('0,00');
    enter('');
    expect(value).toBeNull();
  });
});
