import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.readSavedTheme());
  private readonly systemDark = signal(
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  );
  readonly theme = this._theme.asReadonly();
  readonly isDark = computed(() => this._theme() === 'dark' || (this._theme() === 'system' && this.systemDark()));

  constructor() {
    if (typeof window !== 'undefined') {
      const query = window.matchMedia('(prefers-color-scheme: dark)');
      query.addEventListener('change', event => this.systemDark.set(event.matches));
    }
    effect(() => {
      const theme = this._theme();
      if (typeof localStorage !== 'undefined') localStorage.setItem('theme', theme);
    });
    effect(() => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', this.isDark());
      }
    });
  }

  setTheme(theme: Theme) { this._theme.set(theme); }
  toggleTheme() { this._theme.set(this.isDark() ? 'light' : 'dark'); }

  private readSavedTheme(): Theme {
    if (typeof localStorage === 'undefined') return 'system';
    const saved = localStorage.getItem('theme');
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  }
}
