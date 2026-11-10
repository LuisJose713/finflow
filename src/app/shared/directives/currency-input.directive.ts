import { Directive, ElementRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appCurrencyInput]',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: CurrencyInputDirective,
      multi: true,
    },
  ],
})
export class CurrencyInputDirective implements ControlValueAccessor {
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>) {}

  // ── Escribir desde el modelo al input ───────────────────
  writeValue(value: number | null): void {
    this.el.nativeElement.value = value != null ? this.format(value) : '';
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.el.nativeElement.disabled = isDisabled;
  }

  // ── Al escribir: formatear visualmente, emitir número ───
  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    // Guarda posición del cursor
    const cursorPos = input.selectionStart ?? 0;
    const prevLen   = input.value.length;

    // Preserve decimal comma while allowing grouped Colombian currency values.
    const normalized = input.value.replace(/[^\d,.]/g, '');
    const decimalIndex = normalized.lastIndexOf(',');
    const integerPart = (decimalIndex >= 0 ? normalized.slice(0, decimalIndex) : normalized).replace(/\D/g, '');
    const fractionalPart = decimalIndex >= 0 ? normalized.slice(decimalIndex + 1).replace(/\D/g, '').slice(0, 2) : null;
    const raw = integerPart;

    if (raw === '') {
      input.value = '';
      this.onChange(null);
      return;
    }

    const numeric   = Number(raw + (fractionalPart !== null ? '.' + fractionalPart : ''));
    const formatted = this.formatInteger(Number(raw)) + (fractionalPart !== null ? ',' + fractionalPart : '');
    input.value     = formatted;

    // Restaurar cursor ajustado por los puntos agregados
    const diff = formatted.length - prevLen;
    input.setSelectionRange(cursorPos + diff, cursorPos + diff);

    this.onChange(numeric);
  }

  @HostListener('blur')
  onBlur(): void {
    const value = this.el.nativeElement.value;
    if (value) {
      const normalized = value.replace(/\./g, '').replace(',', '.');
      const numeric = Number(normalized);
      if (Number.isFinite(numeric)) this.el.nativeElement.value = this.format(numeric);
    }
    this.onTouched();
  }

  private formatInteger(value: number): string {
    return value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  private format(value: number): string {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}