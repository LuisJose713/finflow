import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** COP form values remain numeric; punctuation never changes their units. */
@Directive({
  selector: 'input[appCurrencyInput]', standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CurrencyInputDirective), multi: true }],
})
export class CurrencyInputDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private raw = '';
  private displayed = '';
  private readonly wholeFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
  private readonly moneyFormat = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  constructor(private el: ElementRef<HTMLInputElement>) {}
  writeValue(value: number | null): void {
    this.raw = value != null && Number.isFinite(value) ? Number(value.toFixed(2)).toString() : '';
    this.render(true);
  }
  registerOnChange(fn: (value: number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.el.nativeElement.disabled = disabled; }

  @HostListener('input', ['$event']) onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const text = input.value.replace(/COP/gi, '').replace(/\$/g, '').replace(/\s/g, '');
    if (!text) { this.raw = ''; this.render(false); this.onChange(null); return; }
    const reject = () => { input.value = this.displayed; };
    if (/[^\d.,]/.test(text) || (text.match(/,/g)?.length ?? 0) > 1) { reject(); return; }
    const inputEvent = event as InputEvent;
    const singleEdit = Math.abs(input.value.length - this.displayed.length) <= 1 &&
      (!inputEvent.data || inputEvent.data.length <= 1) && inputEvent.inputType !== 'insertFromPaste';
    const editingWhole = !this.raw.includes('.') && this.displayed.includes('.') && singleEdit &&
      !text.includes(',') && !text.endsWith('.');
    const comma = text.indexOf(','), dot = text.lastIndexOf('.');
    const dotCount = (text.match(/\./g)?.length ?? 0);
    const editingDecimal = this.raw.includes('.') && Math.abs(input.value.length - this.displayed.length) <= 1;
    const decimalDot = !editingWhole && comma < 0 && dot >= 0 && (text.length - dot - 1 <= 2 || (dotCount === 1 && editingDecimal));
    const separator = comma >= 0 ? comma : decimalDot ? dot : -1;
    const wholeText = separator >= 0 ? text.slice(0, separator) : text;
    if (!editingWhole && wholeText.includes('.') && !/^\d{1,3}(\.\d{3})+$/.test(wholeText)) { reject(); return; }
    const whole = wholeText.replace(/\./g, '').replace(/^0+/, '') || '0';
    const fraction = separator >= 0 ? text.slice(separator + 1) : '';
    if (fraction.length > 2 || /\D/.test(fraction) || whole.length > 13) { reject(); return; }
    const normalized = whole + (separator >= 0 ? '.' + fraction : '');
    const value = Number(normalized);
    if (!Number.isFinite(value) || value > 1_000_000_000_000) { reject(); return; }
    const before = input.selectionStart ?? input.value.length, previousLength = input.value.length;
    this.raw = normalized;
    this.render(false);
    const position = Math.max(0, Math.min(input.value.length, before + input.value.length - previousLength));
    input.setSelectionRange(position, position);
    this.onChange(value);
  }
  @HostListener('blur') onBlur(): void { this.render(true); this.onTouched(); }
  private render(pad: boolean): void {
    if (!this.raw) this.displayed = '';
    else if (pad) this.displayed = this.moneyFormat.format(Number(this.raw));
    else {
      const [whole, cents] = this.raw.split('.');
      this.displayed = this.wholeFormat.format(Number(whole)) + (cents !== undefined ? ',' + cents : '');
    }
    this.el.nativeElement.value = this.displayed;
  }
}
