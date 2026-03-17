import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme = signal<Theme>(
    (localStorage.getItem('theme') as Theme) ?? 'system'
  );

  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const theme = this._theme();
      localStorage.setItem('theme', theme);
      this.applyTheme(theme);
    });
  }

  setTheme(theme: Theme) {
    this._theme.set(theme);
  }

  toggleTheme() {
    this._theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  private applyTheme(theme: Theme) {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

    root.classList.toggle('dark', isDark);
  }
}
