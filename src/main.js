// Entry point: boots the RAF scene and wires the event stream to telemetry,
// procedural audio and the first-run onboarding banner.
// Math.random is only used here to pick a fresh run seed; the sim itself is
// deterministic and the renderer never generates randomness.
import './style.css';
import { createTelemetry } from './core/telemetry.js';
import { EVENT } from './core/events.js';
import { createAudio, sfxForEvent } from './core/audio.js';
import { STRINGS } from './config/strings.js';
import { createGame } from './render/app.js';
import { createOnboarding } from './render/onboarding.js';

function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff);
}

// Persistent mute control (AC2.4): a plain DOM button over the canvas so the
// Pixi scene stays untouched.
function mountMuteButton(container, audio, notify) {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'raf-mute';
  button.style.cssText =
    'position:fixed;right:8px;bottom:8px;padding:6px 10px;border:0;border-radius:6px;' +
    'background:#14161acc;color:#e8e8e8;font:12px system-ui,sans-serif;cursor:pointer;';

  function syncLabel() {
    button.textContent = audio.isMuted() ? STRINGS.soundOff : STRINGS.soundOn;
    button.setAttribute('aria-pressed', String(audio.isMuted()));
  }

  syncLabel();
  button.addEventListener('click', () => {
    audio.setMuted(!audio.isMuted());
    syncLabel();
    notify({ type: EVENT.UI_CLICK, id: 'mute' });
  });
  container.appendChild(button);
  return button;
}

export async function boot() {
  const container = document.getElementById('app');
  if (!container) return null;

  const telemetry = createTelemetry();
  const audio = createAudio();
  // Browsers only allow audio after a user gesture: unlock once, then the
  // armed ambient loop and later SFX can sound.
  const unlockAudio = () => audio.unlock();
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  let onboarding = null;
  let runStartedAt = 0;
  const onEvent = (event) => {
    for (const name of sfxForEvent(event)) audio.play(name, event);
    if (event.type === EVENT.RUN_STARTED) audio.startLoop();
    else if (event.type === EVENT.RUN_ENDED) audio.stopLoop();
    onboarding?.handleEvent(event);

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

  // Hints must exist before createGame(): the first RUN_STARTED is emitted
  // synchronously while the scene boots.
  onboarding = createOnboarding(container);
  const game = await createGame(container, { onEvent, newSeed: randomSeed });
  mountMuteButton(container, audio, onEvent);
  // Dev export hooks (AC1.7): JSON snapshot via window.__rafTelemetry.toJSON().
  window.__rafTelemetry = telemetry;
  window.__rafGame = game;
  window.__rafAudio = audio;
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
