// Saf oyun adımı (brief §5.3). DOM/Pixi/Date/Math.random YOK.
import { TUNING } from '../config/tuning.js';
import { EVENT } from '../core/events.js';
import { SHAPES } from './shapes.js';
import { pieceAt, waveAt } from './generator.js';

const BOARD = TUNING.ARENA_START;
const SHAPE_BY_ID = new Map(SHAPES.map((s) => [s.id, s]));
const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const posKey = (x, y) => x + ',' + y;

function cellsOf(seed, id) {
  const piece = pieceAt(seed, id);
  return { shape: SHAPE_BY_ID.get(piece.shapeId), color: piece.color };
}

function insideBoard(x, y) {
  return x >= 0 && y >= 0 && x < BOARD && y < BOARD;
}

function insideArena(arena, x, y) {
  return (
    x >= arena.x0 &&
    y >= arena.y0 &&
    x < arena.x0 + arena.w &&
    y < arena.y0 + arena.h
  );
}

function canPlace(seed, id, arena, occupied, originX, originY) {
  const { shape } = cellsOf(seed, id);
  for (const [dx, dy] of shape.cells) {
    const x = originX + dx;
    const y = originY + dy;
    if (!insideBoard(x, y) || !insideArena(arena, x, y) || occupied.has(posKey(x, y))) {
      return false;
    }
  }
  return true;
}

function fitsAnywhere(seed, id, arena, occupied) {
  for (let y = arena.y0; y < arena.y0 + arena.h; y += 1) {
    for (let x = arena.x0; x < arena.x0 + arena.w; x += 1) {
      if (canPlace(seed, id, arena, occupied, x, y)) return true;
    }
  }
  return false;
}

function bounds(group) {
  let minX = group[0].x;
  let minY = group[0].y;
  for (const c of group) {
    if (c.x < minX) minX = c.x;
    if (c.y < minY) minY = c.y;
  }
  return { minX, minY };
}

function findGroups(cells) {
  const byPos = new Map(cells.map((c) => [posKey(c.x, c.y), c]));
  const seen = new Set();
  const groups = [];
  for (const start of cells) {
    const startKey = posKey(start.x, start.y);
    if (seen.has(startKey)) continue;
    seen.add(startKey);
    const group = [];
    const stack = [start];
    while (stack.length) {
      const c = stack.pop();
      group.push(c);
      for (const [dx, dy] of NEIGHBORS) {
        const k = posKey(c.x + dx, c.y + dy);
        if (seen.has(k)) continue;
        const n = byPos.get(k);
        if (n && n.c === c.c) {
          seen.add(k);
          stack.push(n);
        }
      }
    }
    if (group.length >= TUNING.CLUSTER_THRESHOLD) groups.push(group);
  }
  groups.sort((a, b) => {
    const ba = bounds(a);
    const bb = bounds(b);
    return ba.minY - bb.minY || ba.minX - bb.minX;
  });
  return groups;
}

function clearLoop(cells, score, clears) {
  const events = [];
  const mults = TUNING.CHAIN_MULTS;
  let chain = 0;
  let current = cells;
  for (;;) {
    const groups = findGroups(current);
    if (groups.length === 0) break;
    const removed = new Set();
    for (const group of groups) {
      const mult = mults[Math.min(chain, mults.length - 1)];
      for (const c of group) removed.add(posKey(c.x, c.y));
      events.push({
        type: EVENT.CLUSTER_CLEARED,
        cells: group
          .map((c) => ({ x: c.x, y: c.y }))
          .sort((a, b) => a.y - b.y || a.x - b.x),
        chain,
        mult,
      });
      score += Math.round(TUNING.SCORE_PER_CELL * group.length * mult);
      clears += 1;
      chain += 1;
    }
    current = current.filter((c) => !removed.has(posKey(c.x, c.y)));
  }
  return { cells: current, score, clears, events };
}

export function step(state, action) {
  if (state.status !== 'playing') return { state, events: [] };
  if (action === null || action === undefined || action.type !== 'place') {
    return { state, events: [{ type: EVENT.INVALID_DROP }] };
  }

  const slot = state.tray.indexOf(action.pieceId);
  if (slot < 0) return { state, events: [{ type: EVENT.INVALID_DROP }] };

  const { shape, color } = cellsOf(state.seed, action.pieceId);
  const occupied = new Set(state.cells.map((c) => posKey(c.x, c.y)));
  if (!canPlace(state.seed, action.pieceId, state.arena, occupied, action.x, action.y)) {
    return { state, events: [{ type: EVENT.INVALID_DROP }] };
  }

  const events = [];
  const next = {
    ...state,
    arena: { ...state.arena },
    cells: state.cells.map((c) => ({ ...c })),
    tray: state.tray.slice(),
    queue: state.queue.slice(),
  };

  // a. taş yerleşir, tepsi sırası yenilenir
  for (const [dx, dy] of shape.cells) {
    next.cells.push({ x: action.x + dx, y: action.y + dy, c: color, g: color });
  }
  let lastId = 0;
  for (const id of state.tray) lastId = Math.max(lastId, id);
  for (const id of state.queue) lastId = Math.max(lastId, id);
  next.tray[slot] = next.queue.shift();
  next.queue.push(lastId + 1);
  next.placements += 1;
  events.push({ type: EVENT.PIECE_PLACED, pieceId: action.pieceId, x: action.x, y: action.y });

  // b. temizleme döngüsü (her turda kümeler yeniden bulunur)
  const cleared = clearLoop(next.cells, next.score, next.clears);
  next.cells = cleared.cells;
  next.score = cleared.score;
  next.clears = cleared.clears;
  events.push(...cleared.events);
  const hadClear = cleared.events.length > 0;

  // c. halka geri açılır (adım başına en fazla bir kez)
  if (hadClear && next.clears % TUNING.REOPEN_EVERY === 0 && next.arena.w < TUNING.ARENA_START) {
    next.arena = {
      x0: next.arena.x0 - 1,
      y0: next.arena.y0 - 1,
      w: next.arena.w + 1,
      h: next.arena.h + 1,
    };
    events.push({ type: EVENT.RING_RESTORED });
  }

  // d. halka daralır; dışarıda kalan taşlar zayiata gider
  if (next.placements % TUNING.COLLAPSE_EVERY === 0 && next.arena.w > TUNING.ARENA_MIN) {
    const arena = {
      x0: next.arena.x0 + 1,
      y0: next.arena.y0 + 1,
      w: next.arena.w - 1,
      h: next.arena.h - 1,
    };
    let destroyed = 0;
    next.cells = next.cells.filter((c) => {
      if (insideArena(arena, c.x, c.y)) return true;
      destroyed += 1;
      return false;
    });
    next.arena = arena;
    next.waste += destroyed;
    next.score -= destroyed * TUNING.WASTE_PENALTY;
    events.push({ type: EVENT.RING_COLLAPSED, n: destroyed });
  }

  // e. dalga: yerleşen parçanın id'si hangi dalgaya aitse (main ruling)
  const pieceWave = waveAt(action.pieceId);
  if (pieceWave > next.wave) {
    next.wave = pieceWave;
    events.push({ type: EVENT.WAVE_UP, n: pieceWave });
  }

  // f. oynanabilirlik sonu
  const filled = new Set(next.cells.map((c) => posKey(c.x, c.y)));
  const anyFits = next.tray.some((id) => fitsAnywhere(next.seed, id, next.arena, filled));
  if (!anyFits) {
    next.status = 'over';
    events.push({
      type: EVENT.RUN_ENDED,
      reason: 'no_fit',
      score: next.score,
      wave: next.wave,
    });
  }

  return { state: next, events };
}
