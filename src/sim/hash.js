// Durum hash'i (AC1.2): kanonik JSON (anahtarlar sıralı) -> fnv1a-32.

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const body = keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',');
    return '{' + body + '}';
  }
  return JSON.stringify(value);
}

export function stateHash(state) {
  const text = canonical(state);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
