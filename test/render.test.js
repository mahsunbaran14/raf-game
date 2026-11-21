// Pure render-layer tests: responsive layout math and drop validity.
// These modules are DOM/Pixi-free so they run under plain node --test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNING } from '../src/config/tuning.js';
import { layoutFor } from '../src/render/layout.js';
import { canPlace, pieceOf } from '../src/render/validity.js';
import { initState } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';
import { EVENT } from '../src/core/events.js';

const N = TUNING.ARENA_START;
const TRAY = TUNING.TRAY_SIZE;

function assertBoardInside(l, w, h) {
  assert.ok(l.cell >= 1, 'cell must be positive');
  assert.equal(l.boardW, l.cell * N, 'board width follows cell pitch');
  assert.equal(l.boardH, l.cell * N, 'board height follows cell pitch');
  assert.ok(l.boardX >= 0, 'board left inside screen');
  assert.ok(l.boardY >= 0, 'board top inside screen');
  assert.ok(l.boardX + l.boardW <= w, 'board right inside screen');
  assert.ok(l.boardY + l.boardH <= h, 'board bottom inside screen');
}

function assertTrayInside(l, w, h) {
  assert.ok(l.trayX >= 0, 'tray left inside screen');
  assert.ok(l.trayY >= 0, 'tray top inside screen');
  if (l.trayHorizontal) {
    assert.ok(l.trayX + l.slot <= w, 'tray column inside screen');
    assert.ok(l.trayY + l.slot * TRAY + l.gap * (TRAY - 1) <= h, 'tray column height inside screen');
  } else {
    assert.ok(l.trayX + l.slot * TRAY + l.gap * (TRAY - 1) <= w, 'tray row inside screen');
    assert.ok(l.trayY + l.slot <= h, 'tray row height inside screen');
  }
}

test('portrait 360x640: 8x8 arena fully visible with 44px touch cells', () => {
  const w = 360;
  const h = 640;
  const l = layoutFor(w, h);
  assert.equal(l.trayHorizontal, false);
  assertBoardInside(l, w, h);
  assertTrayInside(l, w, h);
  assert.ok(l.cell >= 44, `cell ${l.cell} must be at least 44px`);
  assert.ok(l.slot >= l.cell, 'tray slots are sized from the cell pitch');
});

test('landscape 1280x720: 8x8 arena fully visible, tray on the side', () => {
  const w = 1280;
  const h = 720;
  const l = layoutFor(w, h);
  assert.equal(l.trayHorizontal, true);
  assertBoardInside(l, w, h);
  assertTrayInside(l, w, h);
  assert.ok(l.cell > 60, `cell ${l.cell} should scale up on desktop`);
  assert.ok(l.slot >= l.cell, 'tray slots are sized from the cell pitch');
});

test('layout stays inside the screen across common viewport sizes', () => {
  const sizes = [
    [320, 480],
    [360, 640],
    [390, 844],
    [412, 915],
    [768, 1024],
    [1024, 768],
    [1280, 720],
    [1920, 1080],
  ];
  for (const [w, h] of sizes) {
    const l = layoutFor(w, h);
    assertBoardInside(l, w, h);
    assertTrayInside(l, w, h);
    assert.ok(Number.isInteger(l.cell), 'cell pitch is integral');
  }
});

test('pieceOf resolves every starting tray piece to a shape and glyph', () => {
  const state = initState(7);
  for (const id of state.tray) {
    const piece = pieceOf(state.seed, id);
    assert.ok(piece.shape.cells.length > 0);
    assert.ok(Number.isInteger(piece.color));
    assert.equal(typeof piece.glyph, 'string');
  }
});

test('canPlace accepts every starting piece on the empty 8x8 arena', () => {
  const state = initState(7);
  for (const id of state.tray) {
    assert.equal(canPlace(state, id, 0, 0), true);
  }
});

test('canPlace rejects occupied cells', () => {
  const state = initState(7);
  const id = state.tray[0];
  const [dx, dy] = pieceOf(state.seed, id).shape.cells[0];
  const blocked = {
    ...state,
    cells: [{ x: 2 + dx, y: 2 + dy, c: 0, g: 0 }],
  };
  assert.equal(canPlace(blocked, id, 2, 2), false);
  assert.equal(canPlace(blocked, id, 4, 4), true);
});

test('canPlace rejects drops outside the active arena', () => {
  const state = initState(7);
  const id = state.tray[0];
  const shrunk = { ...state, arena: { x0: 2, y0: 2, w: 4, h: 4 } };
  assert.equal(canPlace(shrunk, id, 0, 0), false);
  assert.equal(canPlace(shrunk, id, 1, 1), false);
  assert.equal(canPlace(shrunk, id, 2, 2), true);
  assert.equal(canPlace(shrunk, id, 6, 6), false);
});

test('canPlace rejects drops outside the 8x8 board and unknown pieces', () => {
  const state = initState(7);
  const id = state.tray[0];
  assert.equal(canPlace(state, id, -1, 0), false);
  assert.equal(canPlace(state, id, 0, -1), false);
  assert.equal(canPlace(state, id, N, 0), false);
  assert.equal(canPlace(state, id, 0, N), false);
  assert.equal(canPlace(state, 999, 0, 0), false);
  assert.equal(canPlace(state, state.queue[0], 0, 0), false);
});

test('canPlace agrees with the step placement gate at every origin', () => {
  let state = initState(11);
  for (let move = 0; move < 30 && state.status === 'playing'; move += 1) {
    const id = state.tray[0];
    let firstValid = null;
    for (let y = -1; y <= N; y += 1) {
      for (let x = -1; x <= N; x += 1) {
        const expected = canPlace(state, id, x, y);
        const result = step(state, { type: 'place', pieceId: id, x, y });
        const accepted = !result.events.some((event) => event.type === EVENT.INVALID_DROP);
        assert.equal(
          accepted,
          expected,
          `origin ${x},${y} disagrees (move ${move})`,
        );
        if (accepted && firstValid === null) firstValid = result;
      }
    }
    if (firstValid === null) break;
    state = firstValid.state;
  }
});
