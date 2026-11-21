// Simülasyon çekirdeği testleri (brief §5.3 / AC1.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNING } from '../src/config/tuning.js';
import { EVENT } from '../src/core/events.js';
import { SHAPES } from '../src/sim/shapes.js';
import { pieceAt } from '../src/sim/generator.js';
import { mulberry32 } from '../src/core/rng.js';
import { initState, startRun } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { stateHash } from '../src/sim/hash.js';

const SEED = 7;
const shapeOf = (piece) => SHAPES.find((s) => s.id === piece.shapeId);

function pieceIdWith(seed, pred) {
  for (let id = 0; id < 400; id += 1) {
    const piece = pieceAt(seed, id);
    if (pred(piece, shapeOf(piece))) return id;
  }
  throw new Error('no piece matches predicate');
}

const singleId = () => pieceIdWith(SEED, (p, s) => s.cells.length === 1);
const singleColor = (id) => pieceAt(SEED, id).color;

function baseState(overrides = {}) {
  return {
    v: 1,
    seed: SEED,
    mode: 'run',
    placements: 0,
    wave: 1,
    arena: { x0: 0, y0: 0, w: TUNING.ARENA_START, h: TUNING.ARENA_START },
    cells: [],
    tray: [10, 11, 12],
    queue: [13, 14, 15, 16, 17],
    score: 0,
    clears: 0,
    waste: 0,
    status: 'playing',
    ...overrides,
  };
}

const cell = (x, y, c) => ({ x, y, c, g: c });
const types = (events) => events.map((e) => e.type);
const findEvent = (events, type) => events.find((e) => e.type === type);

test('initState matches the data contract exactly', () => {
  assert.deepEqual(initState(SEED), {
    v: 1,
    seed: SEED,
    mode: 'run',
    placements: 0,
    wave: 1,
    arena: { x0: 0, y0: 0, w: TUNING.ARENA_START, h: TUNING.ARENA_START },
    cells: [],
    tray: [0, 1, 2],
    queue: [3, 4, 5, 6, 7],
    score: 0,
    clears: 0,
    waste: 0,
    status: 'playing',
  });
  assert.equal(initState(SEED, 'daily').mode, 'daily');
});

test('startRun returns fresh state plus run_started', () => {
  const out = startRun(SEED, 'daily');
  assert.deepEqual(out.events, [{ type: EVENT.RUN_STARTED }]);
  assert.deepEqual(out.state, initState(SEED, 'daily'));
});

test('valid place adds cells, refills tray slot from queue, keeps queue length', () => {
  const id = singleId();
  const state = baseState({ tray: [id, 11, 12] });
  const before = structuredClone(state);
  const out = step(state, { type: 'place', pieceId: id, x: 3, y: 3 });
  const next = out.state;

  assert.equal(next.cells.length, 1);
  assert.deepEqual(next.cells[0], { x: 3, y: 3, c: singleColor(id), g: singleColor(id) });
  assert.deepEqual(next.tray, [13, 11, 12]);
  assert.equal(next.queue.length, state.queue.length);
  assert.deepEqual(next.queue, [14, 15, 16, 17, 18]);
  assert.equal(next.placements, 1);
  assert.equal(out.events[0].type, EVENT.PIECE_PLACED);
  assert.equal(stateHash(out.state), stateHash(next));
  // purity: original state untouched
  assert.deepEqual(state, before);
});

test('invalid drops leave state unchanged and emit invalid_drop', () => {
  const id = singleId();
  const occupied = baseState({ tray: [id, 11, 12], cells: [cell(4, 4, 0)] });
  const tiny = baseState({
    tray: [id, 11, 12],
    arena: { x0: 2, y0: 2, w: 4, h: 4 },
  });
  const cases = [
    { state: occupied, action: { type: 'place', pieceId: id, x: 4, y: 4 } },
    { state: tiny, action: { type: 'place', pieceId: id, x: 0, y: 0 } },
    { state: occupied, action: { type: 'place', pieceId: 999, x: 0, y: 0 } },
    {
      state: occupied,
      action: { type: 'place', pieceId: id, x: TUNING.ARENA_START, y: 0 },
    },
  ];
  for (const { state, action } of cases) {
    const before = structuredClone(state);
    const out = step(state, action);
    assert.deepEqual(out.events, [{ type: EVENT.INVALID_DROP }]);
    assert.deepEqual(out.state, before);
  }
});

test('clear removes a completed 4-group, scores 40 and emits chain 0 / mult 1', () => {
  const id = singleId();
  const c = singleColor(id);
  const state = baseState({
    tray: [id, 11, 12],
    cells: [cell(3, 3, c), cell(4, 3, c), cell(5, 3, c)],
  });
  const out = step(state, { type: 'place', pieceId: id, x: 2, y: 3 });

  assert.equal(out.state.cells.length, 0);
  assert.equal(out.state.clears, 1);
  assert.equal(out.state.score, 40);
  const cleared = findEvent(out.events, EVENT.CLUSTER_CLEARED);
  assert.ok(cleared);
  assert.equal(cleared.chain, 0);
  assert.equal(cleared.mult, 1);
  assert.deepEqual(
    cleared.cells.slice().sort((a, b) => a.x - b.x),
    [
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ],
  );
});

test('a placement clearing two groups chains: second event chain 1 / mult 1.5', () => {
  const id = singleId();
  const a = singleColor(id);
  const b = (a + 1) % 4;
  const state = baseState({
    tray: [id, 11, 12],
    cells: [
      cell(3, 3, a),
      cell(4, 3, a),
      cell(5, 3, a),
      cell(1, 6, b),
      cell(2, 6, b),
      cell(3, 6, b),
      cell(4, 6, b),
    ],
  });
  const out = step(state, { type: 'place', pieceId: id, x: 2, y: 3 });
  const cleared = out.events.filter((e) => e.type === EVENT.CLUSTER_CLEARED);

  assert.equal(cleared.length, 2);
  assert.equal(cleared[0].chain, 0);
  assert.equal(cleared[0].mult, 1);
  assert.equal(cleared[1].chain, 1);
  assert.equal(cleared[1].mult, 1.5);
  assert.equal(out.state.cells.length, 0);
  assert.equal(out.state.clears, 2);
  assert.equal(out.state.score, 40 + 60); // round(10*4*1) + round(10*4*1.5)
});

test('collapse on the 4th placement shrinks the arena and wastes outer cells', () => {
  const id = singleId();
  const state = baseState({
    tray: [id, 11, 12],
    placements: 3,
    cells: [cell(0, 0, 0), cell(7, 0, 1), cell(0, 4, 2)],
  });
  const out = step(state, { type: 'place', pieceId: id, x: 3, y: 3 });

  assert.deepEqual(out.state.arena, { x0: 1, y0: 1, w: 7, h: 7 });
  assert.equal(out.state.waste, 3);
  assert.equal(out.state.score, -3 * TUNING.WASTE_PENALTY);
  assert.equal(out.state.cells.length, 1);
  assert.deepEqual(findEvent(out.events, EVENT.RING_COLLAPSED), {
    type: EVENT.RING_COLLAPSED,
    n: 3,
  });
});

test('collapse stops at ARENA_MIN', () => {
  const id = singleId();
  const state = baseState({
    tray: [id, 11, 12],
    placements: 3,
    arena: { x0: 2, y0: 2, w: TUNING.ARENA_MIN, h: TUNING.ARENA_MIN },
    cells: [cell(2, 2, 0), cell(5, 5, 1), cell(2, 5, 2)],
  });
  const out = step(state, { type: 'place', pieceId: id, x: 3, y: 3 });

  assert.deepEqual(out.state.arena, state.arena);
  assert.equal(out.state.waste, 0);
  assert.equal(out.state.cells.length, 4);
  assert.ok(!types(out.events).includes(EVENT.RING_COLLAPSED));
});

test('every REOPEN_EVERY clears restores one ring when the arena is small', () => {
  const id = singleId();
  const c = singleColor(id);
  const state = baseState({
    tray: [id, 11, 12],
    clears: TUNING.REOPEN_EVERY - 1,
    arena: { x0: 2, y0: 2, w: 6, h: 6 },
    cells: [cell(3, 3, c), cell(4, 3, c), cell(5, 3, c)],
  });
  const out = step(state, { type: 'place', pieceId: id, x: 2, y: 3 });

  assert.equal(out.state.clears, TUNING.REOPEN_EVERY);
  assert.deepEqual(out.state.arena, { x0: 1, y0: 1, w: 7, h: 7 });
  assert.ok(types(out.events).includes(EVENT.RING_RESTORED));
});

test('wave_up fires when the placed piece id belongs to the next wave', () => {
  const id = TUNING.TRAY_SIZE + TUNING.WAVE_LENGTH; // waveAt(id) === 2
  const state = baseState({ tray: [id, id + 1, id + 2] });
  const out = step(state, { type: 'place', pieceId: id, x: 0, y: 0 });

  assert.equal(out.state.wave, 2);
  assert.deepEqual(findEvent(out.events, EVENT.WAVE_UP), { type: EVENT.WAVE_UP, n: 2 });

  const lastWaveOne = baseState({ tray: [id - 1, id, id + 1] });
  const out2 = step(lastWaveOne, { type: 'place', pieceId: id - 1, x: 3, y: 3 });
  assert.equal(out2.state.wave, 1);
  assert.ok(!types(out2.events).includes(EVENT.WAVE_UP));
});

test('run ends with no_fit when no tray piece fits the arena', () => {
  // wave-1 parçası (en fazla 2 hücre) ve rengi dolgu renklerinden farklı
  const id = pieceIdWith(SEED, (p) => p.color >= 2);
  assert.ok(id < TUNING.TRAY_SIZE);
  const shape = shapeOf(pieceAt(SEED, id));
  const arena = { x0: 2, y0: 2, w: TUNING.ARENA_MIN, h: TUNING.ARENA_MIN };
  const holes = new Set(shape.cells.map(([dx, dy]) => `${3 + dx},${3 + dy}`));
  const cells = [];
  for (let y = arena.y0; y < arena.y0 + arena.h; y += 1) {
    for (let x = arena.x0; x < arena.x0 + arena.w; x += 1) {
      if (holes.has(`${x},${y}`)) continue;
      cells.push(cell(x, y, (x + y) % 2));
    }
  }
  const state = baseState({ tray: [id, 11, 12], placements: 5, arena, cells });
  const out = step(state, { type: 'place', pieceId: id, x: 3, y: 3 });

  assert.equal(out.state.status, 'over');
  const ended = findEvent(out.events, EVENT.RUN_ENDED);
  assert.ok(ended);
  assert.equal(ended.reason, 'no_fit');
  assert.equal(ended.score, out.state.score);
  assert.equal(ended.wave, out.state.wave);
  assert.ok(!('ms' in ended));
});

test('stateHash is canonical key-order independent', () => {
  const a = { b: 1, a: [1, 2, { d: 4, c: 3 }] };
  const b = { a: [1, 2, { c: 3, d: 4 }], b: 1 };
  assert.equal(stateHash(a), stateHash(b));
  assert.notEqual(stateHash(a), stateHash({ a: 1, b: [1, 2, { d: 4, c: 3 }] }));
});

test('determinism: 3 seeds x 100 actions replay to the same hash at every step', () => {
  for (const seed of [1, 2, 3]) {
    const play = () => {
      const rng = mulberry32(seed ^ 0x9e3779b9);
      let state = initState(seed);
      const hashes = [];
      for (let i = 0; i < 100; i += 1) {
        const slot = Math.floor(rng() * TUNING.TRAY_SIZE);
        const x = Math.floor(rng() * TUNING.ARENA_START);
        const y = Math.floor(rng() * TUNING.ARENA_START);
        const out = step(state, { type: 'place', pieceId: state.tray[slot], x, y });
        state = out.state;
        hashes.push(stateHash(state));
      }
      return { state, hashes };
    };
    const one = play();
    const two = play();
    assert.deepEqual(one.hashes, two.hashes);
    assert.equal(stateHash(one.state), stateHash(two.state));
  }
});

test('a clearless step does not restore a ring even at a clear multiple', () => {
  const id = singleId();
  const before = baseState({
    tray: [id, 11, 12],
    clears: TUNING.REOPEN_EVERY,
    arena: { x0: 2, y0: 2, w: 6, h: 6 },
  });
  const out = step(before, { type: 'place', pieceId: id, x: 4, y: 4 });

  assert.equal(out.state.clears, TUNING.REOPEN_EVERY);
  assert.deepEqual(out.state.arena, before.arena);
  assert.equal(types(out.events).includes(EVENT.RING_RESTORED), false);
});
