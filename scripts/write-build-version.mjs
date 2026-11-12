import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

let revision = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || '';
if (!/^[a-f0-9]{40,64}$/i.test(revision)) {
  try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { revision = 'development'; }
}
if (!/^[a-f0-9]{40,64}$/i.test(revision)) revision = 'development';
mkdirSync('public', { recursive: true });
mkdirSync('src/app/core', { recursive: true });
writeFileSync('public/version.json', JSON.stringify({ version: revision }) + '\n');
writeFileSync('src/app/core/build-version.ts', `// Generated during build; public deployment identity only.\nexport const BUILD_VERSION = ${JSON.stringify(revision)};\n`);

