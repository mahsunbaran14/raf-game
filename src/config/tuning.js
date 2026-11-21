// TEK AYAR KAYNAĞI (brief §2.7). Bu dosyanın DIŞINDA oyun sabiti yasak (CI lint).
// Etiketler: ASSUMPTION / FACT — brief §10 tablosuna bakınız.
export const TUNING = {
  // arena
  ARENA_START: 8,        // ASSUMPTION A1: 8x8 başlangıç
  ARENA_MIN: 4,          // brief §2.3 alt sınır
  COLLAPSE_EVERY: 4,     // ASSUMPTION A1: her 4 yerleştirmede 1 halka daralır
  REOPEN_EVERY: 5,       // ASSUMPTION A1: her 5 temizlemede 1 halka geri açılır
  // kural eşikleri
  CLUSTER_THRESHOLD: 4,  // ASSUMPTION: 4+ aynı renk ortogonal küme temizlenir
  TRAY_SIZE: 3,          // ASSUMPTION: tepside 3 parça
  WAVE_LENGTH: 8,        // ASSUMPTION: wave = 8 yerleştirme
  QUEUE_SIZE: 5,         // kuyruk uzunluğu (tepsi yenilenirken sabit kalır)
  // zorluk adımları (brief §2.4)
  TROMINO_WAVE: 2,       // wave 2: tromino + L
  EXTRA_COLOR_WAVE: 4,   // wave 4: 4. renk
  FOURCELL_WAVE: 6,      // wave 6: 4 hücreli parça
  COLORS_START: 3,
  COLORS_MAX: 4,
  // puan
  SCORE_PER_CELL: 10,
  CHAIN_MULTS: [1, 1.5, 2, 2.5], // zincir çarpanı (chain index 0..3, brief §2.2)
  WASTE_PENALTY: 50,     // zayi x 50 ceza (brief §2.3)
  // üretim kapıları (brief §5.4)
  CORE_GATE_SEEDS: 200,
  CORE_GATE_MIN_WAVE: 4,
  CORE_GATE_MIN_RATE: 0.9,
  CORE_GATE_MAX_MS: 120000,
  CORE_GATE_MAX_PLACEMENTS_NO_DEATH: 12,
  DAILY_GATE_DAYS: 365,
  DAILY_GATE_MIN_WAVE: 3,
  DAILY_GATE_MAX_MS: 1000, // 1 sn/board bütçe
  DAILY_SEED_PREFIX: 'raf-',
  DAILY_FIRST_PIECES: 10, // aynı gün aynı ilk 10 parça (brief §2.6)
  // telemetri
  TELEMETRY_BUFFER: 5000, // ring buffer (brief §6.1)
  // hedefler (ölçüm hedefi, oyun sabiti değil)
  TARGET_RUN_MS_MIN: 300000,  // A1: medyan 5-8 dk
  TARGET_RUN_MS_MAX: 480000,
  MAX_BUILD_GZ_BYTES: 5 * 1024 * 1024, // §5.2
};
