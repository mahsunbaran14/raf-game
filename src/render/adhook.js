// Midgame ad hook (brief §4.2, AC2.6). Placement is enforced here: the only
// allowed reason is the run-ended boundary. The SDK owns the frequency cap,
// so this module adds none. With ADS_ENABLED false the hook is a synchronous
// no-op (AC4.4 drill): no freeze, no dead button, the run just continues.
import { TUNING } from '../config/tuning.js';

const AD_REASON = 'run_ended';

export function createAdHook(options = {}) {
  const enabled = options.enabled ?? TUNING.ADS_ENABLED;
  const request = options.request ?? null;
  const onPause = options.onPause ?? (() => {});
  const onResume = options.onResume ?? (() => {});
  const warn = options.warn ?? ((message) => console.warn(message));

  // requestMidgame(reason, onDone) always calls onDone exactly once.
  function requestMidgame(reason, onDone = () => {}) {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      onDone();
    };
    // An ad only ever runs after the run ended; anything else is a no-op.
    if (reason !== AD_REASON) {
      warn('midgame ad skipped: reason "' + reason + '" is not ' + AD_REASON);
      finish();
      return;
    }
    if (!enabled) {
      finish();
      return;
    }
    if (!request) {
      warn('midgame ad skipped: no SDK request wired');
      finish();
      return;
    }

    onPause();
    const settle = () => {
      if (settled) return;
      settled = true;
      onResume();
      onDone();
    };
    request({
      type: 'midgame',
      callbacks: {
        adStarted: () => {},
        adFinished: settle,
        adError: settle, // brief §4.2: continue the game on adError
      },
    });
  }

  return { enabled, requestMidgame };
}
