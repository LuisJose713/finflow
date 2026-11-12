import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../../core/services/auth.service';
import { DismissibleCardDirective } from './dismissible-card.directive';
import { environment } from '../../../environments/environment';

@Component({ standalone: true, imports: [DismissibleCardDirective], template: `
  <section id="goals" appDismissibleCard="goals.intro"><h2>Planes</h2></section>
  <section id="planned" appDismissibleCard="planned-expenses.intro"><h2>Compromisos</h2></section>
` })
class CardsFixture {}

describe('dismissible presentation cards', () => {
  const currentUser = signal<{ id: string } | null>({ id: 'first-user' });
  const endpoint = environment.apiUrl + '/preferences/ui';
  beforeEach(() => {
    currentUser.set({ id: 'first-user' });
    TestBed.configureTestingModule({ imports: [CardsFixture], providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: { currentUser } },
    ] });
  });
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('restores saved choices, keeps other cards visible, and can show a hidden card again', () => {
    const fixture = TestBed.createComponent(CardsFixture); fixture.detectChanges();
    const requests = TestBed.inject(HttpTestingController);
    requests.expectOne(endpoint).flush({ hiddenCards: ['goals.intro'] }); fixture.detectChanges();
    const goals: HTMLElement = fixture.nativeElement.querySelector('#goals');
    const planned: HTMLElement = fixture.nativeElement.querySelector('#planned');
    expect(goals.style.display).toBe('none');
    expect(planned.style.display).not.toBe('none');
    const show = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((button: any) => button.textContent === 'Mostrar presentación') as HTMLButtonElement;
    show.click(); fixture.detectChanges();
    const save = requests.expectOne(endpoint + '/goals.intro');
    expect(save.request.body).toEqual({ hidden: false });
    save.flush({ cardId: 'goals.intro', hidden: false }); fixture.detectChanges();
    expect(goals.style.display).not.toBe('none');
  });

  it('hides only the selected card and rolls back if the preference cannot be saved', () => {
    const fixture = TestBed.createComponent(CardsFixture); fixture.detectChanges();
    const requests = TestBed.inject(HttpTestingController);
    requests.expectOne(endpoint).flush({ hiddenCards: [] }); fixture.detectChanges();
    fixture.nativeElement.querySelector('#goals button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#goals').style.display).toBe('none');
    expect(fixture.nativeElement.querySelector('#planned').style.display).not.toBe('none');
    requests.expectOne(endpoint + '/goals.intro').flush({}, { status: 503, statusText: 'Offline' }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#goals').style.display).not.toBe('none');
  });
});
