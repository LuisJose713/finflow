import { Component, Input, inject, ChangeDetectionStrategy } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  template: `
    <button type="button" class="theme-btn" [class.compact]="compact" (click)="themeService.toggleTheme()"
      [attr.aria-label]="themeService.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'"
      [attr.title]="themeService.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'">
      @if (themeService.isDark()) {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
      } @else {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13.1A9 9 0 0 1 10.9 3.1 9 9 0 1 0 20.9 13.1Z"/></svg>
      }
      <span class="theme-label">{{ themeService.isDark() ? 'Modo claro' : 'Modo oscuro' }}</span>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    :host { display:block; min-width:0; }
    .theme-btn { width:100%; min-height:44px; display:flex; align-items:center; justify-content:center; gap:.6rem; border:1px solid #3b4b63; border-radius:11px; background:#1a2a40; color:#e5edf9; font:inherit; font-size:.78rem; font-weight:650; padding:.7rem .8rem; cursor:pointer; transition:background .2s,border-color .2s; white-space:nowrap; }
    .theme-btn:hover { background:#293d57; border-color:#c7ab7c; }
    .theme-btn svg { width:18px; height:18px; flex-shrink:0; }
    .theme-btn .theme-label { min-width:0; }
    .theme-btn.compact { width:44px; max-width:100%; height:44px; min-height:44px; padding:.65rem; gap:0; margin-inline:auto; }
    .theme-btn.compact .theme-label { display:none; }
    @media (max-width:768px) {
      .theme-btn { justify-content:center; width:100%; max-width:100%; }
    }
    .theme-btn:focus-visible { outline:2px solid #d9bd8d; outline-offset:2px; }
  `],
})
export class ThemeSwitcherComponent {
  @Input() compact = false;
  readonly themeService = inject(ThemeService);
}
