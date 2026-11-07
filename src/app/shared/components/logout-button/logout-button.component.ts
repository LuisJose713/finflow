import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-logout-button',
  standalone: true,
  template: `
    <button type="button" class="btn-logout" (click)="logout()" title="Cerrar sesión" aria-label="Cerrar sesión">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h6a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3h-6"/></svg>
      <span>Cerrar sesión</span>
    </button>
  `,
  styles: [`
    :host { display:block; min-width:0; }
    .btn-logout { display:flex; align-items:center; justify-content:center; gap:.6rem; width:100%; min-height:44px; padding:.7rem .8rem; border:1px solid #3b4b63; border-radius:11px; background:transparent; color:#b9c8dc; font:inherit; font-size:.78rem; font-weight:650; cursor:pointer; white-space:nowrap; transition:background .2s,border-color .2s,color .2s; }
    .btn-logout svg { width:18px; height:18px; flex-shrink:0; }
    .btn-logout:hover { background:rgba(248,113,113,.09); border-color:#c47d84; color:#ffb9b9; }
    .btn-logout:focus-visible { outline:2px solid #d9bd8d; outline-offset:2px; }
  `],
})
export class LogoutButtonComponent {
  private readonly auth = inject(AuthService);
  logout() { this.auth.logout(); }
}
