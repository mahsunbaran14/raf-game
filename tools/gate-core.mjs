// Core generation gate (brief §5.4): bot must reach wave 4 on >=90% of the
// first 200 seeds and no run may end before placement 12. Exit 0 = pass.
import { TUNING } from '../src/config/tuning.js';
import { runBot } from './bot.js';

const SEEDS = TUNING.CORE_GATE_SEEDS;
const MIN_WAVE = TUNING.CORE_GATE_MIN_WAVE;
const MIN_RATE = TUNING.CORE_GATE_MIN_RATE;
const MAX_MS = TUNING.CORE_GATE_MAX_MS;
const MIN_PLACEMENTS = TUNING.CORE_GATE_MAX_PLACEMENTS_NO_DEATH;

const started = performance.now();
let reached = 0;
let capped = 0;
const belowWave = [];
const earlyDeaths = [];

for (let seed = 1; seed <= SEEDS; seed += 1) {
  const result = runBot(seed);
  if (result.wave >= MIN_WAVE) reached += 1;
  else belowWave.push({ seed, wave: result.wave, placements: result.placements });
  if (result.capped) capped += 1;
  if (result.state.status === 'over' && result.placements < MIN_PLACEMENTS) {
    earlyDeaths.push({ seed, placements: result.placements });
  }
}
const elapsed = performance.now() - started;
const rate = reached / SEEDS;

const pass = rate >= MIN_RATE && earlyDeaths.length === 0 && elapsed <= MAX_MS;

console.log(
  `core gate: wave>=${MIN_WAVE} ${reached}/${SEEDS} rate=${rate.toFixed(3)} (min ${MIN_RATE})`,
);
console.log(
  `core gate: early deaths (run ended before placement ${MIN_PLACEMENTS}) ${earlyDeaths.length}`,
);
console.log(`core gate: elapsed ${Math.round(elapsed)} ms (budget ${MAX_MS} ms)`);
if (capped > 0) console.log(`core gate: safety-cap hits ${capped}`);
if (belowWave.length > 0) {
  const list = belowWave
    .slice(0, 20)
    .map((f) => `${f.seed}:w${f.wave}/p${f.placements}`)
    .join(' ');
  console.log(`core gate: below wave ${MIN_WAVE} [${list}]${belowWave.length > 20 ? ' ...' : ''}`);
}
if (earlyDeaths.length > 0) {
  const list = earlyDeaths
    .slice(0, 20)
    .map((f) => `${f.seed}:p${f.placements}`)
    .join(' ');
  console.log(`core gate: early deaths [${list}]${earlyDeaths.length > 20 ? ' ...' : ''}`);
}
console.log(`core gate: ${pass ? 'PASS' : 'FAIL'}`);

process.exitCode = pass ? 0 : 1;
