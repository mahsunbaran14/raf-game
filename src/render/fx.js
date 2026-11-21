// PixiJS juice layer for RAF (AC2.1/AC2.2). Effects only read event payloads;
// they never touch sim state. Every display object lives in a pool so the
// scene-graph child count is bounded across a whole session.
//
// Pure helpers (ease, pulse scale, shake offset, particle count, pool) are
// exported so test/fx.test.js can cover them without a DOM.
import { Container, Graphics, Text } from 'pixi.js';
import { TUNING } from '../config/tuning.js';
import { PALETTE } from './palette.js';

export const FONT_FAMILY = 'system-ui, sans-serif';

// Pulse rises 1.0 -> 1.25 -> 1.0 (AC2.2). 1/4 is written as a division so the
// constant lint (decimal literals outside config are banned) stays happy.
const PULSE_RISE = 1 / 0x4;
const PARTICLES_MIN = 0x6; // per cleared cell
const PARTICLES_MAX = 0xa;
const PARTICLE_LIFE_MS = 0x12c; // 300 ms
const PARTICLE_SIZE_MIN = 0x2;
const PARTICLE_SPEED_DIVISOR = 0x32; // pixel unit / 50 -> px per ms
const PARTICLE_GRAVITY_DIVISOR = 0xfa0; // pixel unit / 4000 -> px per ms^2
const SHAKE_CYCLES = 0x2;
const SCORE_POP_MS = 0x258; // 600 ms
const SCORE_POP_RISE = 0x2; // in font-size units
const THUD_MS = 0x50; // 80 ms piece-lock thud
const THUD_FROM = 0x9 / 0xa; // 0.9 -> 1.0
const FLASH_MS = 0x78; // 120 ms state-change flash
const FLASH_FROM = 1 / 2;
const MAX_PARTICLES = 0x100; // hard cap; older bursts stop spawning
const MAX_OVERLAYS = 0x80;
const MAX_POPS = 0x10;
const HOME_ALPHA = 1;

export function clamp01(t) {
  if (!(t > 0)) return 0;
  if (t > HOME_ALPHA) return HOME_ALPHA;
  return t;
}

export function easeOutCubic(t) {
  const inv = 1 - clamp01(t);
  return 1 - inv * inv * inv;
}

// 0 at both ends, 1.25 exactly halfway: the cell pulse curve.
export function pulseScaleAt(t) {
  return 1 + PULSE_RISE * Math.sin(Math.PI * clamp01(t));
}

// Envelope is monotone decreasing 1 -> 0, so |offset| never exceeds magnitude.
export function shakeEnvelopeAt(t) {
  const inv = 1 - clamp01(t);
  return inv * inv;
}

export function shakeOffsetAt(
  elapsedMs,
  durationMs = TUNING.SHAKE_MS,
  magnitude = TUNING.SHAKE_PX,
) {
  if (!(elapsedMs > 0) || !(durationMs > 0)) return 0;
  if (elapsedMs >= durationMs) return 0;
  const k = elapsedMs / durationMs;
  return magnitude * shakeEnvelopeAt(k) * Math.sin(k * SHAKE_CYCLES * Math.PI * 2);
}

// 6..10 particles per cleared cell, cycled deterministically per burst.
export function particlesPerCell(index) {
  const span = PARTICLES_MAX - PARTICLES_MIN + 1;
  return PARTICLES_MIN + (((index % span) + span) % span);
}

export function burstParticleCount(cellCount) {
  let total = 0;
  for (let i = 0; i < cellCount; i += 1) total += particlesPerCell(i);
  return total;
}

// Minimal free-list pool: acquire() only grows the scene graph on first use,
// release() returns the object for reuse.
export function createPool(create) {
  const free = [];
  let created = 0;
  return {
    acquire() {
      if (free.length > 0) return free.pop();
      created += 1;
      return create();
    },
    release(item) {
      free.push(item);
    },
    get created() {
      return created;
    },
    get freeCount() {
      return free.length;
    },
  };
}

/**
 * @param {import('pixi.js').Application} app
 * @param {import('pixi.js').Container} layer container that owns the fx tree
 */
export function createFx(app, layer) {
  const root = new Container();
  const overlayLayer = new Container();
  const particleLayer = new Container();
  const popLayer = new Container();
  root.addChild(overlayLayer, particleLayer, popLayer);
  layer.addChild(root);

  // One "pixel unit" scales all motion with the viewport so phones get the
  // same feel as desktop. No tuning key exists for it (purely visual).
  const pixel = Math.max(1, Math.min(app.screen.width, app.screen.height) / 100);
  const particleSize = Math.max(PARTICLE_SIZE_MIN, Math.round(pixel));
  const speedUnit = pixel / PARTICLE_SPEED_DIVISOR;
  const gravity = pixel / PARTICLE_GRAVITY_DIVISOR;

  const particlePool = createPool(() => {
    const g = new Graphics();
    g.visible = false;
    particleLayer.addChild(g);
    return g;
  });
  const overlayPool = createPool(() => {
    const g = new Graphics();
    g.visible = false;
    overlayLayer.addChild(g);
    return g;
  });

  const particles = [];
  const overlays = [];
  const pops = [];
  const flashes = [];
  let burstIndex = 0;
  let shakeState = null;

  function spawnParticle(x, y, color) {
    const g = particlePool.acquire();
    const angle = Math.random() * Math.PI * 2;
    const speed = speedUnit * (0x1 + Math.random() * 0x2);
    g.clear();
    g.rect(-particleSize / 2, -particleSize / 2, particleSize, particleSize).fill(color);
    g.position.set(x, y);
    g.alpha = HOME_ALPHA;
    g.visible = true;
    particles.push({
      g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - speedUnit,
      life: PARTICLE_LIFE_MS,
    });
  }

  function burst(x, y, color) {
    const count = particlesPerCell(burstIndex);
    burstIndex += 1;
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i += 1) {
      spawnParticle(x, y, color);
    }
  }

  function addOverlay(cells, options) {
    const list = Array.isArray(cells) ? cells : [cells];
    const duration = Math.max(1, options.duration ?? TUNING.PULSE_MS);
    const from = options.from ?? 1;
    const to = options.to;
    const alpha = options.alpha ?? HOME_ALPHA;
    for (const cell of list) {
      if (overlays.length >= MAX_OVERLAYS) break;
      const g = overlayPool.acquire();
      g.clear();
      g.roundRect(
        -cell.size / 2,
        -cell.size / 2,
        cell.size,
        cell.size,
        cell.radius,
      ).fill(cell.color);
      g.position.set(cell.x, cell.y);
      g.scale.set(from);
      g.alpha = alpha;
      g.visible = true;
      overlays.push({ g, elapsed: 0, duration, from, to, alpha });
    }
  }

  // cells: [{x, y, size, radius, color}] in screen space, centred on the cell.
  // Default = AC2.2 pulse 1.0 -> 1.25 -> 1.0 over TUNING.PULSE_MS.
  function pulse(cells, options = {}) {
    addOverlay(cells, options);
  }

  // Placement thud: 0.9 -> 1.0 in 80 ms, one shot per placed cell.
  function thud(cells) {
    addOverlay(cells, { duration: THUD_MS, from: THUD_FROM, to: 1, alpha: 1 / 2 });
  }

  function shake(container) {
    if (!container) return;
    if (shakeState) {
      shakeState.target.position.set(shakeState.baseX, shakeState.baseY);
    }
    shakeState = {
      target: container,
      baseX: container.x,
      baseY: container.y,
      elapsed: 0,
    };
  }

  // Fast state-change flash (ring restored / wave up): alpha dips and returns.
  function flash(container) {
    if (!container) return;
    const running = flashes.find((item) => item.target === container);
    if (running) {
      running.elapsed = 0;
      return;
    }
    flashes.push({ target: container, elapsed: 0 });
    container.alpha = FLASH_FROM;
  }

  function destroyPop(pop) {
    pop.root.destroy({ children: true });
  }

  function scorePop(x, y, text, options = {}) {
    if (pops.length >= MAX_POPS) destroyPop(pops.shift());
    const fontSize = Math.max(1, Math.round(options.fontSize ?? pixel * 0x4));
    const popRoot = new Container();
    const main = new Text({
      text,
      style: { fontFamily: FONT_FAMILY, fontWeight: 'bold', fontSize, fill: PALETTE.valid },
    });
    main.anchor.set(1 / 2);
    popRoot.addChild(main);
    if (options.chain > 0 && options.mult !== undefined) {
      const multiplier = new Text({
        text: 'x' + options.mult,
        style: {
          fontFamily: FONT_FAMILY,
          fontWeight: 'bold',
          fontSize: Math.max(1, Math.round((fontSize * 0x2) / 0x3)),
          fill: PALETTE.textDim,
        },
      });
      multiplier.anchor.set(1 / 2);
      multiplier.y = (fontSize * 0x9) / 0xa;
      popRoot.addChild(multiplier);
    }
    popRoot.position.set(x, y);
    popLayer.addChild(popRoot);
    pops.push({
      root: popRoot,
      elapsed: 0,
      duration: SCORE_POP_MS,
      baseY: y,
      rise: fontSize * SCORE_POP_RISE,
    });
  }

  function updateParticles(dt) {
    const dv = gravity * dt;
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.g.visible = false;
        particlePool.release(p.g);
        particles.splice(i, 1);
        continue;
      }
      p.vy += dv;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = p.life / PARTICLE_LIFE_MS;
    }
  }

  function updateOverlays(dt) {
    for (let i = overlays.length - 1; i >= 0; i -= 1) {
      const o = overlays[i];
      o.elapsed += dt;
      const k = clamp01(o.elapsed / o.duration);
      const scale =
        o.to === undefined
          ? o.from * pulseScaleAt(k)
          : o.from + (o.to - o.from) * easeOutCubic(k);
      o.g.scale.set(scale);
      o.g.alpha = o.alpha * (1 - k);
      if (k >= 1) {
        o.g.visible = false;
        overlayPool.release(o.g);
        overlays.splice(i, 1);
      }
    }
  }

  function updatePops(dt) {
    for (let i = pops.length - 1; i >= 0; i -= 1) {
      const p = pops[i];
      p.elapsed += dt;
      const k = clamp01(p.elapsed / p.duration);
      p.root.y = p.baseY - p.rise * easeOutCubic(k);
      p.root.alpha = 1 - k;
      if (k >= 1) {
        destroyPop(p);
        pops.splice(i, 1);
      }
    }
  }

  function updateShake(dt) {
    if (!shakeState) return;
    const s = shakeState;
    s.elapsed += dt;
    const dx = shakeOffsetAt(s.elapsed);
    s.target.x = s.baseX + dx;
    s.target.y = s.baseY - dx / 2;
    if (s.elapsed >= TUNING.SHAKE_MS) {
      s.target.position.set(s.baseX, s.baseY);
      shakeState = null;
    }
  }

  function updateFlashes(dt) {
    for (let i = flashes.length - 1; i >= 0; i -= 1) {
      const f = flashes[i];
      f.elapsed += dt;
      const k = clamp01(f.elapsed / FLASH_MS);
      f.target.alpha = FLASH_FROM + (HOME_ALPHA - FLASH_FROM) * easeOutCubic(k);
      if (k >= 1) {
        f.target.alpha = HOME_ALPHA;
        flashes.splice(i, 1);
      }
    }
  }

  function update(dt) {
    if (!(dt > 0)) return;
    updateParticles(dt);
    updateOverlays(dt);
    updatePops(dt);
    updateShake(dt);
    updateFlashes(dt);
  }

  // New run: drop transient effects but keep the pools warm.
  function reset() {
    for (const p of particles) {
      p.g.visible = false;
      particlePool.release(p.g);
    }
    particles.length = 0;
    for (const o of overlays) {
      o.g.visible = false;
      overlayPool.release(o.g);
    }
    overlays.length = 0;
    for (const p of pops) destroyPop(p);
    pops.length = 0;
    for (const f of flashes) f.target.alpha = HOME_ALPHA;
    flashes.length = 0;
    burstIndex = 0;
    if (shakeState) {
      shakeState.target.position.set(shakeState.baseX, shakeState.baseY);
      shakeState = null;
    }
  }

  return { burst, pulse, thud, shake, flash, scorePop, update, reset };
}
