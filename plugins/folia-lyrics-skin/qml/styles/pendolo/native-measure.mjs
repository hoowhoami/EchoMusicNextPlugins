// Pendolo-only pretext context. Every published width comes from real QFont shaping.
import { graphemeSegments } from '../../shared/text/unicode.mjs';
let pieces = new Map(),
  widths = new Map(),
  requests = new Map(),
  used = new Set();
export function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/[\r\f]/g, '\n');
}
export function key(font, text) {
  return JSON.stringify([font, text]);
}
export function configure(input) {
  pieces = new Map(input.pieces.map((v) => [v.text, v.pieces]));
  widths = new Map(input.widths.map((v) => [v.key, v.width]));
  requests = new Map();
  used = new Set();
}
export function usedKeys() {
  return used;
}
export function pending() {
  return Array.from(requests.values());
}
export const portableGraphemeSegmenter = { segment: graphemeSegments };
export const portableWordSegmenter = {
  segment(text) {
    const found = pieces.get(text);
    if (!found || found.map((p) => p.segment).join('') !== text)
      throw new Error('Exact ICU pieces missing for Pendolo text');
    return found;
  },
};
const context = {
  font: '',
  measureText(text) {
    const token = key(this.font, text);
    used.add(token);
    if (widths.has(token)) return { width: widths.get(token) };
    if (!requests.has(token)) {
      const m = /^(\d+) ([\d.]+)px (.*)$/.exec(this.font);
      if (!m) throw new Error('Invalid native Pendolo font');
      requests.set(token, {
        key: token,
        text,
        weight: Number(m[1]),
        size: Number(m[2]),
        subtitle: m[3].startsWith('subtitle'),
        spacing: m[3].endsWith('-spaced') ? Number(m[2]) * 0.01 : 0,
      });
    }
    return { width: 0 };
  },
};
export function getMeasureContext() {
  return context;
}
