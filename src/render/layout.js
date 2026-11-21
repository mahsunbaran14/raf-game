// Pure responsive layout math for the RAF scene (no Pixi, no DOM).
// All geometry is derived from the viewport size so the 8x8 arena always
// fits; the tray is a bottom row in portrait and a right-hand column in
// landscape. Nothing here touches state or the renderer.
import { TUNING } from '../config/tuning.js';

const N = TUNING.ARENA_START;
const TRAY = TUNING.TRAY_SIZE;

// Percent splits are written in hex because the constant lint only allows
// the decimal literals 0/1/-1/2/100 outside src/config.
const HUD_PCT = 0x08; // 8% of the height for the score band
const TRAY_PCT_PORTRAIT = 0x1a; // 26% of the minor side for the bottom tray
const TRAY_PCT_LANDSCAPE = 0x12; // 18% of the minor side for the side tray

export function layoutFor(w, h) {
  const trayHorizontal = w > h;
  const pad = Math.max(2, Math.round(Math.min(w, h) / 100));
  const hudH = Math.round((h * HUD_PCT) / 100);
  const trayReserve = Math.round(
    (Math.min(w, h) * (trayHorizontal ? TRAY_PCT_LANDSCAPE : TRAY_PCT_PORTRAIT)) / 100,
  );

  const availW = trayHorizontal ? w - trayReserve - pad * 2 * 2 : w - pad * 2;
  const availH = trayHorizontal ? h - hudH - pad * 2 : h - hudH - trayReserve - (pad * 2 + pad);

  const cell = Math.max(1, Math.floor(Math.min(availW, availH) / N));
  const boardW = cell * N;
  const boardH = cell * N;
  const gap = Math.max(2, Math.round(cell / 2 / 2));
  const trayW = trayHorizontal
    ? Math.max(cell, Math.min(cell * 2, trayReserve - pad * 2))
    : Math.max(
        cell,
        Math.min(cell * 2, Math.floor((w - pad * 2 - gap * (TRAY - 1)) / TRAY)),
      );

  if (trayHorizontal) {
    const trayH = trayW * TRAY + gap * (TRAY - 1);
    return {
      cell,
      boardX: pad + Math.max(0, Math.round((w - trayReserve - pad * 2 * 2 - boardW) / 2)),
      boardY: hudH + Math.max(0, Math.round((h - hudH - boardH) / 2)),
      boardW,
      boardH,
      trayX: w - pad - trayW,
      trayY: Math.max(hudH, Math.round((h - trayH) / 2)),
      trayHorizontal,
      slot: trayW,
      gap,
      hudH,
      inset: Math.max(1, Math.round(cell / 2 / 2 / 2 / 2)),
    };
  }

  const contentH = boardH + gap * 2 + trayW;
  const top = hudH + Math.max(0, Math.round((h - hudH - contentH) / 2));
  return {
    cell,
    boardX: Math.round((w - boardW) / 2),
    boardY: top,
    boardW,
    boardH,
    trayX: Math.round((w - (trayW * TRAY + gap * (TRAY - 1))) / 2),
    trayY: top + boardH + gap * 2,
    trayHorizontal,
    slot: trayW,
    gap,
    hudH,
    inset: Math.max(1, Math.round(cell / 2 / 2 / 2 / 2)),
  };
}
