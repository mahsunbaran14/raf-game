// AC0.1: dist içinde absolute path yasak (brief §4.1). CI kapısı.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const bad = [];
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|js|css)$/.test(f)) {
      const t = readFileSync(p, 'utf8');
      if (/src=("|')\//.test(t) || /href=("|')\//.test(t)) bad.push(p);
    }
  }
}
walk(dist);
if (bad.length) {
  console.error('ABSOLUTE PATHS FOUND:', bad);
  process.exit(1);
}
console.log('check-paths: OK (all relative)');
