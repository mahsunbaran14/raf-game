// Pure fx math: particle budget, easing, shake bounds and pool reuse.
// fx.js imports Pixi but the exports exercised here never touch a canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNING } from '../src/config/tuning.js';
import {
  burstParticleCount,
  createPool,
  easeOutCubic,
  particlesPerCell,
  pulseScaleAt,
  shakeEnvelopeAt,
  shakeOffsetAt,
} from '../src/render/fx.js';

test('cluster burst spawns 6-10 particles per cleared cell', () => {
  for (let i = 0; i < 20; i += 1) {
    const n = particlesPerCell(i);
    assert.ok(n >= 6, `cell ${i}: ${n} particles < 6`);
    assert.ok(n <= 10, `cell ${i}: ${n} particles > 10`);
  }
  assert.equal(burstParticleCount(4), particlesPerCell(0) + particlesPerCell(1) + particlesPerCell(2) + particlesPerCell(3));
  const total = burstParticleCount(64);
  assert.ok(total >= 64 * 6, 'burst must never starve a cell');
  assert.ok(total <= 64 * 10, 'burst must stay under the per-cell cap');
  assert.equal(burstParticleCount(7), burstParticleCount(7), 'burst budget is deterministic');
});

test('easeOutCubic is monotone from 0 to 1', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.equal(easeOutCubic(-1), 0, 'clamped below');
  assert.equal(easeOutCubic(2), 1, 'clamped above');
  let previous = -1;
  for (let i = 0; i <= 20; i += 1) {
    const value = easeOutCubic(i / 20);
    assert.ok(value >= previous, `ease went backwards at ${i / 20}`);
    assert.ok(value <= 1, 'ease never overshoots');
    previous = value;
  }
});

test('cell pulse rises to 1.25 and returns to 1.0 within PULSE_MS', () => {
  assert.equal(pulseScaleAt(0), 1);
  assert.equal(pulseScaleAt(1), 1);
  assert.ok(Math.abs(pulseScaleAt(0.5) - 1.25) < 1e-9, 'peak is 1.25 at half time');
  let peak = 0;
  for (let ms = 0; ms <= TUNING.PULSE_MS; ms += 1) {
    peak = Math.max(peak, pulseScaleAt(ms / TUNING.PULSE_MS));
  }
  assert.ok(peak <= 1.25 + 1e-9, 'pulse never exceeds 1.25');
  assert.ok(peak >= 1.2, 'pulse reaches a readable peak');
});

test('shake offset stays inside SHAKE_PX and decays to zero by SHAKE_MS', () => {
  assert.equal(shakeOffsetAt(0), 0);
  assert.equal(shakeOffsetAt(TUNING.SHAKE_MS), 0);
  assert.equal(shakeOffsetAt(TUNING.SHAKE_MS * 2), 0);
  let previousEnvelope = 1;
  for (let ms = 0; ms <= TUNING.SHAKE_MS; ms += 1) {
    const envelope = shakeEnvelopeAt(ms / TUNING.SHAKE_MS);
    assert.ok(envelope <= previousEnvelope, `shake envelope grew at ${ms}ms`);
    assert.ok(envelope >= 0, 'shake envelope stays non-negative');
    previousEnvelope = envelope;
    assert.ok(
      Math.abs(shakeOffsetAt(ms)) <= TUNING.SHAKE_PX,
      `offset ${shakeOffsetAt(ms)} exceeds ${TUNING.SHAKE_PX}px at ${ms}ms`,
    );
  }
});

test('fx pool reuses objects and does not grow after the first burst', () => {
  let created = 0;
  const pool = createPool(() => {
    created += 1;
    return { id: created };
  });
  const first = [];
  for (let i = 0; i < 10; i += 1) first.push(pool.acquire());
  assert.equal(created, 10);
  assert.equal(pool.created, 10);
  for (const item of first) pool.release(item);
  assert.equal(pool.freeCount, 10);

  const second = [];
  for (let i = 0; i < 10; i += 1) second.push(pool.acquire());
  assert.equal(pool.created, 10, 'same 10 objects are reused');
  assert.equal(pool.freeCount, 0);
  assert.deepEqual(
    second.map((item) => item.id).sort((a, b) => a - b),
    first.map((item) => item.id).sort((a, b) => a - b),
  );

  pool.acquire();
  assert.equal(pool.created, 11, 'pool grows only when demand exceeds free list');
});
