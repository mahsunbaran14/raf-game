// Yerel telemetri halka tamponu (brief §6.1). Bellek içi; ağ/DOM yok.
// seq her örnekte monoton artar; halka dolarsa EN ESKİ kayıt düşer.
import { TUNING } from '../config/tuning.js';

export function createTelemetry(cap = TUNING.TELEMETRY_BUFFER) {
  const buffer = new Array(cap);
  let head = 0; // bir sonraki yazma indeksi
  let size = 0; // dolu yuva sayısı
  let seq = 0; // örnek ömrü boyunca asla sıfırlanmaz

  function log(event) {
    buffer[head] = { ...event, seq: seq++ };
    head = (head + 1) % cap;
    if (size < cap) size++;
  }

  function all() {
    const out = [];
    const start = size < cap ? 0 : head; // doluysa en eski head'de durur
    for (let i = 0; i < size; i++) {
      out.push(buffer[(start + i) % cap]);
    }
    return out;
  }

  function toJSON() {
    return JSON.stringify({ v: 1, count: size, events: all() });
  }

  function count() {
    return size;
  }

  function clear() {
    buffer.fill(undefined);
    head = 0;
    size = 0;
  }

  return { log, all, toJSON, count, clear };
}
