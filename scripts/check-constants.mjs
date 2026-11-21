// §2.7: tuning.js dışında oyun sabiti yasak. Heuristik lint:
// sim/core/renderer kaynaklarında 0/1/-1/2 (indeks aritmetiği) dışı
// büyüklükte sayı arar; config/ ve test/ muaf.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src', import.meta.url));
const bad = [];
const ALLOWED = new Set([0, 1, -1, 2, 100]);
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.js')) {
      const rel = p.slice(root.length + 1);
      if (rel.startsWith('config/')) continue;
      const lines = readFileSync(p, 'utf8').split('\n');
      lines.forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '');
        for (const m of code.matchAll(/(?<![\w.])\d+(\.\d+)?(?![\w.])/g)) {
          const n = Number(m[0]);
          if (!ALLOWED.has(n)) bad.push(`${rel}:${i + 1}: "${m[0]}"`);
        }
      });
    }
  }
}
walk(root);
if (bad.length) {
  console.error('GAME CONSTANTS OUTSIDE tuning.js:', bad);
  process.exit(1);
}
console.log('check-constants: OK');
