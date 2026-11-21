// Audio layer tests: pure event→SFX mapping, mute persistence and the
// WebAudio synthesis paths (driven by a fake AudioContext, so node-safe).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT } from '../src/core/events.js';
import {
  SFX,
  SFX_NAMES,
  SFX_SPEC,
  EVENT_SFX,
  sfxForEvent,
  createAudio,
} from '../src/core/audio.js';

function memStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    dump: () => Object.fromEntries(map),
  };
}

function fakeContext() {
  const log = { osc: [], gains: [], started: 0, stopped: 0, freqs: [] };
  const param = (value, kind) => ({
    value,
    setValueAtTime(v) {
      this.value = v;
      if (kind === 'gain') log.gains.push(v);
      if (kind === 'freq') log.freqs.push(v);
    },
    linearRampToValueAtTime(v) {
      this.value = v;
    },
    exponentialRampToValueAtTime(v) {
      this.value = v;
    },
  });
  const ctx = {
    currentTime: 0,
    state: 'running',
    destination: {},
    resume() {
      return Promise.resolve();
    },
    close() {
      return Promise.resolve();
    },
    createGain() {
      const gain = param(1, 'gain');
      const node = { gain, connect() {} };
      log.graphGains = log.graphGains ?? [];
      log.graphGains.push(node);
      return node;
    },
    createOscillator() {
      const osc = {
        type: 'sine',
        frequency: param(440, 'freq'),
        connect() {},
        start() {
          log.started += 1;
        },
        stop() {
          log.stopped += 1;
        },
      };
      log.osc.push(osc);
      return osc;
    },
  };
  return { ctx, log };
}

test('there are exactly 8 SFX and each one has a synthesis spec', () => {
  assert.equal(SFX_NAMES.length, 8);
  assert.deepEqual([...SFX_NAMES], [
    'place',
    'invalid',
    'clear',
    'chain',
    'collapse',
    'restore',
    'wave',
    'gameover',
  ]);
  for (const name of SFX_NAMES) {
    assert.equal(typeof SFX_SPEC[name], 'function', `${name} needs a spec`);
    const notes = SFX_SPEC[name](null);
    assert.ok(notes.length >= 1, `${name} must produce at least one note`);
    for (const note of notes) {
      assert.ok(note.hz > 0, `${name} note frequency must be positive`);
      assert.ok(note.sec > 0, `${name} note duration must be positive`);
      assert.ok(note.gain > 0 && note.gain <= 1, `${name} note gain in (0,1]`);
    }
  }
});

test('every sim event maps to an SFX list', () => {
  for (const type of Object.values(EVENT)) {
    assert.ok(Array.isArray(EVENT_SFX[type]), `${type} is unmapped`);
    assert.ok(EVENT_SFX[type].length <= 2, `${type} maps to at most two sounds`);
    for (const name of EVENT_SFX[type]) {
      assert.ok(SFX_NAMES.includes(name), `${type} maps to a known SFX`);
    }
  }
});

test('sfxForEvent covers the gameplay events and chain bonuses', () => {
  assert.deepEqual(sfxForEvent({ type: EVENT.PIECE_PLACED }), [SFX.PLACE]);
  assert.deepEqual(sfxForEvent({ type: EVENT.INVALID_DROP }), [SFX.INVALID]);
  assert.deepEqual(sfxForEvent({ type: EVENT.CLUSTER_CLEARED, chain: 0 }), [SFX.CLEAR]);
  assert.deepEqual(sfxForEvent({ type: EVENT.CLUSTER_CLEARED, chain: 2 }), [
    SFX.CLEAR,
    SFX.CHAIN,
  ]);
  assert.deepEqual(sfxForEvent({ type: EVENT.RING_COLLAPSED }), [SFX.COLLAPSE]);
  assert.deepEqual(sfxForEvent({ type: EVENT.RING_RESTORED }), [SFX.RESTORE]);
  assert.deepEqual(sfxForEvent({ type: EVENT.WAVE_UP }), [SFX.WAVE]);
  assert.deepEqual(sfxForEvent({ type: EVENT.RUN_ENDED }), [SFX.GAMEOVER]);
  assert.deepEqual(sfxForEvent({ type: EVENT.RUN_STARTED }), []);
  assert.deepEqual(sfxForEvent({ type: 'unknown_event' }), []);
});

test('clear arpeggio pitch rises with the chain index', () => {
  const { ctx, log } = fakeContext();
  const audio = createAudio({ storage: memStorage(), contextFactory: () => ctx });
  audio.unlock();
  audio.play(SFX.CLEAR, { chain: 0 });
  const firstRoot = log.freqs[0];
  log.freqs.length = 0;
  audio.play(SFX.CLEAR, { chain: 3 });
  const lastRoot = log.freqs[0];
  assert.ok(lastRoot > firstRoot, 'higher chain clears at a higher pitch');
});

test('setMuted gates play and persists the sound flag without losing keys', () => {
  const storage = memStorage({
    'raf.save': JSON.stringify({ v: 1, best: 42, totalRuns: 3, onboarded: true, sound: true }),
  });
  const { ctx, log } = fakeContext();
  const audio = createAudio({ storage, contextFactory: () => ctx });

  assert.equal(audio.isMuted(), false);
  assert.equal(audio.play(SFX.PLACE), false, 'locked audio is a no-op');

  audio.unlock();
  const before = log.started;
  assert.equal(audio.play(SFX.PLACE), true);
  assert.ok(log.started > before, 'unmuted play schedules an oscillator');

  audio.setMuted(true);
  const mutedStart = log.started;
  assert.equal(audio.play(SFX.PLACE), false);
  assert.equal(log.started, mutedStart, 'muted play schedules nothing');

  const saved = JSON.parse(storage.getItem('raf.save'));
  assert.equal(saved.sound, false);
  assert.equal(saved.best, 42);
  assert.equal(saved.totalRuns, 3);
  assert.equal(saved.onboarded, true);

  const reloaded = createAudio({ storage, contextFactory: () => ctx });
  assert.equal(reloaded.isMuted(), true, 'mute survives a reload');

  audio.setMuted(false);
  assert.equal(JSON.parse(storage.getItem('raf.save')).sound, true);
  assert.equal(audio.play(SFX.PLACE), true);
});

test('duckForAd pulls the master gain to 0 and restores it', () => {
  const { ctx, log } = fakeContext();
  const audio = createAudio({ storage: memStorage(), contextFactory: () => ctx });
  audio.unlock();
  const master = log.graphGains[0];
  assert.equal(master.gain.value, 1);

  audio.duckForAd(true);
  assert.equal(master.gain.value, 0, 'ad duck silences the master bus');
  audio.duckForAd(false);
  assert.equal(master.gain.value, 1);
});

test('ambient loop stays under the 0.05 gain budget and starts/stops', () => {
  const { ctx, log } = fakeContext();
  const audio = createAudio({ storage: memStorage(), contextFactory: () => ctx });
  audio.unlock();

  audio.startLoop();
  const loopGain = log.graphGains[1];
  assert.ok(loopGain.gain.value <= 0.05, 'ambient loop gain <= 0.05');
  const startedAfterLoop = log.started;
  assert.ok(startedAfterLoop >= 2, 'loop runs at least two oscillators');

  audio.startLoop();
  assert.equal(log.started, startedAfterLoop, 'startLoop is idempotent');

  audio.stopLoop();
  assert.ok(log.stopped >= 2, 'stopLoop stops the loop oscillators');
  audio.stopLoop();
});

test('node-safe: no AudioContext or storage still gives a silent no-op API', () => {
  const audio = createAudio();
  assert.doesNotThrow(() => {
    audio.unlock();
    audio.play(SFX.PLACE);
    audio.play(SFX.CLEAR, { chain: 1 });
    audio.startLoop();
    audio.stopLoop();
    audio.setMuted(true);
    audio.setMuted(false);
    audio.duckForAd();
  });
  assert.equal(audio.play(SFX.PLACE), false);
  assert.equal(audio.isMuted(), false);
  assert.doesNotThrow(() => audio.dispose());
});

test('play ignores unknown sound names', () => {
  const { ctx } = fakeContext();
  const audio = createAudio({ storage: memStorage(), contextFactory: () => ctx });
  audio.unlock();
  assert.equal(audio.play('nope'), false);
});
