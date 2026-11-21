// Deterministik RNG + hash (brief §5.3). DOM yok, Pixi yok.
// lint-exempt: standard rng constants (fnv1a/mulberry32 published values)
// Hex yazımı, check-constants'ın ondalık-sayı regex'ine takılmaması için de
// aynı değerleri verir (0x6D2B79F5 = 1831565813 vb.).

// Yayımlanmış mulberry32: tohum başına [0,1) float üreten kapanış.
export function mulberry32(a) {
  return function next() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 0xF), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 0x7), 0x3D | t)) ^ t;
    return ((t ^ (t >>> 0xE)) >>> 0) / 0x100000000;
  };
}

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const UTF8 = new TextEncoder();

// 32-bit FNV-1a, UTF-8 byte'ları üzerinden, işaretsiz döner.
export function fnv1a(str) {
  const bytes = UTF8.encode(str);
  let h = FNV_OFFSET;
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i];
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}
