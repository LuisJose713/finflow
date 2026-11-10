import { Directive, ElementRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** COP monetary entry: keep the model numeric and format the display in es-CO. */
@Directive({
  selector: 'input[appCurrencyInput]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: CurrencyInputDirective, multi: true }],
})
export class CurrencyInputDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>) {}

  writeValue(value: number | null): void {
    this.el.nativeElement.value = value != null && Number.isFinite(value)
      ? this.format(value) : '';
  }
  registerOnChange(fn: (value: number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.el.nativeElement.disabled = disabled; }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/[^\d,.]/g, '');
    // es-CO: dots group thousands; comma separates cents. Accept a lone
    // decimal dot as well for paste/keyboard compatibility.
    const comma = raw.lastIndexOf(',');
    const hasDecimalDot = comma < 0 && /^\d+\.\d{1,2}$/.test(raw);
    const separator = comma >= 0 ? comma : hasDecimalDot ? raw.lastIndexOf('.') : -1;
    const whole = (separator >= 0 ? raw.slice(0, separator) : raw).replace(/\D/g, '');
    const cents = separator >= 0 ? raw.slice(separator + 1).replace(/\D/g, '').slice(0, 2) : null;
    if (!whole && cents === null) {
      input.value = '';
      this.onChange(null);
      return;
    }
    const number = Number((whole || '0') + (cents !== null ? '.' + cents : ''));
    if (!Number.isFinite(number)) {
      this.onChange(null);
      return;
    }
    const before = input.selectionStart ?? input.value.length;
    const previousLength = input.value.length;
    input.value = this.formatWhole(Number(whole || '0')) + (cents !== null ? ',' + cents : '');
    const position = Math.max(0, Math.min(input.value.length, before + input.value.length - previousLength));
    input.setSelectionRange(position, position);
    this.onChange(number);
  }

  @HostListener('blur')
  onBlur(): void {
    const value = this.el.nativeElement.value;
    if (value) {
      const parsed = Number(value.replace(/\./g, '').replace(',', '.'));
      if (Number.isFinite(parsed)) this.el.nativeElement.value = this.format(parsed);
    }
    this.onTouched();
  }

  private formatWhole(value: number): string {
    return value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }
  private format(value: number): string {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
