import test from 'node:test';
import assert from 'node:assert/strict';
import { createTelemetry } from '../src/core/telemetry.js';
import { TUNING } from '../src/config/tuning.js';

test('log stores events and count tracks them', () => {
  const t = createTelemetry();
  assert.equal(t.count(), 0);
  t.log({ e: 'piece_placed', x: 1, y: 2 });
  t.log({ e: 'cluster_cleared', cells: 3 });
  assert.equal(t.count(), 2);
});

test('seq increments monotonically from 0', () => {
  const t = createTelemetry();
  t.log({ e: 'a' });
  t.log({ e: 'b' });
  t.log({ e: 'c' });
  assert.deepEqual(
    t.all().map((e) => e.seq),
    [0, 1, 2],
  );
});

test('ring drops oldest when full and seq never resets on wrap', () => {
  const t = createTelemetry(3);
  for (let i = 0; i < 5; i++) t.log({ e: 'evt', n: i });
  assert.equal(t.count(), 3);
  const stored = t.all();
  assert.equal(stored.length, 3);
  assert.equal(stored[0].seq, 2);
  assert.deepEqual(
    stored.map((e) => e.seq),
    [2, 3, 4],
  );
  assert.equal(stored[0].n, 2);
  assert.equal(stored[2].n, 4);
});

test('all() returns oldest to newest copy', () => {
  const t = createTelemetry(4);
  t.log({ e: 'e1' });
  t.log({ e: 'e2' });
  t.log({ e: 'e3' });
  const copy = t.all();
  assert.deepEqual(
    copy.map((e) => e.e),
    ['e1', 'e2', 'e3'],
  );
  copy.push({ e: 'fake', seq: 99 });
  assert.equal(t.count(), 3);
  assert.equal(t.all().length, 3);
});

test('toJSON round-trips through JSON.parse', () => {
  const t = createTelemetry(2);
  t.log({ e: 'run_started', nested: { ok: true } });
  t.log({ e: 'run_ended', score: 10 });
  const parsed = JSON.parse(t.toJSON());
  assert.equal(parsed.v, 1);
  assert.equal(parsed.count, 2);
  assert.deepEqual(parsed.events, t.all());
  assert.equal(parsed.events[0].e, 'run_started');
  assert.deepEqual(parsed.events[0].nested, { ok: true });
});

test('mutating the logged event after log() does not affect stored copy', () => {
  const t = createTelemetry();
  const ev = { e: 'ui_click', id: 'play' };
  t.log(ev);
  ev.id = 'mutated';
  ev.extra = true;
  const stored = t.all()[0];
  assert.equal(stored.id, 'play');
  assert.equal('extra' in stored, false);
});

test('clear empties buffer but seq continues', () => {
  const t = createTelemetry(3);
  for (let i = 0; i < 5; i++) t.log({ e: 'evt', n: i });
  t.clear();
  assert.equal(t.count(), 0);
  assert.deepEqual(t.all(), []);
  t.log({ e: 'after' });
  assert.equal(t.count(), 1);
  assert.equal(t.all()[0].seq, 5);
});

test('default capacity comes from TUNING.TELEMETRY_BUFFER', () => {
  const t = createTelemetry();
  const total = TUNING.TELEMETRY_BUFFER + 5;
  for (let i = 0; i < total; i++) t.log({ e: 'evt', n: i });
  assert.equal(t.count(), TUNING.TELEMETRY_BUFFER);
  const stored = t.all();
  assert.equal(stored[0].seq, 5);
  assert.equal(stored[stored.length - 1].seq, total - 1);
});
