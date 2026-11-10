import { ElementRef } from '@angular/core';
import { CurrencyInputDirective } from './currency-input.directive';

describe('CurrencyInputDirective', () => {
  it('should create an instance for an input element', () => {
    const input = document.createElement('input');
    const directive = new CurrencyInputDirective(new ElementRef(input));
    expect(directive).toBeTruthy();
  });
});
