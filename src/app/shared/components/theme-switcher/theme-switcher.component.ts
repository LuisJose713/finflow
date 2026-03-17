import { Component, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  template: `
    <button
      class="theme-btn"
      (click)="themeService.toggleTheme()"
      [title]="themeService.theme() === 'dark' ? 'Modo claro' : 'Modo oscuro'"
    >
      {{ themeService.theme() === 'dark' ? '☀️' : '🌙' }}
    </button>
  `,
  styles: [`
    .theme-btn {
      background: none;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 0.45rem 0.6rem;
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
      transition: background 0.15s;

      &:hover { background: var(--bg-secondary); }
    }
  `],
})
export class ThemeSwitcherComponent {
  themeService = inject(ThemeService);
}
