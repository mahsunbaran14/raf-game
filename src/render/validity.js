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
