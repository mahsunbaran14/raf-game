// Drop validity for the renderer. This mirrors the placement gate in
// src/sim/step.js (piece is in the tray, every cell is inside the active
// arena, inside the board and empty) without importing step internals.
import { TUNING } from '../config/tuning.js';
import { pieceAt } from '../sim/generator.js';
import { SHAPES, GLYPHS } from '../sim/shapes.js';

const BOARD = TUNING.ARENA_START;
const SHAPE_BY_ID = new Map(SHAPES.map((shape) => [shape.id, shape]));

export function pieceOf(seed, pieceId) {
  const piece = pieceAt(seed, pieceId);
  return {
    shape: SHAPE_BY_ID.get(piece.shapeId),
    color: piece.color,
    glyph: GLYPHS[piece.color],
  };
}

export function canPlace(state, pieceId, originX, originY) {
  if (!state.tray.includes(pieceId)) return false;
  const { shape } = pieceOf(state.seed, pieceId);
  const occupied = new Set(state.cells.map((cell) => cell.x + ',' + cell.y));
  const arena = state.arena;
  for (const [dx, dy] of shape.cells) {
    const x = originX + dx;
    const y = originY + dy;
    const boardOk = x >= 0 && y >= 0 && x < BOARD && y < BOARD;
    const arenaOk =
      x >= arena.x0 &&
      y >= arena.y0 &&
      x < arena.x0 + arena.w &&
      y < arena.y0 + arena.h;
    if (!boardOk || !arenaOk || occupied.has(x + ',' + y)) return false;
  }
  return true;
}

// Pointer → cell helpers shared with the drag layer (AC2.5). The touch offset
// is a visual lift only: it moves the dragged ghost, never the drop origin.
export function cellAt(layout, point) {
  return {
    x: Math.floor((point.x - layout.boardX) / layout.cell),
    y: Math.floor((point.y - layout.boardY) / layout.cell),
  };
}

function snapOrigin(layout, point) {
  return {
    x: Math.round((point.x - layout.boardX) / layout.cell),
    y: Math.round((point.y - layout.boardY) / layout.cell),
  };
}

function shapeBounds(shape) {
  let w = 1;
  let h = 1;
  for (const [dx, dy] of shape.cells) {
    if (dx + 1 > w) w = dx + 1;
    if (dy + 1 > h) h = dy + 1;
  }
  return { w, h };
}

// Centres the ghost under the pointer, lifts it by `offset` pixels, and
// resolves the drop origin from the UNLIFTED position. Returns both so the
// renderer can draw the ghost and the sim gets a stable origin.
export function resolveDrop(layout, pointer, offset, shape) {
  const { cell } = layout;
  const bounds = shapeBounds(shape);
  const left = pointer.x - (bounds.w * cell) / 2;
  const top = pointer.y - (bounds.h * cell) / 2;
  const lift = Number.isFinite(offset) ? offset : 0;
  return {
    ghostX: left,
    ghostY: top - lift,
    origin: snapOrigin(layout, { x: left, y: top }),
  };
}
