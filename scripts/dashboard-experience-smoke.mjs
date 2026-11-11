/** Dashboard regression checks use intercepted, synthetic API responses only. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--no-sandbox'],
});
const base = 'http://127.0.0.1:4200';
const user = { id: 777, name: 'FinFlow QA', email: 'qa@example.invalid', role: 'USER' };
const today = new Date();
const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
const errors = [];
fs.mkdirSync('artifacts/dashboard', { recursive: true });

try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'es-CO' });
    let failPayments = true;
    let empty = false;
    const requests = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['localhost', '127.0.0.1', 'finflow-backend-production.up.railway.app'].includes(url.hostname)
        || (url.hostname !== 'finflow-backend-production.up.railway.app' && url.port !== '8081')) {
        if (url.origin === base) return route.continue();
        return route.abort();
      }
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'content-type': 'application/json' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      assert.equal(route.request().method(), 'GET', 'Dashboard must not write financial data');
      requests.push(url.pathname);
      let data = [];
      if (url.pathname === '/auth/me') data = user;
      if (url.pathname === '/transactions/stats') data = { totalIncome: 1000000, totalExpenses: 1200000, balance: -200000, savingsRate: -20 };
      if (url.pathname === '/transactions/monthly-stats') data = empty ? [] : [{ month, income: 1000000, expenses: 1200000 }];
      if (url.pathname === '/planned-expenses') {
        if (failPayments) return route.fulfill({ status: 503, headers, body: '{}' });
        data = empty ? [] : [{ id: 'payment-1', title: 'Arriendo de prueba', amount: 450000,
          dueDate: `${month}-01`, status: 'pending', userId: 777 }];
      }
      return route.fulfill({ status: 200, headers, body: JSON.stringify(data) });
    });
    await context.addInitScript(user => {
      if (location.hostname !== '127.0.0.1') return;
      const payload = btoa(JSON.stringify({ sub: user.email, exp: 4102444800, role: user.role }));
      localStorage.setItem('token', `qa.${payload}.qa`);
      localStorage.setItem('user', JSON.stringify(user));
    }, user);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${base}/dashboard`);
    const focus = page.locator('app-monthly-focus');
    await focus.getByText('más gastos que ingresos', { exact: false }).waitFor();
    await focus.getByRole('button', { name: 'Reintentar pagos' }).waitFor();
    assert.match(await focus.locator('.month-balance').innerText(), /COP.*200\.000/);
    await focus.locator('summary').click();
    await focus.getByText('no representa dinero disponible para gastar', { exact: false }).waitFor();
    const summaryRequests = requests.filter(path => path === '/transactions/monthly-stats').length;
    failPayments = false;
    await focus.getByRole('button', { name: 'Reintentar pagos' }).click();
    await focus.getByText('Arriendo de prueba', { exact: true }).waitFor();
    assert.equal(requests.filter(path => path === '/transactions/monthly-stats').length, summaryRequests,
      'Retrying payments must not reload the monthly summary');
    const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(geometry.scroll <= geometry.width + 2, `Dashboard overflows at ${width}px`);
    for (const link of await focus.locator('a').all()) {
      assert.ok((await link.boundingBox()).height >= 44, 'Actions need 44px touch targets');
    }
    await page.screenshot({ path: `artifacts/dashboard/${width}-monthly-plan.png`, fullPage: true });
    await focus.getByRole('link', { name: 'Revisar pagos planeados' }).click();
    await page.waitForURL('**/planned-expenses');
    empty = true;
    await page.goto(`${base}/dashboard`);
    await focus.getByText('Tu mes empieza con el primer movimiento.').waitFor();
    await focus.getByRole('link', { name: 'Planear un gasto' }).waitFor();
    await page.getByText('Tu actividad aparecerá aquí', { exact: true }).waitFor();
    await context.close();
    console.log(`Dashboard ${width}px: monthly deficit, partial failure, retry, navigation and empty state passed`);
  }
  assert.deepEqual(errors, [], 'No uncaught browser errors');
} finally {
  await browser.close();
}
