import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common'; 
import { AuthService } from '../../../core/services/auth.service';
import { LogoutButtonComponent } from '../logout-button/logout-button.component';
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';
import { environment } from '../../../../environments/environment';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,          
    RouterModule,          
    LogoutButtonComponent,
    ThemeSwitcherComponent,
    AddTransactionComponent
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {

  auth = inject(AuthService);

  collapsed = signal(this.readCollapsedPreference());
  mobileOpen = signal(false);
  private swipeStart: { x: number; y: number; closing: boolean } | null = null;

  navItems: NavItem[] = [
    { path: '/dashboard', label: 'Inicio', icon: '📊' },
    { path: '/goals',     label: 'Metas',     icon: '🎯' },
    { path: '/accounts', label: 'Cuentas y billeteras', icon: '◫' },
    { path: '/recurring', label: 'Recurrentes', icon: '↻' },
    { path: '/security', label: 'Seguridad', icon: '⛨' },
    { path: '/advisor',   label: 'Asesor IA', icon: '🤖' },
    { path: '/transactions', label: 'Movimientos', icon: '💳' },
    { path: '/planned-expenses', label: 'Gastos planeados', icon: '📅' },
    { path: '/categories', label: 'Categorías', icon: '▦' },
    { path: '/budgets', label: 'Presupuestos', icon: '▥' }
  ].filter(item => environment.budgetsReady || item.path !== '/budgets');

  readonly navGroups = [
    { label: 'TU PANORAMA', items: this.navItems.filter(item =>
      ['/dashboard', '/transactions', '/goals', '/planned-expenses'].includes(item.path)) },
    { label: 'TU DINERO', items: this.navItems.filter(item =>
      ['/accounts', '/budgets', '/recurring', '/categories', '/advisor'].includes(item.path)) },
    { label: 'TU CUENTA', items: this.navItems.filter(item => item.path === '/security') },
  ];

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

  // Mobile edge swipe: open to the right, close to the left.
  // Leave the first 24px to the browser/OS back navigation gesture,
  // and never claim vertical scrolling or a gesture on an input.
  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.swipeStart = null;
    if (typeof window === 'undefined' || window.innerWidth > 768 || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [data-no-drawer-swipe]')) return;
    const closing = this.mobileOpen();
    if (closing) {
      if (touch.clientX > Math.min(320, window.innerWidth - 16)) return;
    } else if (touch.clientX < 24 || touch.clientX > 88) {
      return;
    }
    this.swipeStart = { x: touch.clientX, y: touch.clientY, closing };
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    const start = this.swipeStart;
    this.swipeStart = null;
    if (!start || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = Math.abs(touch.clientY - start.y);
    if (dy > 45 || Math.abs(dx) < 72 || Math.abs(dx) < dy * 1.5) return;
    if (start.closing && dx < 0) this.closeMobile();
    else if (!start.closing && dx > 0) this.mobileOpen.set(true);
  }

  @HostListener('document:touchcancel')
  onTouchCancel(): void {
    this.swipeStart = null;
  }

  toggleMobile() {
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.mobileOpen.set(false);
  }
}