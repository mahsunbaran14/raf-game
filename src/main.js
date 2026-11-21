// Entry point: boots the RAF scene and wires the event stream to telemetry.
// Math.random is only used here to pick a fresh run seed; the sim itself is
// deterministic and the renderer never generates randomness.
import './style.css';
import { createTelemetry } from './core/telemetry.js';
import { EVENT } from './core/events.js';
import { createGame } from './render/app.js';

function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff);
}

export async function boot() {
  const container = document.getElementById('app');
  if (!container) return null;

  const telemetry = createTelemetry();
  let runStartedAt = 0;
  const onEvent = (event) => {
    if (event.type === EVENT.RUN_STARTED) {
      runStartedAt = performance.now();
      telemetry.log(event);
      return;
    }
    if (event.type === EVENT.RUN_ENDED) {
      const ms = Math.round(performance.now() - runStartedAt);
      telemetry.log({ ...event, ms });
      return;
    }
    telemetry.log(event);
  };

  const game = await createGame(container, { onEvent, newSeed: randomSeed });
  // Dev export hooks (AC1.7): JSON snapshot via window.__rafTelemetry.toJSON().
  window.__rafTelemetry = telemetry;
  window.__rafGame = game;
  return game;
}

function start() {
  boot().catch((error) => console.error(error));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
