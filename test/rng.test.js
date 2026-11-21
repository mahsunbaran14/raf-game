import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, fnv1a } from '../src/core/rng.js';

test('fnv1a matches published 32-bit vectors', () => {
  assert.equal(fnv1a(''), 0x811c9dc5);
  assert.equal(fnv1a('a'), 0xe40c292c);
  assert.equal(fnv1a('foobar'), 0xbf9cf968);
});

test('fnv1a is case- and content-sensitive', () => {
  assert.notEqual(fnv1a('raf-2026-11-21'), fnv1a('raf-2026-11-22'));
  assert.notEqual(fnv1a('p0'), fnv1a('p1'));
});

test('mulberry32 same seed yields same sequence', () => {
  const a = mulberry32(12345);
  const b = mulberry32(12345);
  for (let i = 0; i < 10; i += 1) assert.equal(a(), b());
});

test('mulberry32 different seeds differ', () => {
  const a = mulberry32(1);
  const b = mulberry32(2);
  const seqA = Array.from({ length: 10 }, () => a());
  const seqB = Array.from({ length: 10 }, () => b());
  assert.notDeepEqual(seqA, seqB);
});

test('mulberry32 instances with same seed produce identical first 100 values', () => {
  const a = mulberry32(0xdeadbeef);
  const b = mulberry32(0xdeadbeef);
  const seqA = Array.from({ length: 100 }, () => a());
  const seqB = Array.from({ length: 100 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test('mulberry32 values stay in [0, 1)', () => {
  const rng = mulberry32(42);
  for (let i = 0; i < 1000; i += 1) {
    const v = rng();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});
