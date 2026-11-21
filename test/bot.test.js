// Bot determinism and heuristic tests (brief §5.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNING } from '../src/config/tuning.js';
import { EVENT } from '../src/core/events.js';
import { pieceAt } from '../src/sim/generator.js';
import { SHAPES } from '../src/sim/shapes.js';
import { startRun } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { stateHash } from '../src/sim/hash.js';
import { choosePlacement, runBot } from '../tools/bot.js';

const SEED = 7;
const shapeOf = (id) => SHAPES.find((s) => s.id === pieceAt(SEED, id).shapeId);
const cell = (x, y, c) => ({ x, y, c, g: c });

function firstSinglePiece(seed) {
  for (let id = 0; id < 400; id += 1) {
    const piece = pieceAt(seed, id);
    const shape = SHAPES.find((s) => s.id === piece.shapeId);
    if (shape.cells.length === 1) return { id, color: piece.color };
  }
  throw new Error('no single-cell piece found');
}

test('runBot(42) is deterministic: same hash, placements and events', () => {
  const a = runBot(42);
  const b = runBot(42);
  assert.equal(a.placements, b.placements);
  assert.equal(a.wave, b.wave);
  assert.equal(a.capped, false);
  assert.deepEqual(a.events, b.events);
  assert.equal(stateHash(a.state), stateHash(b.state));
});

test('choosePlacement returns a legal placement that step accepts', () => {
  const { state } = startRun(SEED);
  const move = choosePlacement(state);
  assert.ok(move !== null);
  assert.ok(state.tray.includes(move.pieceId));

  const arena = state.arena;
  for (const [dx, dy] of shapeOf(move.pieceId).cells) {
    const x = move.x + dx;
    const y = move.y + dy;
    assert.ok(x >= arena.x0 && x < arena.x0 + arena.w);
    assert.ok(y >= arena.y0 && y < arena.y0 + arena.h);
  }

  const out = step(state, { type: 'place', pieceId: move.pieceId, x: move.x, y: move.y });
  assert.equal(out.events[0].type, EVENT.PIECE_PLACED);
});

test('choosePlacement returns null when no tray piece fits', () => {
  const cells = [];
  for (let y = 0; y < TUNING.ARENA_MIN; y += 1) {
    for (let x = 0; x < TUNING.ARENA_MIN; x += 1) {
      cells.push(cell(x, y, (x + y) % TUNING.COLORS_MAX));
    }
  }
  const { state } = startRun(SEED);
  const full = {
    ...state,
    arena: { x0: 0, y0: 0, w: TUNING.ARENA_MIN, h: TUNING.ARENA_MIN },
    cells,
    tray: [0, 1, 2],
  };
  assert.equal(choosePlacement(full), null);
});

test('equal match scores are decided by proximity to the arena centre', () => {
  const { id, color } = firstSinglePiece(SEED);
  const { state } = startRun(SEED);
  const crafted = {
    ...state,
    tray: [id],
    cells: [cell(4, 3, color), cell(0, 7, color)],
  };

  // Both (4,4) and (0,6)/(1,7) score one same-color neighbour; (4,4) is the
  // arena centre, so the proximity tie-break must pick it.
  assert.deepEqual(choosePlacement(crafted), { pieceId: id, x: 4, y: 4 });
});
