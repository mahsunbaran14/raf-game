import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNING } from '../src/config/tuning.js';
import { SHAPES, shapesForWave } from '../src/sim/shapes.js';
import { dailySeed, pieceAt, firstPieces, waveAt } from '../src/sim/generator.js';
import { fnv1a } from '../src/core/rng.js';

const byId = new Map(SHAPES.map((s) => [s.id, s]));
const colorCountFor = (wave) =>
  Math.min(
    TUNING.COLORS_MAX,
    TUNING.COLORS_START + (wave >= TUNING.EXTRA_COLOR_WAVE ? 1 : 0),
  );

test('pieceAt is deterministic for repeated calls', () => {
  for (let id = 0; id < 20; id += 1) {
    assert.deepEqual(pieceAt(1234, id), pieceAt(1234, id));
  }
  const daily = dailySeed('2026-11-21');
  assert.deepEqual(pieceAt(daily, 7), pieceAt(daily, 7));
});

test('different seeds produce different piece streams', () => {
  const a = Array.from({ length: 10 }, (_, id) => pieceAt(1, id));
  const b = Array.from({ length: 10 }, (_, id) => pieceAt(2, id));
  assert.notDeepEqual(a, b);
});

test('wave 1 pieces are tier-0 shapes with a start color', () => {
  for (let id = 0; id < TUNING.TRAY_SIZE; id += 1) {
    const piece = pieceAt(TUNING.CORE_GATE_SEEDS, id);
    const shape = byId.get(piece.shapeId);
    assert.ok(shape, `unknown shape ${piece.shapeId}`);
    assert.equal(shape.tier, 0);
    assert.ok(piece.color >= 0 && piece.color < TUNING.COLORS_START);
  }
});

test('waveAt maps ids per contract', () => {
  for (let id = 0; id < TUNING.TRAY_SIZE; id += 1) assert.equal(waveAt(id), 1);
  assert.equal(waveAt(TUNING.TRAY_SIZE), 1);
  assert.equal(waveAt(TUNING.TRAY_SIZE + TUNING.WAVE_LENGTH), 2);
  assert.equal(waveAt(TUNING.TRAY_SIZE + TUNING.WAVE_LENGTH - 1), 1);
  assert.equal(waveAt(TUNING.TRAY_SIZE + 2 * TUNING.WAVE_LENGTH), 3);
});

test('no piece exceeds its wave color count', () => {
  for (const seed of [1, dailySeed('2026-11-21')]) {
    for (let id = 0; id < 100; id += 1) {
      const piece = pieceAt(seed, id);
      const limit = colorCountFor(waveAt(id));
      assert.ok(
        piece.color >= 0 && piece.color < limit,
        `seed ${seed} id ${id} color ${piece.color} >= ${limit}`,
      );
    }
  }
});

test('shape pool grows at tromino and four-cell waves', () => {
  const w1 = shapesForWave(1).length;
  const wTromino = shapesForWave(TUNING.TROMINO_WAVE).length;
  const wFour = shapesForWave(TUNING.FOURCELL_WAVE).length;
  assert.ok(w1 < wTromino, 'tromino wave must add shapes');
  assert.ok(wTromino < wFour, 'four-cell wave must add shapes');
});

test('dailySeed follows the published prefix and varies by date', () => {
  assert.equal(dailySeed('2026-11-21'), fnv1a('raf-2026-11-21'));
  assert.notEqual(dailySeed('2026-11-21'), dailySeed('2026-11-22'));
});

test('firstPieces returns the requested count', () => {
  const pieces = firstPieces(dailySeed('2026-11-21'), 10);
  assert.equal(pieces.length, 10);
  assert.deepEqual(pieces[3], pieceAt(dailySeed('2026-11-21'), 3));
});
