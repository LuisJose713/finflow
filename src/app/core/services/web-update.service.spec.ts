import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_BUILD, WebUpdateService } from './web-update.service';

describe('Web update notices', () => {
  let updates: WebUpdateService;
  let http: HttpTestingController;
  const current = 'a'.repeat(40), newer = 'b'.repeat(40);
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), { provide: APP_BUILD, useValue: current }] });
    updates = TestBed.inject(WebUpdateService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });
  function answer(version: string) { http.expectOne(request => request.url === '/version.json').flush({ version }); }

  it('offers an update only for a different published version and respects dismissal', () => {
    answer(current); expect(updates.available()).toBeFalse();
    updates.check(true); answer(newer); expect(updates.available()).toBeTrue();
    updates.dismiss(); expect(updates.available()).toBeFalse();
    updates.check(true); answer(newer); expect(updates.available()).toBeFalse();
    updates.check(true); answer('c'.repeat(40)); expect(updates.available()).toBeTrue();
  });
  it('ignores malformed metadata and temporary connection errors', () => {
    answer('<html>unavailable</html>'); expect(updates.available()).toBeFalse();
    updates.check(true);
    http.expectOne(request => request.url === '/version.json').flush({}, { status: 503, statusText: 'Unavailable' });
    expect(updates.available()).toBeFalse();
  });
});
