import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NavbarComponent } from './navbar.component';
import { CurrencyDisplayService } from '../../../core/services/currency-display.service';

describe('Mobile drawer interaction', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let surface: HTMLElement;
  let originalWidth: number;
  let originalStandalone: PropertyDescriptor | undefined;

  function installedIOS(standalone = true): void {
    spyOnProperty(navigator, 'userAgent', 'get').and.returnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15');
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: standalone });
  }

  function touch(type: string, points: number[][], time: number, target = surface): TouchEvent {
    const touches = points.map(([identifier, clientX, clientY]) => new Touch({ identifier, clientX, clientY, target }));
    const event = new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: type === 'touchend' ? [] : touches, changedTouches: touches,
    });
    Object.defineProperty(event, 'timeStamp', { value: time });
    target.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  beforeEach(async () => {
    originalWidth = window.innerWidth;
    originalStandalone = Object.getOwnPropertyDescriptor(navigator, 'standalone');
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), { provide: CurrencyDisplayService, useValue: {
        quote: signal({ code: 'COP', rate: 1, date: null }), loading: signal(false), error: signal(''),
        options: [{ code: 'COP', label: 'COP · Peso colombiano' }],
        load: () => undefined, select: async () => undefined,
      } }, { provide: AuthService, useValue: {
        currentUser: signal({ name: 'Test', role: 'USER' }), isAuthenticated: () => false,
      } }],
    }).overrideComponent(NavbarComponent, { set: {
      imports: [CommonModule, RouterModule], schemas: [NO_ERRORS_SCHEMA],
    } }).compileComponents();
    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    surface = document.createElement('div');
    document.body.append(surface);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy(); surface.remove();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    if (originalStandalone) Object.defineProperty(navigator, 'standalone', originalStandalone);
    else delete (navigator as Navigator & { standalone?: boolean }).standalone;
  });

  it('tracks the finger before release and claims only the horizontal movement', () => {
    touch('touchstart', [[1, 60, 250]], 0);
    expect(touch('touchmove', [[1, 110, 251]], 30).defaultPrevented).toBeTrue();
    expect(component.dragOffset()).not.toBeNull();
    expect(component.mobileOpen()).toBeFalse();
    expect(fixture.nativeElement.querySelector('aside').classList.contains('dragging')).toBeTrue();
    touch('touchend', [[1, 110, 251]], 40);
    expect(component.mobileOpen()).toBeTrue();
    expect(component.dragOffset()).toBeNull();
  });

  it('lets a vertical scroll continue without turning into navigation', () => {
    touch('touchstart', [[1, 60, 250]], 0);
    expect(touch('touchmove', [[1, 65, 300]], 20).defaultPrevented).toBeFalse();
    touch('touchmove', [[1, 200, 305]], 40);
    touch('touchend', [[1, 200, 305]], 50);
    expect(component.mobileOpen()).toBeFalse();
    expect(component.dragOffset()).toBeNull();
  });

  it('reserves the iOS PWA back edge on touchstart and opens the drawer without changing history', () => {
    installedIOS();
    const path = location.pathname;
    const historyLength = history.length;
    expect(touch('touchstart', [[1, 8, 250]], 0).defaultPrevented).toBeTrue();
    expect(touch('touchmove', [[1, 110, 252]], 200).defaultPrevented).toBeTrue();
    touch('touchend', [[1, 110, 252]], 300);
    expect(component.mobileOpen()).toBeTrue();
    expect(location.pathname).toBe(path);
    expect(history.length).toBe(historyLength);
  });

  it('recognizes iOS standalone display mode when the legacy standalone flag is absent', () => {
    installedIOS(false);
    const originalMatchMedia = window.matchMedia.bind(window);
    spyOn(window, 'matchMedia').and.callFake(query => {
      const result = originalMatchMedia(query);
      return query === '(display-mode: standalone)' ? { ...result, matches: true } : result;
    });
    expect(touch('touchstart', [[1, 8, 250]], 0).defaultPrevented).toBeTrue();
    touch('touchend', [[1, 110, 252]], 300);
    expect(component.mobileOpen()).toBeTrue();
  });

  it('keeps the browser back edge available outside the installed iOS app', () => {
    installedIOS(false);
    expect(touch('touchstart', [[1, 8, 250]], 0).defaultPrevented).toBeFalse();
    touch('touchend', [[1, 110, 252]], 300);
    expect(component.mobileOpen()).toBeFalse();
  });

  it('keeps the PWA menu button tappable at the reserved edge and ignores a duplicate click', () => {
    installedIOS();
    const button = fixture.nativeElement.querySelector('.mobile-menu-btn') as HTMLElement;
    expect(touch('touchstart', [[1, 18, 40]], 0, button).defaultPrevented).toBeTrue();
    touch('touchend', [[1, 18, 40]], 100, button);
    expect(component.mobileOpen()).toBeTrue();
    const duplicate = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
    button.dispatchEvent(duplicate);
    expect(duplicate.defaultPrevented).toBeTrue();
    expect(component.mobileOpen()).toBeTrue();
    touch('touchstart', [[1, 18, 40]], 200, button);
    touch('touchend', [[1, 18, 40]], 300, button);
    expect(component.mobileOpen()).toBeFalse();
  });

  it('keeps vertical scrolling and form controls native outside the reserved edge in the PWA', () => {
    installedIOS();
    expect(touch('touchstart', [[1, 60, 250]], 0).defaultPrevented).toBeFalse();
    expect(touch('touchmove', [[1, 62, 320]], 200).defaultPrevented).toBeFalse();
    touch('touchend', [[1, 62, 320]], 300);
    const input = document.createElement('input'); surface.append(input);
    expect(touch('touchstart', [[1, 8, 250]], 400, input).defaultPrevented).toBeFalse();
    touch('touchend', [[1, 110, 250]], 500, input);
    expect(component.mobileOpen()).toBeFalse();
  });

  it('restores the closed drawer when cancelled or interrupted by another finger', () => {
    touch('touchstart', [[1, 60, 250]], 0);
    touch('touchmove', [[1, 110, 251]], 20);
    touch('touchcancel', [[1, 110, 251]], 30);
    expect(component.dragOffset()).toBeNull();
    expect(fixture.nativeElement.querySelector('aside').hasAttribute('inert')).toBeTrue();
    touch('touchstart', [[1, 60, 250]], 100);
    touch('touchmove', [[1, 110, 251]], 120);
    touch('touchstart', [[1, 110, 251], [2, 150, 300]], 130);
    expect(component.dragOffset()).toBeNull();
    expect(component.mobileOpen()).toBeFalse();
  });

  it('protects form fields, charts, horizontal scrollers and the browser back edge', () => {
    const input = document.createElement('input'); surface.append(input);
    const chart = document.createElement('canvas'); surface.append(chart);
    const horizontal = document.createElement('div');
    horizontal.style.cssText = 'width:50px;overflow-x:auto';
    horizontal.innerHTML = '<div style="width:200px;height:30px"></div>';
    surface.append(horizontal);
    for (const target of [input, chart, horizontal.firstElementChild as HTMLElement]) {
      touch('touchstart', [[1, 60, 250]], 0, target);
      expect(touch('touchmove', [[1, 200, 250]], 20, target).defaultPrevented).toBeFalse();
      touch('touchend', [[1, 200, 250]], 30, target);
      expect(component.mobileOpen()).toBeFalse();
    }
    touch('touchstart', [[1, 10, 250]], 100);
    touch('touchmove', [[1, 200, 250]], 120);
    touch('touchend', [[1, 200, 250]], 130);
    expect(component.mobileOpen()).toBeFalse();
  });

  it('allows closing from a menu link without accidentally activating that link', () => {
    component.toggleMobile(); fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.nav-item') as HTMLElement;
    const activate = jasmine.createSpy('activate'); link.addEventListener('click', activate);
    touch('touchstart', [[1, 240, 250]], 0, link);
    touch('touchmove', [[1, 120, 251]], 300, link);
    touch('touchend', [[1, 120, 251]], 450, link);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 });
    link.dispatchEvent(click);
    expect(component.mobileOpen()).toBeFalse();
    expect(click.defaultPrevented).toBeTrue();
    expect(activate).not.toHaveBeenCalled();
  });

  it('closes with Escape and cancels a drag when switching to desktop', () => {
    component.toggleMobile();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(component.mobileOpen()).toBeFalse();
    touch('touchstart', [[1, 60, 250]], 0);
    touch('touchmove', [[1, 110, 251]], 20);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 });
    component.onResize(); fixture.detectChanges();
    expect(component.dragOffset()).toBeNull();
    expect(component.mobileOpen()).toBeFalse();
    expect(fixture.nativeElement.querySelector('aside').hasAttribute('inert')).toBeFalse();
  });
});
