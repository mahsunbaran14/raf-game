// Daily board gate (brief §5.4): 365 days x one bot run each, budget 1 s/board.
// A day fails if the bot cannot reach wave 3; retry seeds are derived as
// fnv1a('raf-' + date + '-r1') then '-r2' (max 3 attempts per day).
// Result is written to reports/daily-365.json. Exit 0 = pass.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TUNING } from '../src/config/tuning.js';
import { fnv1a } from '../src/core/rng.js';
import { dailySeed } from '../src/sim/generator.js';
import { runBot } from './bot.js';

const DAYS = TUNING.DAILY_GATE_DAYS;
const MIN_WAVE = TUNING.DAILY_GATE_MIN_WAVE;
const MAX_MS = TUNING.DAILY_GATE_MAX_MS;
const PREFIX = TUNING.DAILY_SEED_PREFIX;
const START_DATE = '2026-11-21';

function addDaysISO(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

const started = performance.now();
const days = [];
const retriedDates = [];
let passedDays = 0;

for (let i = 0; i < DAYS; i += 1) {
  const date = addDaysISO(START_DATE, i);
  const seeds = [
    dailySeed(date),
    fnv1a(PREFIX + date + '-r1'),
    fnv1a(PREFIX + date + '-r2'),
  ];

  let record = null;
  for (let attempt = 0; attempt < seeds.length; attempt += 1) {
    const result = runBot(seeds[attempt], 'daily');
    record = {
      date,
      seed: seeds[attempt],
      attempts: attempt + 1,
      wave: result.wave,
      placements: result.placements,
      ms: Math.round(result.ms),
      retried: attempt > 0,
    };
    if (result.wave >= MIN_WAVE) break;
  }

  if (record.wave >= MIN_WAVE) passedDays += 1;
  else console.log(`daily gate: FAIL ${date} (best attempt wave ${record.wave})`);
  if (record.retried) retriedDates.push(date);
  days.push(record);
}

const totalMs = Math.round(performance.now() - started);
const avgMs = totalMs / DAYS;
const allPass = passedDays === DAYS;
const pass = allPass && avgMs <= MAX_MS;

const reportPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'reports', 'daily-365.json');
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      v: 1,
      generatedAt: new Date().toISOString(),
      days,
      allPass,
      totalMs,
    },
    null,
    2,
  ) + '\n',
);

console.log(`daily gate: wave>=${MIN_WAVE} ${passedDays}/${DAYS} days, allPass=${allPass}`);
console.log(
  `daily gate: retries ${retriedDates.length} day(s)${
    retriedDates.length > 0 ? ' [' + retriedDates.join(' ') + ']' : ''
  }`,
);
console.log(
  `daily gate: elapsed ${totalMs} ms, avg ${avgMs.toFixed(2)} ms/board (budget ${MAX_MS} ms)`,
);
console.log(`daily gate: report ${reportPath}`);
console.log(`daily gate: ${pass ? 'PASS' : 'FAIL'}`);

process.exitCode = pass ? 0 : 1;
