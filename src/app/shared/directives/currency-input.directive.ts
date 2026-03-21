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

    // Solo dígitos
    const raw = input.value.replace(/\D/g, '');

    if (raw === '') {
      input.value = '';
      this.onChange(null);
      return;
    }

    const numeric   = parseInt(raw, 10);
    const formatted = this.format(numeric);
    input.value     = formatted;

    // Restaurar cursor ajustado por los puntos agregados
    const diff = formatted.length - prevLen;
    input.setSelectionRange(cursorPos + diff, cursorPos + diff);

    this.onChange(numeric);
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  // ── Formato: 1000000 → "1.000.000" ─────────────────────
  private format(value: number): string {
    return value.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }
}