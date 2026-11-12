import { Component, DestroyRef, ElementRef, HostListener, NgZone, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router'; 
import { CommonModule } from '@angular/common'; 
import { AuthService } from '../../../core/services/auth.service';
import { LogoutButtonComponent } from '../logout-button/logout-button.component';
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';
import { environment } from '../../../../environments/environment';
import { DrawerSwipe } from './drawer-swipe';

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
  readonly mobile = signal(typeof window !== 'undefined' && window.innerWidth <= 768);
  readonly dragOffset = signal<number | null>(null);
  readonly mobileVisible = computed(() => this.mobileOpen() || this.dragOffset() !== null);
  readonly drawerProgress = computed(() => {
    const offset = this.dragOffset();
    return offset === null ? Number(this.mobileOpen()) : 1 + offset / this.drawerWidth;
  });
  @ViewChild('sidebar') private sidebar?: ElementRef<HTMLElement>;
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private drawerWidth = 320;
  private swipe: DrawerSwipe | null = null;
  private suppressClickUntil = 0;

  constructor() {
    if (typeof document === 'undefined') return;
    // Only an accepted horizontal drag cancels the browser's default action.
    // A non-passive listener is necessary on Safari and Chrome document touches.
    this.zone.runOutsideAngular(() => {
      const move = (event: TouchEvent) => this.onTouchMove(event);
      const click = (event: MouseEvent) => {
        if (event.detail > 0 && performance.now() < this.suppressClickUntil) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('click', click, true);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('touchmove', move);
        document.removeEventListener('click', click, true);
      });
    });
  }

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

  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.cancelSwipe();
    if (typeof window === 'undefined' || window.innerWidth > 768 || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [data-no-drawer-swipe], dialog, [aria-modal="true"], [role="dialog"]')) return;
    const open = this.mobileOpen();
    if (!DrawerSwipe.canStart(touch.clientX, window.innerWidth, open)) return;
    if (!open) {
      if (document.querySelector('[aria-modal="true"], dialog[open]')) return;
      if (target?.closest('button, a, canvas, svg, [role="tablist"], .chart-container, .chart-wrapper')) return;
      for (let element = target; element; element = element.parentElement) {
        if (/(auto|scroll)/.test(window.getComputedStyle(element).overflowX)
            && element.scrollWidth > element.clientWidth + 1) return;
      }
    }
    this.drawerWidth = this.sidebar?.nativeElement.getBoundingClientRect().width || Math.min(320, window.innerWidth - 16);
    this.swipe = new DrawerSwipe(touch.identifier, touch.clientX, touch.clientY, open, this.drawerWidth, event.timeStamp);
  }

  onTouchMove(event: TouchEvent): void {
    const swipe = this.swipe;
    if (!swipe) return;
    const touch = Array.from(event.touches).find(item => item.identifier === swipe.touchId);
    if (event.touches.length !== 1 || !touch) { this.zone.run(() => this.cancelSwipe()); return; }
    const offset = swipe.move(touch.clientX, touch.clientY, event.timeStamp);
    if (offset === null) return;
    if (!event.cancelable) { this.zone.run(() => this.cancelSwipe()); return; }
    event.preventDefault();
    this.zone.run(() => this.dragOffset.set(offset));
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    const swipe = this.swipe;
    const touch = swipe && Array.from(event.changedTouches).find(item => item.identifier === swipe.touchId);
    if (!swipe || !touch || event.touches.length) { this.cancelSwipe(); return; }
    const open = swipe.finish(event.timeStamp, touch.clientX, touch.clientY);
    if (swipe.active) this.suppressClickUntil = performance.now() + 300;
    this.swipe = null;
    this.mobileOpen.set(open);
    this.dragOffset.set(null);
  }

  @HostListener('document:touchcancel')
  onTouchCancel(): void {
    this.cancelSwipe();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.cancelSwipe();
    this.mobile.set(window.innerWidth <= 768);
    if (!this.mobile()) this.mobileOpen.set(false);
  }

  @HostListener('window:blur')
  cancelSwipe(): void {
    if (this.swipe?.active) this.suppressClickUntil = performance.now() + 300;
    this.swipe = null;
    this.dragOffset.set(null);
  }

  toggleMobile() {
    this.cancelSwipe();
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.cancelSwipe();
    this.mobileOpen.set(false);
  }
}
