import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NavbarComponent } from './navbar.component';

describe('Mobile drawer interaction', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let surface: HTMLElement;
  let originalWidth: number;

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
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: {
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
