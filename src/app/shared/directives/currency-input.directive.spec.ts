import { ElementRef } from '@angular/core';
import { CurrencyInputDirective } from './currency-input.directive';

describe('CurrencyInputDirective', () => {
  it('should create an instance with its required input element', () => {
    const element = document.createElement('input');
    const directive = new CurrencyInputDirective(new ElementRef(element));
    expect(directive).toBeTruthy();
  });

  it('should format a COP amount without decimals', () => {
    const element = document.createElement('input');
    const directive = new CurrencyInputDirective(new ElementRef(element));
    directive.writeValue(150000);
    expect(element.value).toBe((150000).toLocaleString('es-CO',{maximumFractionDigits:0}));
  });
});
