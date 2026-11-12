/**
 * Visual-geometry smoke test on synthetic financial fixtures.
 * Never requests or changes production user data.
 * Run from a GitHub Actions macOS/Linux runner with Chromium installed.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
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

async function mockApi(route, authenticated = true) {
  const request = route.request();
  const url = new URL(request.url());
  const isAPI = (url.origin === base && url.pathname.startsWith('/api/')) || (url.hostname === '127.0.0.1' && url.port === '8081') ||
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
  const p = url.pathname.replace(/^\/api(?=\/)/, '');
  if (p === '/auth/me' && !authenticated) return route.fulfill({ status: 401, headers, body: '{}' });
  let response = [];
  if (p === '/auth/me') response = user;
  else if (p === '/auth/session') response = { user };
  else if (p === '/preferences/ui') response = { hiddenCards: [] };
  else if (p.startsWith('/preferences/ui/')) response = { saved: true };
  else if (p === '/goals') response = goals;
  else if (p.endsWith('/contributions')) response = [
    { id: 10, goalId: 123, amount: 50000, note: 'Abono de prueba',
      createdAt: '2026-11-07T10:00:00' }
  ];
  else if (p === '/categories') response = categories;
  else if (p === '/accounts') response = accounts;
  else if (p === '/planned-expenses') response = [
    { id: 'pending-1', title: 'Arriendo QA', amount: 450000, status: 'pending', dueDate: '2027-01-10', categoryId: 10 },
    { id: 'pending-2', title: 'Servicios QA', amount: 120000, status: 'pending', dueDate: '2027-01-20', categoryId: 10 },
    { id: 'done-1', title: 'Compra QA', amount: 50000, status: 'done', dueDate: '2026-11-01', categoryId: 10 }
  ];
  else if (p === '/advisor/cards') response = [];
  else if (p === '/advisor/chat') response = { response: 'Respuesta de prueba del asesor.' };
  else if (p === '/transactions/stats') response = {
    totalIncome: 0, totalExpenses: 0, balance: 0, savingsRate: 0,
    monthlyData: [], categoryData: []
  };
  else if (p === '/transactions/monthly-stats') response = [
    [2150000, 1370000], [2420000, 1680000], [2280000, 1520000],
    [2850000, 1720000], [2600000, 1850000], [2900000, 1600000]
  ].map(([income, expenses], index) => {
    // Keep fixtures in the selected calendar period as the CI date advances.
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return { month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, income, expenses };
  });
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
    const diagnostics = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return [];
      const bounds = main.getBoundingClientRect();
      return Array.from(main.querySelectorAll('*')).flatMap(element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (rect.right <= bounds.right + 2 && rect.left >= bounds.left - 2) return [];
        return [{ tag: element.tagName, className: element.className, x: rect.x, width: rect.width,
          right: rect.right, position: style.position, overflow: style.overflow, transform: style.transform }];
      }).slice(0, 15);
    });
    fs.writeFileSync(path.join(output, `${width}-${label}-overflow.json`), JSON.stringify(diagnostics, null, 2));
    failures.push(`${width}px ${label}: overflow descendants ${JSON.stringify(diagnostics)}`);
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

async function checkDrawerGesture(page, width) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 60, y: 190, id: 1 }] });
    for (const x of [85, 115, 150]) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: 191, id: 1 }] });
      await page.waitForTimeout(20);
    }
    const tracking = await page.locator('#finflow-sidebar').evaluate(panel => ({
      dragging: panel.classList.contains('dragging'),
      offset: new DOMMatrix(getComputedStyle(panel).transform).m41,
      width: panel.getBoundingClientRect().width,
    }));
    assert(tracking.dragging && tracking.offset < 0 && tracking.offset > -tracking.width,
      `${width}px drawer must follow the finger before release: ${JSON.stringify(tracking)}`);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.locator('#finflow-sidebar.open').waitFor({ state: 'visible' });
    await page.screenshot({ path: path.join(output, `${width}-drawer-tracking.png`) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width - 8, y: 190, id: 1 }] });
    for (const dx of [25, 60, 100]) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width - 8 - dx, y: 191, id: 1 }] });
      await page.waitForTimeout(20);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => !document.querySelector('#finflow-sidebar')?.classList.contains('open'));
    await page.locator('#finflow-sidebar').waitFor({ state: 'hidden' });
  } catch (error) {
    failures.push(`${width}px drawer gesture: ${error.message}`);
  } finally { await cdp.detach(); }
}

for (const width of widths) {
  const context = await browser.newContext({ viewport: { width, height: 780 }, locale: 'es-CO', hasTouch: width <= 768 });
  await context.route('**/*', mockApi);
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(`${width}px authenticated route: ${error.message.slice(0, 240)}`));
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(15000);

  for (const route of ['/accounts', '/recurring', '/categories', '/budgets', '/security', '/admin', '/advisor']) {
    try {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(200);
      await measureViewport(page, route, width);
      // The conversation keeps its composer unobstructed; financial workspace
      // routes retain the shared transaction shortcut.
      const fab = page.getByRole('button', { name: 'Nueva transacción', exact: true });
      if (route === '/advisor') {
        assert(await fab.count() === 0, `${width}px /advisor: the floating transaction shortcut must not cover the composer`);
      } else {
        await fab.waitFor({ state: 'visible', timeout: 6000 });
        assert(await fab.count() === 1, `${width}px ${route}: duplicate transaction buttons`);
      }
      if (route === '/accounts' && [320, 768, 1440].includes(width)) {
        await fab.click();
        await page.getByRole('dialog', { name: 'Nueva transacción' }).waitFor({ state: 'visible' });
        await page.getByRole('button', { name: 'Cerrar formulario' }).click();
        await page.getByRole('dialog', { name: 'Nueva transacción' }).waitFor({ state: 'hidden' });
      }
      if (route === '/advisor') {
        await page.getByRole('heading', { name: '¿En qué puedo ayudarte?' }).waitFor({ state: 'visible' });
        await page.locator('.chat-topbar img.brand-avatar[src="/finflow-icon-classic.svg"]').waitFor({ state: 'visible' });
        await page.locator('.welcome-panel img.welcome-mark[src="/finflow-icon-classic.svg"]').waitFor({ state: 'visible' });
        assert(await page.locator('.cards-grid, .advisor-header').count() === 0,
          `${width}px /advisor: old panels must not occupy the chat`);
        const layout = await page.locator('.chat-layout').boundingBox();
        const header = await page.locator('.chat-topbar').boundingBox();
        const input = await page.locator('#finflow-advisor-input').boundingBox();
        assert(layout && header && input && input.y > header.y + header.height,
          `${width}px /advisor: composer must stay below a compact chat header`);
        const sizing = await page.locator('.advisor-main').evaluate(main => {
          const mainRect = main.getBoundingClientRect();
          const chatRect = main.querySelector('.chat-layout').getBoundingClientRect();
          return {
            mainWidth: mainRect.width, chatWidth: chatRect.width,
            mainHeight: mainRect.height, chatHeight: chatRect.height,
            chatRight: chatRect.right, viewport: innerWidth,
          };
        });
        assert(Math.abs(sizing.chatWidth - sizing.mainWidth) <= 3,
          `${width}px /advisor: chat must fill all available workspace width: ${JSON.stringify(sizing)}`);
        assert(sizing.chatRight <= width + 2,
          `${width}px /advisor: chat must not overflow the viewport`);
        if ([1024,1440].includes(width)) {
          const toggle = page.getByRole('button', { name: 'Contraer menú' });
          await toggle.click();
          await page.waitForFunction(before => {
            const main = document.querySelector('.advisor-main');
            return main.getBoundingClientRect().width > before + 75;
          }, sizing.mainWidth);
          const shrunk = await page.locator('.advisor-main').evaluate(main => ({
            main: main.getBoundingClientRect().width,
            chat: main.querySelector('.chat-layout').getBoundingClientRect().width,
          }));
          assert(shrunk.main > sizing.mainWidth + 75 && Math.abs(shrunk.chat - shrunk.main) <= 3,
            `${width}px /advisor: chat must expand when menu collapses`);
          await page.getByRole('button', { name: 'Expandir menú' }).click();
          await page.waitForFunction(before =>
            Math.abs(document.querySelector('.advisor-main').getBoundingClientRect().width - before) <= 3,
            sizing.mainWidth);
        }
        if ([320, 768, 1440].includes(width)) {
          await page.locator('#finflow-advisor-input').fill('¿Cómo organizo mis gastos?');
          await page.getByRole('button', { name: 'Enviar mensaje' }).click();
          await page.getByText('Respuesta de prueba del asesor.').waitFor({ state: 'visible' });
          await page.getByRole('button', { name: 'Copiar respuesta de FinFlow AI' }).waitFor({ state: 'visible' });
          await measureViewport(page, 'advisor-chat', width);
          await page.screenshot({ path: path.join(output, `${width}-advisor-chat.png`) });
          await page.getByRole('button', { name: 'Iniciar un chat nuevo' }).click();
          await page.getByRole('heading', { name: '¿En qué puedo ayudarte?' }).waitFor({ state: 'visible' });
        }
      }
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
    // An existing authenticated user does not necessarily have a queued
    // educational notice. Acknowledge it only if it is actually displayed.
    const noticeDismiss = page.locator('[data-signup-dismiss]');
    if (await noticeDismiss.isVisible()) {
      await noticeDismiss.click();
      await page.locator('.privacy-shield').waitFor({ state: 'hidden', timeout: 5000 });
    }
    await page.locator('.stat-card.balance .balance-value').waitFor({ state: 'visible' });
    await page.locator('.trend-chart .income-line').waitFor({ state: 'visible' });
    await page.locator('.trend-chart .expense-line').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: '12 meses' }).click();
    await page.waitForFunction(() =>
      document.querySelector('button[aria-pressed="true"]')?.textContent?.includes('12 meses') ?? false
    );
    await measureViewport(page, 'dashboard-v4', width);
    if ([375, 768].includes(width)) await checkDrawerGesture(page, width);
    await checkDialog(page, width, 'crear-transaccion', async () => {
      await page.getByRole('button', { name: 'Nueva transacción', exact: true }).click();
    });

    await page.goto(base + '/goals', { waitUntil: 'domcontentloaded' });
    await page.locator('.goal-card .goal-actions').first().waitFor({ state: 'visible' });
    const iconActions = await page.locator('.goal-card .goal-actions .btn-icon').first().evaluate(button => ({
      icon: Boolean(button.querySelector('svg')),
      width: button.getBoundingClientRect().width,
      height: button.getBoundingClientRect().height,
    }));
    assert(iconActions.icon && iconActions.width >= 44 && iconActions.height >= 44,
      `${width}px goal actions need menu-style vector icons and 44px touch targets`);
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
    await page.getByText('2 pendientes', { exact: true }).waitFor({ state: 'visible' });
    const pendingActions = await page.locator('.expense-actions .btn-execute').first().evaluate(button => {
      const bounds = button.getBoundingClientRect();
      return { opacity: getComputedStyle(button.parentElement).opacity, width: bounds.width, height: bounds.height };
    });
    assert(pendingActions.opacity === '1' && pendingActions.width >= 44 && pendingActions.height >= 44,
      `${width}px pending expense actions need visible 44px touch targets: ${JSON.stringify(pendingActions)}`);
    await checkDialog(page, width, 'crear-gasto', async () => {
      await page.getByRole('button', { name: /Nuevo gasto/i }).first().click();
    });
  }

  await page.close();
  await context.close();

  // Both public auth screens share the same stylesheet. Test them without
  // any fake stored session, including the smallest iPhone viewport.
  const guest = await browser.newContext({ viewport: { width, height: 780 }, locale: 'es-CO' });
  await guest.route('**/*', route => mockApi(route, false));
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

