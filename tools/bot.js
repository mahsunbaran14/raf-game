// Deterministic bot (brief §5.4). No DOM/Pixi/Date/Math.random: the only
// inputs are the state and the seeded piece generator, so equal states always
// produce equal moves.
//
// Heuristic (fixed, no look-ahead, no rotation):
//   score  = sum over the piece's cells of same-color orthogonal neighbours
//            in the board *after* the placement (internal piece adjacencies
//            included, as they read after placement)
//   ties   = anchor closer to the arena centre (squared distance)
//   ties   = piece id ascending, then x ascending, then y ascending
import { pieceAt } from '../src/sim/generator.js';
import { SHAPES } from '../src/sim/shapes.js';
import { startRun } from '../src/sim/state.js';
import { step } from '../src/sim/step.js';

const SHAPE_BY_ID = new Map(SHAPES.map((shape) => [shape.id, shape]));
const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Safety cap for runBot: a run that somehow never ends stops here.
export const MAX_PLACEMENTS = 10000;

const keyOf = (x, y) => x + ',' + y;
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function pieceCells(seed, pieceId) {
  const piece = pieceAt(seed, pieceId);
  return { shape: SHAPE_BY_ID.get(piece.shapeId), color: piece.color };
}

function better(candidate, best) {
  if (best === null) return true;
  if (candidate.score !== best.score) return candidate.score > best.score;
  if (candidate.dist !== best.dist) return candidate.dist < best.dist;
  if (candidate.pieceId !== best.pieceId) return candidate.pieceId < best.pieceId;
  if (candidate.x !== best.x) return candidate.x < best.x;
  return candidate.y < best.y;
}

/**
 * Pick the single best legal placement for the current state.
 * @returns {{pieceId:number, x:number, y:number}|null}
 */
export function choosePlacement(state) {
  const arena = state.arena;
  const occupied = new Map();
  for (const cell of state.cells) occupied.set(keyOf(cell.x, cell.y), cell.c);

  const centerX = arena.x0 + arena.w / 2;
  const centerY = arena.y0 + arena.h / 2;

  let best = null;
  for (const pieceId of state.tray) {
    const { shape, color } = pieceCells(state.seed, pieceId);
    if (!shape) continue;

    for (let y = arena.y0; y < arena.y0 + arena.h; y += 1) {
      for (let x = arena.x0; x < arena.x0 + arena.w; x += 1) {
        // Legality: every cell of the shape must land inside the arena on
        // an empty square (the arena is always inside the board).
        let legal = true;
        const local = new Set();
        for (const [dx, dy] of shape.cells) {
          const cx = x + dx;
          const cy = y + dy;
          if (
            cx < arena.x0 ||
            cy < arena.y0 ||
            cx >= arena.x0 + arena.w ||
            cy >= arena.y0 + arena.h ||
            occupied.has(keyOf(cx, cy))
          ) {
            legal = false;
            break;
          }
          local.add(keyOf(cx, cy));
        }
        if (!legal) continue;

        // Same-color neighbours after the placement, summed per piece cell.
        let score = 0;
        for (const [dx, dy] of shape.cells) {
          const cx = x + dx;
          const cy = y + dy;
          for (const [nx, ny] of DIRS) {
            const k = keyOf(cx + nx, cy + ny);
            if (local.has(k)) score += 1;
            else if (occupied.get(k) === color) score += 1;
          }
        }

        const ddx = x - centerX;
        const ddy = y - centerY;
        const candidate = { pieceId, x, y, score, dist: ddx * ddx + ddy * ddy };
        if (better(candidate, best)) best = candidate;
      }
    }
  }

  return best === null ? null : { pieceId: best.pieceId, x: best.x, y: best.y };
}

/**
 * Drive a full run with the fixed heuristic.
 * @param {number} seed
 * @param {'run'|'daily'} [mode]
 * @returns {{state:object, events:object[], placements:number, wave:number,
 *            ms:number, capped:boolean}}
 */
export function runBot(seed, mode = 'run') {
  const started = now();
  const start = startRun(seed, mode);
  let state = start.state;
  const events = start.events.slice();
  let wave = state.wave;
  let capped = false;

  while (state.status === 'playing') {
    if (state.placements >= MAX_PLACEMENTS) {
      capped = true;
      break;
    }
    const move = choosePlacement(state);
    if (move === null) break;
    const out = step(state, { type: 'place', pieceId: move.pieceId, x: move.x, y: move.y });
    // Defensive: step rejects with invalid_drop and returns the same state.
    if (out.state === state) break;
    state = out.state;
    events.push(...out.events);
    if (state.wave > wave) wave = state.wave;
  }

  return {
    state,
    events,
    placements: state.placements,
    wave,
    ms: now() - started,
    capped,
  };
}
