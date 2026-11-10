import { Component, HostListener, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router'; 
 
import { AuthService } from '../../../core/services/auth.service';
import { LogoutButtonComponent } from '../logout-button/logout-button.component';
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';
import { environment } from '../../../../environments/environment';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
    selector: 'app-navbar',
    imports: [
    RouterModule,
    LogoutButtonComponent,
    ThemeSwitcherComponent
],
    templateUrl: './navbar.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {

  auth = inject(AuthService);

  collapsed = signal(this.readCollapsedPreference());
  mobileOpen = signal(false); // 🔥 CLAVE

  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/goals',     label: 'Metas',     icon: '🎯' },
    { path: '/accounts', label: 'Cuentas y billeteras', icon: '◫' },
    { path: '/recurring', label: 'Recurrentes', icon: '↻' },
    { path: '/security', label: 'Seguridad', icon: '⛨' },
    { path: '/advisor',   label: 'Asesor IA', icon: '🤖' },
    { path: '/transactions', label: 'Transacciones', icon: '💳' },
    { path: '/planned-expenses', label: 'Gastos Planeados', icon: '📅' },
    { path: '/categories', label: 'Mis categorías', icon: '▦' },
    { path: '/budgets', label: 'Presupuestos', icon: '▥' }
  ].filter(item => environment.budgetsReady || item.path !== '/budgets');

  toggleCollapse() {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem('finflow.sidebar.collapsed', String(next));
    } catch { /* A blocked storage policy must never break navigation. */ }
  }

  private readCollapsedPreference(): boolean {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem('finflow.sidebar.collapsed') === 'true';
    } catch {
      return false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobile();
  }

  toggleMobile() {
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }
}