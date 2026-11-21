// First-run onboarding (brief §7 AC2.7): 3 hints, non-blocking, shown once,
// skippable, English copy from STRINGS.
//
// All sequencing lives in pure functions so it can be tested under plain
// node --test; the DOM banner below is the thin, non-blocking display. The
// show-once flag is the `onboarded` key in 'raf.save' (unknown keys survive
// save.js normalisation untouched).
import { TUNING } from '../config/tuning.js';
import { STRINGS } from '../config/strings.js';
import { EVENT } from '../core/events.js';
import { SAVE_KEY, loadSave } from './save.js';

export function hintTexts() {
  const hints = [];
  for (let i = 1; i <= TUNING.ONBOARDING_HINTS; i += 1) {
    const text = STRINGS['hint' + i];
    if (typeof text === 'string') hints.push(text);
  }
  return hints;
}

const HINTS = hintTexts();
const HINT_AFTER_PLACE = 1;
const HINT_AFTER_CLEAR = 2;

// First run = the save has never finished/skipped onboarding.
export function shouldOnboard(save) {
  return save?.onboarded !== true;
}

export function createHintState(needsOnboarding) {
  const skip = needsOnboarding !== true || HINTS.length === 0;
  return { active: !skip, index: 0, done: skip };
}

export function currentHint(state) {
  return state.active ? HINTS[state.index] ?? null : null;
}

function finish(state) {
  return state.active ? { active: false, index: HINTS.length, done: true } : state;
}

function atHint(state, index) {
  return index >= HINTS.length ? finish(state) : { ...state, index };
}

export function advanceHint(state, event) {
  if (!state.active) return state;
  switch (event?.type) {
    case EVENT.PIECE_PLACED:
      return state.index === 0 ? atHint(state, HINT_AFTER_PLACE) : state;
    case EVENT.CLUSTER_CLEARED:
      return state.index < HINT_AFTER_CLEAR ? atHint(state, HINT_AFTER_CLEAR) : state;
    case EVENT.RING_COLLAPSED:
    case EVENT.RUN_ENDED:
      return finish(state);
    default:
      return state;
  }
}

export function skipHints(state) {
  return finish(state);
}

function defaultStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function markOnboarded(storage = defaultStorage()) {
  const save = { ...loadSave(storage), onboarded: true };
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Persistence is best-effort; the session still counts as onboarded.
  }
  return save;
}

// Thin non-blocking banner: pointer-events none except the skip button, so
// the player can drag pieces from the very first frame.
export function createOnboarding(container, options = {}) {
  const storage = options.storage ?? defaultStorage();
  let state = createHintState(shouldOnboard(loadSave(storage)));
  if (!state.active || typeof document === 'undefined' || !container) {
    return {
      handleEvent: () => false,
      skip: () => false,
      state: () => state,
      destroy: () => {},
    };
  }

  markOnboarded(storage);

  const banner = document.createElement('div');
  banner.id = 'raf-onboarding';
  banner.style.cssText =
    'position:fixed;top:9vh;left:0;right:0;display:flex;justify-content:center;' +
    'pointer-events:none;';
  const chip = document.createElement('div');
  chip.style.cssText =
    'display:flex;gap:8px;align-items:center;max-width:92vw;padding:8px 12px;' +
    'border-radius:8px;background:#14161ad9;color:#e8e8e8;' +
    'font-family:system-ui,sans-serif;font-size:14px;';
  const label = document.createElement('span');
  label.setAttribute('role', 'status');
  label.setAttribute('aria-live', 'polite');
  label.style.cssText = 'flex:1;';
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = STRINGS.hintSkip;
  skip.style.cssText =
    'pointer-events:auto;border:0;border-radius:6px;padding:4px 8px;' +
    'background:#3a3f4a;color:#e8e8e8;font:inherit;cursor:pointer;';
  skip.addEventListener('click', (event) => {
    event.stopPropagation();
    skipHintsNow();
  });
  chip.append(label, skip);
  banner.appendChild(chip);
  container.appendChild(banner);

  function render() {
    label.textContent = currentHint(state) ?? '';
    if (!state.active) {
      banner.remove();
      return;
    }
    banner.style.display = 'flex';
  }

  function skipHintsNow() {
    const next = skipHints(state);
    if (next === state && !state.active) return false;
    state = next;
    render();
    return true;
  }

  render();

  return {
    handleEvent(event) {
      const next = advanceHint(state, event);
      if (next === state) return false;
      state = next;
      render();
      return true;
    },
    skip: skipHintsNow,
    state: () => state,
    destroy() {
      banner.remove();
    },
  };
}
