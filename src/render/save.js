// Minimal run-result persistence for Sprint 1 (brief §5.6 shape).
// Sprint 3 owns the full save/migration layer; this module is the single
// place that reads/writes 'raf.save' so it can be replaced wholesale.
export const SAVE_KEY = 'raf.save';
export const LEGACY_BEST_KEY = 'raf.best';
export const SAVE_VERSION = 1;

export function defaultSave() {
  return {
    v: SAVE_VERSION,
    best: 0,
    totalRuns: 0,
    streak: 0,
    dailyDone: null,
    lastDay: null,
    sound: true,
    unlocks: [],
  };
}

function finiteOr(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeSave(value) {
  const base = defaultSave();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base;
  return {
    ...base,
    ...value,
    v: finiteOr(value.v, SAVE_VERSION),
    best: Math.max(0, finiteOr(value.best, base.best)),
    totalRuns: Math.max(0, finiteOr(value.totalRuns, base.totalRuns)),
    streak: Math.max(0, finiteOr(value.streak, base.streak)),
    dailyDone: value.dailyDone ?? base.dailyDone,
    lastDay: value.lastDay ?? base.lastDay,
    sound: typeof value.sound === 'boolean' ? value.sound : base.sound,
    unlocks: Array.isArray(value.unlocks) ? value.unlocks : base.unlocks.slice(),
  };
}

export function applyRunResult(save, score) {
  const current = normalizeSave(save);
  const points = finiteOr(score, 0);
  return {
    ...current,
    best: Math.max(current.best, points),
    totalRuns: current.totalRuns + 1,
  };
}

export function loadSave(storage = globalThis.localStorage) {
  let save = defaultSave();
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (raw) save = normalizeSave(JSON.parse(raw));
  } catch {
    // Corrupt save JSON: keep defaults, still try the legacy best below.
  }
  try {
    const legacy = Number(storage?.getItem(LEGACY_BEST_KEY));
    if (Number.isFinite(legacy) && legacy > save.best) {
      save = { ...save, best: legacy };
    }
  } catch {
    // Unreadable storage: keep the save loaded so far.
  }
  return save;
}

export function recordRun(score, storage = globalThis.localStorage) {
  const next = applyRunResult(loadSave(storage), score);
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(next));
  } catch {
    // Persistence is best-effort; the in-memory best still advances.
  }
  return next;
}
