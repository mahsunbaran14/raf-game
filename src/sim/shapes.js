// Parça biçimleri (brief §2.1). Oyuncu döndürme YOK; farklı yönelimler
// ayrı biçim olarak katalogda. tier değeri tuning'den gelir (§2.7).
import { TUNING } from '../config/tuning.js';
const T0 = 0, T2 = TUNING.TROMINO_WAVE, T6 = TUNING.FOURCELL_WAVE;
export const SHAPES = [
  { id: 's',  cells: [[0, 0]], tier: T0 },
  { id: 'h',  cells: [[0, 0], [1, 0]], tier: T0 },
  { id: 'v',  cells: [[0, 0], [0, 1]], tier: T0 },
  { id: 'l1', cells: [[0, 0], [0, 1], [1, 1]], tier: T2 }, // L-tromino
  { id: 'l2', cells: [[0, 0], [1, 0], [0, 1]], tier: T2 },
  { id: 'l3', cells: [[0, 0], [1, 0], [1, 1]], tier: T2 },
  { id: 'l4', cells: [[1, 0], [0, 1], [1, 1]], tier: T2 },
  { id: 'i3h', cells: [[0, 0], [1, 0], [2, 0]], tier: T2 }, // tromino (düz)
  { id: 'i3v', cells: [[0, 0], [0, 1], [0, 2]], tier: T2 },
  { id: 'o4', cells: [[0, 0], [1, 0], [0, 1], [1, 1]], tier: T6 }, // 4 hücreli
  { id: 't4', cells: [[0, 0], [1, 0], [2, 0], [1, 1]], tier: T6 },
];

// Renkler 0..3, glifler renk başına sabit (brief §2.1: ▲ ● ■ ✦)
export const GLYPHS = ['\u25B2', '\u25CF', '\u25A0', '\u2726'];

export function shapesForWave(wave) {
  return SHAPES.filter((s) => s.tier <= wave);
}
