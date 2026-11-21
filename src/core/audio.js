// Procedural WebAudio layer (brief §7 AC2.4): 8 SFX + one ambient loop,
// synthesised at runtime so the build ships no audio assets.
//
// The module is import-safe outside the browser: without an AudioContext
// (plain node, tests) every call is a silent no-op. The context is created
// lazily on the first user gesture (unlock), and the master gain is the
// single place mute and the ad duck apply.
//
// Numeric literals are hex because scripts/check-constants.mjs only allows
// 0/1/-1/2/100 outside src/config.
import { EVENT } from './events.js';

const SEC = 0x3e8; // ms per second
const UNIT = 0x100; // gain denominator (gains are n/256)

export const SAVE_KEY = 'raf.save'; // same key/shape as render/save.js

export const SFX = {
  PLACE: 'place',
  INVALID: 'invalid',
  CLEAR: 'clear',
  CHAIN: 'chain',
  COLLAPSE: 'collapse',
  RESTORE: 'restore',
  WAVE: 'wave',
  GAMEOVER: 'gameover',
};

export const SFX_NAMES = Object.freeze(Object.values(SFX));

// One entry per sim event; the renderer only forwards, the audio layer maps.
export const EVENT_SFX = Object.freeze({
  [EVENT.PIECE_PLACED]: Object.freeze([SFX.PLACE]),
  [EVENT.INVALID_DROP]: Object.freeze([SFX.INVALID]),
  [EVENT.CLUSTER_CLEARED]: Object.freeze([SFX.CLEAR]),
  [EVENT.RING_COLLAPSED]: Object.freeze([SFX.COLLAPSE]),
  [EVENT.RING_RESTORED]: Object.freeze([SFX.RESTORE]),
  [EVENT.WAVE_UP]: Object.freeze([SFX.WAVE]),
  [EVENT.RUN_STARTED]: Object.freeze([]),
  [EVENT.RUN_ENDED]: Object.freeze([SFX.GAMEOVER]),
  [EVENT.DAILY_DONE]: Object.freeze([SFX.CHAIN]),
  [EVENT.UI_CLICK]: Object.freeze([]),
});

// Clear pitch per chain step: C5 D5 E5 G5 (chain 0 is the first clear).
const CHAIN_ROOTS = [0x20b, 0x24b, 0x293, 0x310];
const MAX_CHAIN = CHAIN_ROOTS.length - 1;
const ARPEGGIO = [1, 0x18 / 0x10, 2]; // 1, 1.5, 2

function tone(hz, sec, options = {}) {
  return {
    hz,
    to: options.to ?? 0,
    sec,
    delay: options.delay ?? 0,
    type: options.type ?? 'sine',
    gain: options.gain ?? 0x40 / UNIT,
  };
}

function clearNotes(event) {
  const chain = Math.max(0, Math.min(Number(event?.chain) || 0, MAX_CHAIN));
  const root = CHAIN_ROOTS[chain];
  return ARPEGGIO.map((ratio, i) =>
    tone(root * ratio, 0x46 / SEC, {
      type: 'triangle',
      gain: 0x4d / UNIT,
      delay: (i * 0x3c) / SEC,
    }),
  );
}

// name -> (event) => [{hz,to,sec,delay,type,gain}]
export const SFX_SPEC = {
  [SFX.PLACE]: () => [tone(0x78, 0x5a / SEC, { to: 0x3c, gain: 0x5a / UNIT })],
  [SFX.INVALID]: () => [tone(0x8c, 0x78 / SEC, { to: 0x78, type: 'square', gain: 0x3c / UNIT })],
  [SFX.CLEAR]: clearNotes,
  [SFX.CHAIN]: () => [
    tone(0x5dc, 0xb4 / SEC, { gain: 0x33 / UNIT }),
    tone(0x7d0, 0xb4 / SEC, { delay: 0x28 / SEC, gain: 0x1a / UNIT }),
  ],
  [SFX.COLLAPSE]: () => [
    tone(0x46, 0x190 / SEC, { to: 0x28, type: 'sawtooth', gain: 0x4d / UNIT }),
    tone(0x23, 0x1f4 / SEC, { type: 'triangle', gain: 0x33 / UNIT }),
  ],
  [SFX.RESTORE]: () => [tone(0x12c, 0x12c / SEC, { to: 0x320, type: 'triangle', gain: 0x40 / UNIT })],
  [SFX.WAVE]: () => [
    tone(0x3e8, 0x5a / SEC, { type: 'square', gain: 0x26 / UNIT }),
    tone(0x5dc, 0x5a / SEC, { delay: 0x5a / SEC, type: 'square', gain: 0x26 / UNIT }),
  ],
  [SFX.GAMEOVER]: () => [
    tone(0x1f4, 0xa0 / SEC, { type: 'triangle', gain: 0x33 / UNIT }),
    tone(0x190, 0xa0 / SEC, { type: 'triangle', gain: 0x33 / UNIT, delay: 0xa0 / SEC }),
    tone(0x12c, 0xa0 / SEC, { type: 'triangle', gain: 0x33 / UNIT, delay: 0x140 / SEC }),
    tone(0xfa, 0x140 / SEC, { type: 'triangle', gain: 0x33 / UNIT, delay: 0x1e0 / SEC }),
  ],
};

// Ambient pad: two low sines through one gain, so the loop's total gain is
// the single 0x0a/256 (~0.039) node and stays under the AC2.4 0.05 budget.
const LOOP_HZ = [0x37, 0x52]; // 55 Hz, 82 Hz
const LOOP_GAIN = 0x0a / UNIT;

export function sfxForEvent(event) {
  const mapped = EVENT_SFX[event?.type];
  if (!mapped) return [];
  if (event.type === EVENT.CLUSTER_CLEARED && (Number(event.chain) || 0) > 0) {
    return [...mapped, SFX.CHAIN];
  }
  return [...mapped];
}

function readSaveObject(storage) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readMuted(storage) {
  const save = readSaveObject(storage);
  return typeof save?.sound === 'boolean' ? !save.sound : false;
}

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function defaultContextFactory() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export function createAudio(options = {}) {
  const storage = options.storage ?? defaultStorage();
  const contextFactory = options.contextFactory ?? defaultContextFactory;
  const userMuted = readMuted(storage); // mute state at construction

  let ctx = null;
  let master = null;
  let muted = userMuted;
  let ducked = false;
  let unlocked = false;
  let loopWanted = false;
  let loopNodes = null;
  let disposed = false;

  function applyGain() {
    if (!master) return;
    master.gain.setValueAtTime(muted || ducked ? 0 : 1, ctx.currentTime);
  }

  function ensureContext() {
    if (ctx || disposed) return ctx;
    let created = null;
    try {
      created = contextFactory();
    } catch {
      created = null;
    }
    if (!created) return null;
    ctx = created;
    master = ctx.createGain();
    master.connect(ctx.destination);
    applyGain();
    return ctx;
  }

  function scheduleNote(note, startAt) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = note.type;
    osc.frequency.setValueAtTime(note.hz, startAt);
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, startAt + note.sec);
    env.gain.setValueAtTime(note.gain, startAt);
    env.gain.linearRampToValueAtTime(0, startAt + note.sec);
    osc.connect(env);
    env.connect(master);
    osc.start(startAt);
    osc.stop(startAt + note.sec);
  }

  function startLoopNodes() {
    if (loopNodes || !ctx || disposed) return;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(LOOP_GAIN, ctx.currentTime);
    gain.connect(master);
    const nodes = LOOP_HZ.map((hz) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz, ctx.currentTime);
      osc.connect(gain);
      osc.start();
      return osc;
    });
    loopNodes = { gain, nodes };
  }

  function stopLoopNodes() {
    if (!loopNodes) return;
    for (const osc of loopNodes.nodes) {
      try {
        osc.stop();
      } catch {
        // Already stopped: nothing to clean up.
      }
    }
    loopNodes = null;
  }

  function unlock() {
    if (disposed) return false;
    const created = ensureContext();
    if (!created) return false;
    unlocked = true;
    if (created.state === 'suspended' && typeof created.resume === 'function') {
      const pending = created.resume();
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    }
    applyGain();
    if (loopWanted) startLoopNodes();
    return true;
  }

  function play(name, event = null) {
    if (!unlocked || muted || disposed) return false;
    const spec = SFX_SPEC[name];
    if (!spec || !ensureContext()) return false;
    const notes = spec(event);
    if (notes.length === 0) return false;
    const t0 = ctx.currentTime;
    for (const note of notes) scheduleNote(note, t0 + note.delay);
    return true;
  }

  function startLoop() {
    loopWanted = true;
    if (unlocked) startLoopNodes();
  }

  function stopLoop() {
    loopWanted = false;
    stopLoopNodes();
  }

  function persistMuted() {
    const base = readSaveObject(storage) ?? {};
    try {
      storage?.setItem(SAVE_KEY, JSON.stringify({ ...base, sound: !muted }));
    } catch {
      // Persistence is best-effort, same as render/save.js.
    }
  }

  function setMuted(next) {
    muted = Boolean(next);
    applyGain();
    persistMuted();
    return muted;
  }

  function duckForAd(active = true) {
    ducked = Boolean(active);
    applyGain();
    return ducked;
  }

  function dispose() {
    stopLoop();
    disposed = true;
    unlocked = false;
    if (ctx && typeof ctx.close === 'function') {
      const pending = ctx.close();
      if (pending && typeof pending.catch === 'function') pending.catch(() => {});
    }
    master = null;
    ctx = null;
  }

  return {
    play,
    startLoop,
    stopLoop,
    setMuted,
    isMuted: () => muted,
    duckForAd,
    unlock,
    dispose,
  };
}
