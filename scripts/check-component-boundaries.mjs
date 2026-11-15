// Keep component presentation in separate .html and .css/.scss files.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve('src/app');
const components = [];
function collect(dir) {
  for (const item of readdirSync(dir)) {
    const full = join(dir, item);
    if (statSync(full).isDirectory()) collect(full);
    else if (full.endsWith('.component.ts') && !full.endsWith('.spec.ts')) components.push(full);
  }
}
collect(root);
const failures = [];
for (const file of components) {
  const source = readFileSync(file, 'utf8');
  if (!source.includes('@Component(')) continue;
  if (/\btemplate\s*:\s*(?:\x60|'|")/.test(source)) failures.push(file + ': inline HTML');
  if (/\bstyles\s*:\s*\[/.test(source)) failures.push(file + ': inline CSS');
  for (const [, target] of source.matchAll(/\b(?:templateUrl|styleUrl)\s*:\s*['"]([^'"]+)['"]/g)) {
    if (!existsSync(resolve(dirname(file), target))) failures.push(file + ': missing ' + target);
  }
}
if (failures.length) {
  console.error('Component separation check failed:\n' + failures.join('\n'));
  process.exit(1);
}
console.log('Angular component boundaries OK (' + components.length + ' files).');
