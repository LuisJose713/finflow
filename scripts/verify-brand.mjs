import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(p, 'utf8');
const logo = read('public/finflow-logo.svg');
const light = read('public/finflow-logo-light.svg');
const icon = read('public/finflow-icon-classic.svg');
for (const svg of [logo, light, icon, read('public/favicon.svg')]) {
  assert.match(svg, /^<svg /);
  assert.match(svg, /aria-label="FinFlow"/);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /#D7A94D/);
}
assert.equal(icon, read('public/favicon.svg'));
assert.match(logo, /<circle cx="161\.5" cy="27"/);
assert.match(light, /#10213A/);
for (const file of ['src/app/features/auth/login/login.component.html', 'src/app/features/auth/register/register.component.ts']) {
 assert.match(read(file), /finflow-logo-light\.svg/);
}
assert.match(read('src/app/shared/components/navbar/navbar.component.html'), /finflow-logo\.svg/);
console.log('FinFlow brand assets verified.');
