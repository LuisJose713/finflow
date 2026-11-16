import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminNotificationsComponent, colombiaSchedule } from './admin-notifications.component';
import { environment } from '../../../../environments/environment';

describe('Admin notification scheduling', () => {
  let fixture: ComponentFixture<AdminNotificationsComponent>;
  let component: AdminNotificationsComponent;
  let http: HttpTestingController;
  const endpoint = environment.apiUrl + '/admin/notifications';
  const list = { capabilities: { webReady: true, timezone: 'America/Bogota', webSubscriptions: 1, nativeDevices: 1 }, campaigns: [] };
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AdminNotificationsComponent], providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(AdminNotificationsComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { fixture.destroy(); http.verify(); });
  it('always interprets the administrator date as Colombia time', () => {
    expect(colombiaSchedule('2026-11-20T10:30')).toBe('2026-11-20T15:30:00.000Z');
    expect(colombiaSchedule('2026-02-30T10:30')).toBeNull();
    expect(colombiaSchedule('not a date')).toBeNull();
  });
  it('does not send incomplete schedules or dates in the past', () => {
    component.schedule();
    component.title = 'Título'; component.body = 'Mensaje'; component.when = '2000-01-01T08:00';
    component.schedule();
    expect(component.error()).toContain('fecha futura');
    http.expectNone(endpoint);
  });
  it('creates only one campaign on repeated clicks and preserves the chosen audience', () => {
    component.title = ' Novedad '; component.body = ' Mensaje '; component.audience = 'ALL';
    component.when = new Date(Date.now() + 2 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
    const when = component.when;
    component.schedule(); component.schedule();
    const request = http.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ title: 'Novedad', body: 'Mensaje', audience: 'ALL', scheduledAt: colombiaSchedule(when) });
    request.flush({ id: 'test', status: 'SCHEDULED' });
    http.expectOne(endpoint).flush(list);
    expect(component.saving()).toBeFalse();
    expect(component.title).toBe('');
    expect(component.message()).toContain('programado');
  });
  it('keeps the draft after a server rejection', () => {
    component.title = 'Título'; component.body = 'Mensaje';
    component.when = new Date(Date.now() + 2 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
    component.schedule();
    http.expectOne(endpoint).flush({ error: 'No autorizado' }, { status: 403, statusText: 'Forbidden' });
    expect(component.saving()).toBeFalse();
    expect(component.title).toBe('Título');
    expect(component.error()).toBe('No autorizado');
  });
});
