// Build gz boyut raporu + §5.2 limiti. CI kapısı.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist', import.meta.url));
const LIMIT = 5 * 1024 * 1024; // tuning MAX_BUILD_GZ_BYTES ile aynı (§5.2)
let total = 0;
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else total += gzipSync(readFileSync(p)).length;
  }
}
walk(dist);
const kb = (total / 1024).toFixed(1);
console.log(`check-size: gz total ${kb} KB (limit ${LIMIT / 1024} KB)`);
if (total > LIMIT) process.exit(1);
