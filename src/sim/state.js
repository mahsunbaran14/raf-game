// Başlangıç durumu (brief §5.3 veri sözleşmesi).
import { TUNING } from '../config/tuning.js';
import { EVENT } from '../core/events.js';

const BOARD = TUNING.ARENA_START;

export function initState(seed, mode = 'run') {
  const tray = [];
  for (let i = 0; i < TUNING.TRAY_SIZE; i += 1) tray.push(i);
  const queue = [];
  for (let i = 0; i < TUNING.QUEUE_SIZE; i += 1) queue.push(TUNING.TRAY_SIZE + i);
  return {
    v: 1,
    seed,
    mode,
    placements: 0,
    wave: 1,
    arena: { x0: 0, y0: 0, w: BOARD, h: BOARD },
    cells: [],
    tray,
    queue,
    score: 0,
    clears: 0,
    waste: 0,
    status: 'playing',
  };
}

export function startRun(seed, mode = 'run') {
  return { state: initState(seed, mode), events: [{ type: EVENT.RUN_STARTED }] };
}
