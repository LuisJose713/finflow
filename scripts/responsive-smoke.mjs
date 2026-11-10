/**
 * Visual-geometry smoke test on synthetic financial fixtures.
 * Never requests or changes production user data.
 * Run from a GitHub Actions macOS/Linux runner with Chromium installed.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const base = 'http://127.0.0.1:4200';
const widths = [320, 375, 430, 768, 1024, 1440];
const failures = [];
const output = 'artifacts/responsive';
fs.mkdirSync(output, { recursive: true });

const user = { id: 777, email: 'qa@example.invalid', name: 'FinFlow QA', role: 'ADMIN' };
const goals = [{
  id: 123, title: 'Meta de prueba', description: 'Datos sintéticos',
  targetAmount: 1000000, currentAmount: 200000,
  deadline: '2027-06-01', status: 'active', userId: 777
}];
const categories = [
  { id: 10, name: 'Alimentación', type: 'Expense', userId: null },
  { id: 11, name: 'Salario', type: 'Income', userId: null }
];
const accounts = [
  { id: 20, name: 'Efectivo QA', type: 'cash', currency: 'COP', openingBalance: 0, balance: 300000, archived: false },
  { id: 21, name: 'Banco QA', type: 'bank', currency: 'COP', openingBalance: 0, balance: 700000, archived: false }
];
const adminStats = {
  users: 1, newUsers30Days: 1, activeUsers30Days: 1,
  transactions: 0, transactions30Days: 0,
  incomeTransactions: 0, expenseTransactions: 0,
  goals: 1, plannedExpenses: 0, pendingExpenses: 0,
  customCategories: 0, systemCategories: 2,
  monthlyActivity: []
};

async function mockApi(route) {
  const request = route.request();
  const url = new URL(request.url());
  const isAPI = (url.hostname === '127.0.0.1' && url.port === '8081') ||
    (url.hostname === 'localhost' && url.port === '8081') ||
    url.hostname === 'finflow-backend-yqhi.onrender.com' ||
    url.hostname === 'finflow-backend-production.up.railway.app';
  if (!isAPI) return route.continue();
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'content-type': 'application/json'
  };
  if (request.method() === 'OPTIONS') {
    return route.fulfill({ status: 204, headers, body: '' });
  }
  const p = url.pathname;
  let response = [];
  if (p === '/auth/me') response = user;
  else if (p === '/goals') response = goals;
  else if (p.endsWith('/contributions')) response = [
    { id: 10, goalId: 123, amount: 50000, note: 'Abono de prueba',
      createdAt: '2026-11-07T10:00:00' }
  ];
  else if (p === '/categories') response = categories;
  else if (p === '/accounts') response = accounts;
  else if (p === '/transactions/stats') response = {
    totalIncome: 0, totalExpenses: 0, balance: 0, savingsRate: 0,
    monthlyData: [], categoryData: []
  };
  else if (p === '/transactions/years') response = [2026];
  else if (p === '/admin/overview') response = adminStats;
  else if (p === '/admin/monitor') response = {
    overall: 'DEGRADED', checkedAt: '2026-11-09T20:00:00Z',
    services: [
      { key: 'api', name: 'API · Railway', status: 'UP', latencyMs: 0, detail: 'Servicio respondiendo' },
      { key: 'database', name: 'Base de datos · PostgreSQL', status: 'UP', latencyMs: 12, detail: 'Consulta de verificación correcta' },
      { key: 'web', name: 'Web · Vercel', status: 'UP', latencyMs: 94, detail: 'Responde correctamente' },
      { key: 'ai', name: 'Asesor IA', status: 'NOT_CONFIGURED', latencyMs: null, detail: 'Sin proveedor configurado' }
    ]
  };
  else if (p === '/auth/verify' || p === '/admin/verify') response = { role: 'ADMIN', status: 'ok' };
  await route.fulfill({ status: 200, headers, body: JSON.stringify(response) });
}

function assert(condition, detail) {
  if (!condition) failures.push(detail);
}

async function measureViewport(page, label, width) {
  const measurements = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      viewport: window.innerWidth,
      doc: doc.scrollWidth,
      body: document.body.scrollWidth,
      overflowing: Array.from(document.querySelectorAll('main, form, .modal, .form-grid, .field-row'))
        .filter(el => el.scrollWidth > el.clientWidth + 2)
        .slice(0, 5)
        .map(el => ({ tag: el.tagName, className: el.className,
                      scroll: el.scrollWidth, client: el.clientWidth }))
    };
  });
  if (measurements.doc > measurements.viewport + 2) {
    failures.push(`${width}px ${label}: document width ${measurements.doc}px > ${measurements.viewport}px`);
  }
  if (measurements.overflowing.length) {
    failures.push(`${width}px ${label}: internal overflow ${JSON.stringify(measurements.overflowing)}`);
  }
}

async function checkDialog(page, width, label, action, selector = '.modal') {
  try {
    await action();
    const dialog = page.locator(selector).filter({ visible: true }).first();
    await dialog.waitFor({ state: 'visible', timeout: 6000 });
    await page.waitForTimeout(120);
    const rect = await dialog.boundingBox();
    const viewport = page.viewportSize();
    assert(!!rect, `${width}px ${label}: modal not visible`);
    if (rect && viewport) {
      assert(rect.x >= -2, `${width}px ${label}: dialog clipped left (${rect.x})`);
      assert(rect.x + rect.width <= viewport.width + 2,
             `${width}px ${label}: dialog clipped right (${rect.x + rect.width})`);
      assert(rect.height <= viewport.height + 2,
             `${width}px ${label}: dialog taller than viewport (${rect.height})`);
    }
    if (width <= 640) {
      const columns = await dialog.locator('.form-grid, .field-row').first()
        .evaluate(el => getComputedStyle(el).gridTemplateColumns).catch(() => null);
      if (columns && columns.trim().split(/\s+/).length !== 1) {
        failures.push(`${width}px ${label}: inputs aren't stacked (${columns})`);
      }
    }
    await measureViewport(page, label, width);
    await page.screenshot({
      path: path.join(output, `${width}-${label.replace(/\s+/g, '-')}.png`),
      fullPage: false
    });
  } catch (error) {
    let detail = '';
    try {
      detail = await page.locator('.btn-add').first().evaluate((el) => {
        const r = el.getBoundingClientRect();
        const x = Math.max(0, Math.min(window.innerWidth - 1, r.x + r.width / 2));
        const y = Math.max(0, Math.min(window.innerHeight - 1, r.y + r.height / 2));
        const top = document.elementFromPoint(x, y);
        return JSON.stringify({
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
          topElement: top?.outerHTML?.slice(0, 350),
          display: getComputedStyle(el).display,
          visibility: getComputedStyle(el).visibility
        });
      });
      await page.screenshot({
        path: path.join(output, `FAILED-${width}-${label.replace(/\\s+/g, '-')}.png`),
        fullPage: true
      });
    } catch {}
    failures.push(`${width}px ${label}: ${error.message.slice(0, 1500)}; diagnostics=${detail}`);
  }
}

for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 780 }, locale: 'es-CO' });
  await context.route('**/*', mockApi);
  const payload = Buffer.from(JSON.stringify({ sub: user.email, exp: 4102444800, role: 'ADMIN' }))
    .toString('base64url');
  const fakeJWT = `qa.${payload}.qa`;
  await context.addInitScript(({ token, user }) => {
    // These credentials are dummy browser fixtures, never accepted by the backend.
    if (location.hostname === '127.0.0.1') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, { token: fakeJWT, user });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(`${width}px authenticated route: ${error.message.slice(0, 240)}`));
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(15000);

  for (const route of ['/accounts', '/recurring', '/categories', '/budgets', '/security', '/admin']) {
    try {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      await measureViewport(page, route, width);
      if (route === '/admin') {
        await page.getByRole('heading', { name: 'Estado de los servicios' }).waitFor({ state: 'visible' });
        await page.locator('[data-monitor-key]').first().waitFor({ state: 'visible' });
        const cards = await page.locator('[data-monitor-key]').count();
        assert(cards === 4, `${width}px /admin: expected 4 monitoring cards, received ${cards}`);
        assert(await page.locator('[data-monitor-key="ai"]').getByText('Sin configurar').isVisible(),
          `${width}px /admin: AI status must be honest when no provider is set`);
        await measureViewport(page, 'monitor de servicios', width);
      }
    } catch (error) {
      failures.push(`${width}px ${route}: ${error.message.slice(0, 220)}`);
    }
  }

  if ([320, 375, 768, 1024].includes(width)) {
    await page.goto(base + '/dashboard', { waitUntil: 'domcontentloaded' });
    // The one-time privacy education dialog legitimately blocks background
    // interaction. Acknowledge it before testing transaction controls.
    const noticeDismiss = page.locator('[data-signup-dismiss]');
    // Consent status/policy is resolved asynchronously. Wait for the
    // educational notice instead of checking visibility too early.
    await noticeDismiss.waitFor({ state: 'visible', timeout: 6000 });
    await noticeDismiss.click();
    await page.locator('.privacy-shield').waitFor({ state: 'hidden', timeout: 5000 });
    await checkDialog(page, width, 'crear-transaccion', async () => {
      await page.locator('.btn-add').click();
    });

    await page.goto(base + '/goals', { waitUntil: 'domcontentloaded' });
    await checkDialog(page, width, 'crear-meta', async () => {
      await page.locator('button.btn-new').first().click();
    });

    await page.goto(base + '/goals', { waitUntil: 'domcontentloaded' });
    await checkDialog(page, width, 'abonar-meta', async () => {
      await page.locator('button[title="Abonar"]').first().click();
    });

    await page.goto(base + '/goals', { waitUntil: 'domcontentloaded' });
    await checkDialog(page, width, 'historial-meta', async () => {
      await page.locator('button[title="Ver historial"]').first().click();
    });

    await page.goto(base + '/planned-expenses', { waitUntil: 'domcontentloaded' });
    await checkDialog(page, width, 'crear-gasto', async () => {
      await page.getByRole('button', { name: /Nuevo gasto/i }).first().click();
    });
  }

  await page.close();
  await context.close();

  // Both public auth screens share the same stylesheet. Test them without
  // any fake stored session, including the smallest iPhone viewport.
  const guest = await browser.newContext({ viewport: { width, height: 780 }, locale: 'es-CO' });
  await guest.route('**/*', mockApi);
  const guestPage = await guest.newPage();
  guestPage.on('pageerror', error => failures.push(`${width}px public route: ${error.message.slice(0, 240)}`));
  guestPage.setDefaultTimeout(7000);
  guestPage.setDefaultNavigationTimeout(15000);
  for (const authPath of ['/login', '/register']) {
    try {
      await guestPage.goto(base + authPath, { waitUntil: 'domcontentloaded' });
      await guestPage.locator('.auth-card input').first().waitFor({ state: 'visible' });
      await measureViewport(guestPage, authPath, width);
    } catch (error) {
      failures.push(`${width}px ${authPath}: ${error.message.slice(0, 220)}`);
    }
  }
  await guest.close();
  console.log(`Viewport ${width}px checked`);
}
await browser.close();

if (failures.length) {
  console.error(`Responsive check FAILED (${failures.length}):\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('Responsive check PASSED: 6 widths, 6 inline-form pages, 5 dialog types.');
}
