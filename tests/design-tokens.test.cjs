const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const css = readFileSync(join(__dirname, '../src/styles.scss'), 'utf8');

function theme(dark) {
  const tokens = {};
  for (const [, selector, body] of css.matchAll(/(?:^|\n)(:root|\.dark)\s*\{([^}]+)\}/g)) {
    if (selector === '.dark' && !dark) continue;
    for (const [, key, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[key] = value.trim();
  }
  return tokens;
}
function luminance(hex) {
  assert.match(hex, /^#[a-f\d]{6}$/i);
  const rgb = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
}
for (const dark of [false, true]) {
  test(`${dark ? 'dark' : 'light'} surfaces and primary actions keep readable contrast`, () => {
    const tokens = theme(dark);
    for (const [text, background] of [
      ['--ff-v4-ink', '--ff-v4-surface'],
      ['--ff-v4-muted', '--ff-v4-surface'],
      ['--ff-action-fg', '--ff-action-bg'],
      ['--ff-action-fg', '--ff-action-hover'],
    ]) {
      assert.ok(contrast(tokens[text], tokens[background]) >= 4.5, `${text} on ${background}`);
    }
  });
}
