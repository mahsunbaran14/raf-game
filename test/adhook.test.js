// Midgame ad hook contract (brief §4.2, AC2.6): one request, only at run end,
// no built-in frequency logic, and a pure no-op while ads are disabled.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TUNING } from '../src/config/tuning.js';
import { createAdHook } from '../src/render/adhook.js';

function recorder() {
  const calls = [];
  return {
    calls,
    fn(name) {
      return (...args) => calls.push({ name, args });
    },
  };
}

test('disabled config makes the hook a synchronous no-op (AC4.4 drill)', () => {
  assert.equal(TUNING.ADS_ENABLED, false, 'v1 ships with ads off');
  const log = recorder();
  let requested = 0;
  const hook = createAdHook({
    onPause: log.fn('pause'),
    onResume: log.fn('resume'),
    request: () => {
      requested += 1;
    },
  });

  let done = 0;
  hook.requestMidgame('run_ended', () => {
    done += 1;
  });

  assert.equal(done, 1, 'onDone runs before requestMidgame returns');
  assert.equal(requested, 0, 'no SDK request while disabled');
  assert.deepEqual(log.calls, [], 'the game is never paused while disabled');
});

test('requests are rejected outside run_ended with a warning', () => {
  const warnings = [];
  let requested = 0;
  const hook = createAdHook({
    enabled: true,
    warn: (message) => warnings.push(message),
    request: () => {
      requested += 1;
    },
  });

  for (const reason of ['wave_up', 'menu', undefined]) {
    let done = 0;
    hook.requestMidgame(reason, () => {
      done += 1;
    });
    assert.equal(done, 1, `onDone still runs for ${reason}`);
  }
  assert.equal(requested, 0, 'no ad is requested outside run_ended');
  assert.equal(warnings.length, 3, 'every rejected placement is warned about');
  assert.match(warnings[0], /run_ended/);
});

test('enabled hook pauses, requests once, and resumes on finish or error', () => {
  const log = recorder();
  const requests = [];
  const hook = createAdHook({
    enabled: true,
    onPause: log.fn('pause'),
    onResume: log.fn('resume'),
    request: (request) => requests.push(request),
  });

  let done = 0;
  hook.requestMidgame('run_ended', () => {
    done += 1;
  });

  assert.equal(requests.length, 1);
  assert.equal(done, 0, 'onDone waits for the ad to settle');
  assert.equal(requests[0].type, 'midgame');
  assert.deepEqual(log.calls.map((call) => call.name), ['pause']);

  requests[0].callbacks.adFinished();
  assert.deepEqual(log.calls.map((call) => call.name), ['pause', 'resume']);
  assert.equal(done, 1);

  // A late adError after finishing must not resume or call onDone again.
  requests[0].callbacks.adError();
  assert.deepEqual(log.calls.map((call) => call.name), ['pause', 'resume']);
  assert.equal(done, 1);
});

test('adError continues the game when no ad was shown (brief §4.2)', () => {
  const log = recorder();
  const requests = [];
  const hook = createAdHook({
    enabled: true,
    onPause: log.fn('pause'),
    onResume: log.fn('resume'),
    request: (request) => requests.push(request),
  });

  let done = 0;
  hook.requestMidgame('run_ended', () => {
    done += 1;
  });

  assert.equal(done, 0);
  requests[0].callbacks.adStarted();
  assert.equal(done, 0, 'adStarted does not settle the request');
  requests[0].callbacks.adError();
  assert.deepEqual(log.calls.map((call) => call.name), ['pause', 'resume']);
  assert.equal(done, 1);
});

test('no frequency logic: every run end is forwarded to the SDK', () => {
  let requested = 0;
  const hook = createAdHook({
    enabled: true,
    request: () => {
      requested += 1;
    },
  });

  hook.requestMidgame('run_ended', () => {});
  hook.requestMidgame('run_ended', () => {});

  assert.equal(requested, 2, 'the SDK owns the frequency cap (brief §4.2)');
});

test('enabled hook without a wired SDK still completes the run', () => {
  const warnings = [];
  const hook = createAdHook({
    enabled: true,
    warn: (message) => warnings.push(message),
  });

  let done = 0;
  hook.requestMidgame('run_ended', () => {
    done += 1;
  });

  assert.equal(done, 1, 'never freezes the run when the SDK is missing');
  assert.equal(warnings.length, 1);
});
