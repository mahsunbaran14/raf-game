// Onboarding logic tests: hint sequence, first-run gate and skip.
// The pure functions are DOM-free; only createOnboarding touches the DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNING } from '../src/config/tuning.js';
import { STRINGS } from '../src/config/strings.js';
import { EVENT } from '../src/core/events.js';
import {
  hintTexts,
  shouldOnboard,
  createHintState,
  currentHint,
  advanceHint,
  skipHints,
  markOnboarded,
} from '../src/render/onboarding.js';

function memStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    dump: () => Object.fromEntries(map),
  };
}

test('exactly ONBOARDING_HINTS English hints are exposed', () => {
  const hints = hintTexts();
  assert.equal(hints.length, TUNING.ONBOARDING_HINTS);
  assert.deepEqual(hints, [STRINGS.hint1, STRINGS.hint2, STRINGS.hint3]);
  for (const hint of hints) {
    assert.ok(hint.length > 0);
    assert.match(hint, /^[\x20-\x7e]+$/, 'hints are plain English text');
  }
});

test('first-run gate depends only on the saved onboarded flag', () => {
  assert.equal(shouldOnboard(undefined), true);
  assert.equal(shouldOnboard({}), true);
  assert.equal(shouldOnboard({ onboarded: false }), true);
  assert.equal(shouldOnboard({ onboarded: true }), false);
});

test('hint sequence advances on gameplay milestones', () => {
  let state = createHintState(true);
  assert.equal(state.active, true);
  assert.equal(currentHint(state), STRINGS.hint1);

  state = advanceHint(state, { type: EVENT.INVALID_DROP });
  assert.equal(currentHint(state), STRINGS.hint1, 'invalid drops do not advance');

  state = advanceHint(state, { type: EVENT.PIECE_PLACED });
  assert.equal(currentHint(state), STRINGS.hint2);

  state = advanceHint(state, { type: EVENT.PIECE_PLACED });
  assert.equal(currentHint(state), STRINGS.hint2, 'stays until the first clear');

  state = advanceHint(state, { type: EVENT.CLUSTER_CLEARED, chain: 0 });
  assert.equal(currentHint(state), STRINGS.hint3);

  state = advanceHint(state, { type: EVENT.RING_COLLAPSED, n: 1 });
  assert.equal(state.active, false);
  assert.equal(state.done, true);
  assert.equal(currentHint(state), null);
});

test('run end or skip ends the hints immediately', () => {
  const skipped = skipHints(advanceHint(createHintState(true), { type: EVENT.PIECE_PLACED }));
  assert.equal(skipped.active, false);
  assert.equal(currentHint(skipped), null);

  const ended = advanceHint(createHintState(true), { type: EVENT.RUN_ENDED });
  assert.equal(ended.active, false);
  assert.equal(currentHint(ended), null);
});

test('repeat runs show no hints', () => {
  let state = createHintState(false);
  assert.equal(state.active, false);
  assert.equal(state.done, true);
  assert.equal(currentHint(state), null);
  state = advanceHint(state, { type: EVENT.PIECE_PLACED });
  assert.equal(currentHint(state), null);
  assert.equal(skipHints(state).active, false);
});

test('markOnboarded sets the flag once and preserves the rest of the save', () => {
  const storage = memStorage({
    'raf.save': JSON.stringify({ v: 1, best: 120, totalRuns: 2, sound: false, unlocks: ['x'] }),
  });
  markOnboarded(storage);
  const saved = JSON.parse(storage.getItem('raf.save'));
  assert.equal(saved.onboarded, true);
  assert.equal(saved.best, 120);
  assert.equal(saved.totalRuns, 2);
  assert.equal(saved.sound, false);
  assert.deepEqual(saved.unlocks, ['x']);
  assert.equal(shouldOnboard(saved), false);
});

test('markOnboarded survives missing or corrupt storage', () => {
  assert.doesNotThrow(() => markOnboarded(undefined));
  const storage = memStorage({ 'raf.save': '{oops' });
  markOnboarded(storage);
  assert.equal(JSON.parse(storage.getItem('raf.save')).onboarded, true);
});
