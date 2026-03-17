import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  template: `
    <button class="btn-logout" (click)="logout()" title="Cerrar sesión">
      <span class="icon">⎋</span>
      <span class="label">Salir</span>
    </button>
  `,
  styles: [`
    .btn-logout {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      background: none;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.15s;

      &:hover {
        border-color: var(--danger);
        color: var(--danger);
        background: rgba(239, 68, 68, 0.06);
      }
    }

    .icon { font-size: 1rem; }
  `],
})
export class LogoutButtonComponent {
  private auth = inject(AuthService);
  logout() { this.auth.logout(); }
}
