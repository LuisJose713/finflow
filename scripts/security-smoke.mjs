/** Serve the real production build with the tracked headers, then verify CSP in Chromium. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist/finance-app-angular/browser');
const config = JSON.parse(await fs.readFile('vercel.json', 'utf8'));
const headers = Object.fromEntries(config.headers.find(rule => rule.source === '/(.*)').headers
  .map(header => [header.key, header.value]));
assert.match(headers['Content-Security-Policy'], /script-src 'self';/);
assert.ok(!headers['Content-Security-Policy'].includes("script-src 'self' 'unsafe-inline'"));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer(async (request, response) => {
  try {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) && file !== root) {
      response.writeHead(404).end(); return;
    }
    if (!(await fs.stat(file).catch(() => null))?.isFile()) file = path.join(root, 'index.html');
    response.writeHead(200, { ...headers, 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream' });
    response.end(await fs.readFile(file));
  } catch { response.writeHead(500).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'],
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.securityViolations = [];
    document.addEventListener('securitypolicyviolation', event => {
      window.securityViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
    });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/login', '/register']) {
    await page.goto(base + route);
    assert.equal(await page.title(), 'FinFlow');
    await page.locator('.auth-card input').first().waitFor({ state: 'visible' });
    assert.deepEqual(await page.evaluate(() => window.securityViolations), [], `${route}: app must work under enforced CSP`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).margin), '0px', 'Production stylesheet must load without an inline handler');
  }
  assert.deepEqual(errors, [], 'No application runtime errors');
  await page.evaluate(() => {
    const injected = document.createElement('script');
    injected.textContent = 'window.untrustedScriptExecuted = true';
    document.body.appendChild(injected);
    fetch('https://blocked.example.invalid/synthetic-test').catch(() => undefined);
  });
  await page.waitForFunction(() => window.securityViolations.some(item => item.directive === 'connect-src')
    && window.securityViolations.some(item => item.blocked === 'inline'));
  assert.equal(await page.evaluate(() => window.untrustedScriptExecuted === true), false);
  console.log('Security smoke PASSED: production startup, styles, inline script block and external connection block.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
