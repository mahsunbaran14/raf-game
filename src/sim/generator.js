// Parça üretimi (brief §5.3): saf, DOM'suz, Pixi'siz. Aynı seed + aynı id
// her zaman aynı parçayı verir. Parça kimliği tamsayı; biçim/renk burada
// türetilir (generator yalnızca kuyruğu/parçaları üretir, state yazmaz).
import { TUNING } from '../config/tuning.js';
import { mulberry32, fnv1a } from '../core/rng.js';
import { shapesForWave } from './shapes.js';

// Günlük seed: sabit önek + ISO tarih ('YYYY-MM-DD') üzerinden FNV-1a.
export function dailySeed(dateStr) {
  return fnv1a(TUNING.DAILY_SEED_PREFIX + dateStr);
}

// Dalga: ilk tepsi (id 0..TRAY_SIZE-1) dalga 1; sonra her WAVE_LENGTH
// yerleştirme bir dalga yükseltir.
export function waveAt(id) {
  return Math.floor(Math.max(id - TUNING.TRAY_SIZE, 0) / TUNING.WAVE_LENGTH) + 1;
}

function colorCountFor(wave) {
  const extra = wave >= TUNING.EXTRA_COLOR_WAVE ? 1 : 0;
  return Math.min(TUNING.COLORS_MAX, TUNING.COLORS_START + extra);
}

// Türetim: parça başına bağımsız akış rng = mulberry32((seed ^ fnv1a('p'+id)) >>> 0).
// İlk çekiliş biçim (dalganın havuzundan düzgün seçim), ikinci çekiliş renk
// (dalganın renk sayısından düzgün seçim) — böylece bir parçanın türetimi
// komşu kimliklerden ve çağrı sırasından bağımsızdır.
export function pieceAt(seed, id) {
  const wave = waveAt(id);
  const rng = mulberry32((seed ^ fnv1a('p' + id)) >>> 0);

  const pool = shapesForWave(wave);
  const shape = pool[Math.floor(rng() * pool.length)];
  const color = Math.floor(rng() * colorCountFor(wave));

  return { shapeId: shape.id, color };
}

// İlk n parça (id 0..n-1) — günlük modun ilk 10 parçası için (brief §2.6).
export function firstPieces(seed, n) {
  const pieces = [];
  for (let id = 0; id < n; id += 1) pieces.push(pieceAt(seed, id));
  return pieces;
}
