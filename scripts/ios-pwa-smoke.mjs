/** Synthetic iPhone WebKit checks. No production credentials or financial writes. */
import { webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await webkit.launch({ headless: true });
const base = 'http://127.0.0.1:4200';
const hidden = new Set();
const user = { id: 777, name: 'Prueba', email: 'test@example.invalid', role: 'USER' };
const category = { id: 10, name: 'Alimentación y compras esenciales del hogar', type: 'Expense', userId: 777 };
fs.mkdirSync('artifacts/ios-web', { recursive: true });
try {
  for (const width of [320, 390, 430]) {
    const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width, height: 844 }, locale: 'es-CO' });
    let authenticated = false;
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== base) return route.abort();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      const p = url.pathname.slice(4);
      let body = [];
      if (p === '/auth/me') {
        if (!authenticated) return route.fulfill({ status: 401, json: {} });
        body = user;
      } else if (p === '/preferences/ui') body = { hiddenCards: [...hidden] };
      else if (p.startsWith('/preferences/ui/')) {
        const id = decodeURIComponent(p.split('/').at(-1));
        const value = route.request().postDataJSON().hidden;
        value ? hidden.add(id) : hidden.delete(id); body = { saved: true };
      } else if (p === '/categories') body = [category];
      else if (p === '/privacy/policy') body = { ready: false, version: 'test' };
      else if (p === '/transactions/years') body = [2026];
      else if (p === '/transactions') body = [{ id: 7, description: 'Compra de prueba', amount: 1250.5, type: 'expense', categoryId: 10, status: 'pending', currency: 'COP', date: '2026-11-12T00:00:00' }];
      return route.fulfill({ status: 200, json: body });
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/login');
    const email = page.locator('.auth-card input').first(); await email.waitFor(); await email.focus();
    assert.ok(Number(await email.evaluate(el => getComputedStyle(el).fontSize.replace('px', ''))) >= 16);
    assert.ok(Math.abs(await page.evaluate(() => visualViewport.scale) - 1) < .01);
    authenticated = true;
    await page.goto(base + '/categories');
    const categories = page.locator('.categories-heading'); await categories.waitFor();
    await Promise.all([page.waitForResponse(r => r.url().includes('/preferences/ui/categories.intro') && r.request().method() === 'PUT'), categories.getByRole('button', { name: 'Ocultar presentación', exact: true }).click()]);
    await categories.waitFor({ state: 'hidden' });
    await page.reload(); await categories.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Mostrar presentación', exact: true }).click();
    await categories.waitFor({ state: 'visible' });
    await page.goto(base + '/advisor');
    const advisor = page.locator('.advisor-header'); await advisor.waitFor();
    await advisor.getByRole('button', { name: 'Ocultar presentación', exact: true }).click();
    await advisor.waitFor({ state: 'hidden' });
    assert.ok(await page.getByRole('button', { name: 'Comenzar una conversación nueva' }).isVisible());
    await page.getByRole('button', { name: 'Mostrar presentación', exact: true }).click();
    await advisor.waitFor({ state: 'visible' });
    await page.goto(base + '/transactions');
    await page.getByRole('button', { name: 'Nueva transacción', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nueva transacción', exact: true });
    const amount = dialog.locator('input[formControlName="amount"]'); await amount.pressSequentially('250000');
    await dialog.locator('input[formControlName="description"]').click();
    assert.equal(await amount.inputValue(), '250.000,00');
    await amount.fill('1.250,50'); await dialog.locator('input[formControlName="description"]').click();
    assert.equal(await amount.inputValue(), '1.250,50');
    await dialog.locator('select[formControlName="categoryId"]').selectOption({ label: category.name });
    await dialog.locator('.select-readable-value').filter({ hasText: category.name }).waitFor({ state: 'visible' });
    const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, scale: visualViewport.scale }));
    assert.ok(geometry.scroll <= geometry.width + 2 && Math.abs(geometry.scale - 1) < .01);
    await page.screenshot({ path: `artifacts/ios-web/${width}-cop-select.png`, fullPage: false });
    await dialog.getByRole('button', { name: 'Cerrar formulario' }).click();
    await page.locator('summary[aria-label="Acciones de Compra de prueba"]').click();
    await page.getByRole('button', { name: 'Editar movimiento', exact: true }).click();
    await page.getByRole('dialog', { name: 'Editar movimiento' }).waitFor();
    assert.deepEqual(errors, [], 'No WebKit runtime errors');
    await context.close(); hidden.clear();
    console.log(`iPhone WebKit ${width}px: readable controls, scale 1, COP cents, card persistence and edit dialog passed`);
  }
} finally { await browser.close(); }
