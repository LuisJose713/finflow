import { AfterViewInit, Component, DestroyRef, ElementRef, HostListener, Input, NgZone, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'; 
import { CommonModule } from '@angular/common'; 
import { AuthService } from '../../../core/services/auth.service';
import { LogoutButtonComponent } from '../logout-button/logout-button.component';
import { ThemeSwitcherComponent } from '../theme-switcher/theme-switcher.component';
import { AddTransactionComponent } from '../add-transaction/add-transaction.component';
import { environment } from '../../../../environments/environment';
import { DrawerSwipe } from './drawer-swipe';
import { CurrencyDisplayService, DisplayCurrency } from '../../../core/services/currency-display.service';
import { QuickCreateService, QUICK_CREATE, QuickCreateConfig } from '../../../core/services/quick-create.service';

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
export class NavbarComponent implements AfterViewInit {
  @Input() showTransactionShortcut = true;

  auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly quickCreateService = inject(QuickCreateService);
  readonly currentPath = signal(this.router.url.split(/[?#]/)[0]);
  readonly createAction = computed<QuickCreateConfig | null>(() =>
    QUICK_CREATE[this.currentPath() as keyof typeof QUICK_CREATE] ?? null);
  readonly showMovementAction = computed(() => ['/dashboard', '/transactions'].includes(this.currentPath()));
  openContextCreate(): void {
    const action = this.createAction();
    if (action) this.quickCreateService.request(action.route);
  }
  readonly currencies = inject(CurrencyDisplayService);
  readonly currencyOptions = this.currencies.options;
  setDisplayCurrency(value: string): void {
    if (this.currencyOptions.some(item => item.code === value)) void this.currencies.select(value as DisplayCurrency);
  }

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
  @ViewChild('navigationList') private navigationList?: ElementRef<HTMLElement>;
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private drawerWidth = 320;
  private swipe: DrawerSwipe | null = null;
  private edgeMenuTap = false;
  private suppressClickUntil = 0;
  private static readonly NAV_SCROLL_KEY = 'finflow.nav.scroll-position';

  ngAfterViewInit(): void { this.restoreNavScroll(); }

  rememberNavScroll(): void {
    const list = this.navigationList?.nativeElement;
    if (!list) return;
    try { sessionStorage.setItem(NavbarComponent.NAV_SCROLL_KEY, String(list.scrollTop)); }
    catch { /* Private browsing may restrict storage. */ }
  }

  private restoreNavScroll(): void {
    if (typeof window === 'undefined') return;
    requestAnimationFrame(() => {
      const list = this.navigationList?.nativeElement;
      if (!list) return;
      try {
        const position = Number(sessionStorage.getItem(NavbarComponent.NAV_SCROLL_KEY));
        if (Number.isFinite(position) && position > 0) list.scrollTop = position;
      } catch { /* Restricted storage. */ }
    });
  }

  onNavigateFromMenu(): void {
    this.rememberNavScroll();
    this.closeMobile();
  }

  constructor() {
    effect(() => this.currencies.load(this.auth.currentUser()?.id ?? null));
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(event => {
      if (event instanceof NavigationEnd) this.currentPath.set(event.urlAfterRedirects.split(/[?#]/)[0]);
    });
    if (typeof document === 'undefined') return;
    // iOS must receive a cancellable touchstart before its edge history gesture begins.
    // Other touches are claimed only once a horizontal drawer drag is accepted.
    this.zone.runOutsideAngular(() => {
      const start = (event: TouchEvent) => this.zone.run(() => this.onTouchStart(event));
      const move = (event: TouchEvent) => this.onTouchMove(event);
      const click = (event: MouseEvent) => {
        if (event.detail > 0 && performance.now() < this.suppressClickUntil) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      };
      document.addEventListener('touchstart', start, { passive: false, capture: true });
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('click', click, true);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('touchstart', start, true);
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
    this.rememberNavScroll();
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

  private isInstalledIOS(): boolean {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return ios && ((navigator as Navigator & { standalone?: boolean }).standalone === true
      || window.matchMedia('(display-mode: standalone)').matches);
  }

  onTouchStart(event: TouchEvent): void {
    this.cancelSwipe();
    if (typeof window === 'undefined' || window.innerWidth > 768 || event.touches.length !== 1) return;
    // A fresh touch is a new action, not the compatibility click of the last drag.
    this.suppressClickUntil = 0;
    const touch = event.touches[0];
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"], [data-no-drawer-swipe], dialog, [aria-modal="true"], [role="dialog"]')) return;
    const open = this.mobileOpen();
    const fromMenuButton = !!target?.closest('.mobile-menu-btn');
    const captureBackEdge = this.isInstalledIOS();
    if (!DrawerSwipe.canStart(touch.clientX, window.innerWidth, open, fromMenuButton, captureBackEdge)) return;
    if (!open) {
      if (document.querySelector('[aria-modal="true"], dialog[open]')) return;
      // The visible hamburger button is a valid drag handle as well as a tap target.
      if (!fromMenuButton && target?.closest('button, a, canvas, svg, [role="tablist"], .chart-container, .chart-wrapper')) return;
      for (let element = target; element; element = element.parentElement) {
        if (/(auto|scroll)/.test(window.getComputedStyle(element).overflowX)
            && element.scrollWidth > element.clientWidth + 1) return;
      }
    }
    if (captureBackEdge && touch.clientX < DrawerSwipe.BACK_EDGE_WIDTH
        && (fromMenuButton || !target?.closest('button, a'))) {
      if (!event.cancelable) return;
      event.preventDefault();
      // Cancelling touchstart also suppresses the button's native click.
      this.edgeMenuTap = fromMenuButton;
    }
    this.drawerWidth = this.sidebar?.nativeElement.getBoundingClientRect().width || Math.min(320, window.innerWidth - 16);
    this.swipe = new DrawerSwipe(touch.identifier, touch.clientX, touch.clientY, open, this.drawerWidth, event.timeStamp);
  }

  onTouchMove(event: TouchEvent): void {
    const swipe = this.swipe;
    if (!swipe) return;
    const touch = Array.from(event.touches).find(item => item.identifier === swipe.touchId);
    if (event.touches.length !== 1 || !touch) { this.zone.run(() => this.cancelSwipe()); return; }
    if (Math.hypot(touch.clientX - swipe.startX, touch.clientY - swipe.startY) >= 10) this.edgeMenuTap = false;
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
    const tappedMenuButton = this.edgeMenuTap && !swipe.active
      && Math.hypot(touch.clientX - swipe.startX, touch.clientY - swipe.startY) < 10;
    const open = tappedMenuButton ? !swipe.initiallyOpen : swipe.finish(event.timeStamp, touch.clientX, touch.clientY);
    if (swipe.active || tappedMenuButton) this.suppressClickUntil = performance.now() + 300;
    this.swipe = null;
    this.edgeMenuTap = false;
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
    this.edgeMenuTap = false;
    this.dragOffset.set(null);
  }

  toggleMobile() {
    this.cancelSwipe();
    this.mobileOpen.update(v => !v);
  }

  closeMobile() {
    this.rememberNavScroll();
    this.cancelSwipe();
    this.mobileOpen.set(false);
  }
}
