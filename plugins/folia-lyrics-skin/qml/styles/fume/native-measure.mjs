// Explicit native widths and ICU pieces; no runtime text-width estimate is published.
import { graphemeSegments } from '../../shared/text/unicode.mjs';
let pieces = new Map(),
  widths = new Map(),
  requests = new Map(),
  discovery = false,
  evaluator = null;
export function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/[\r\f]/g, '\n');
}
// Canvas measures and paints control whitespace as spaces, not QTextLayout tabs/paragraphs.
export function canvasText(text) {
  return text.replace(/[\t-\r\u2028\u2029]/g, ' ');
}
export function metricKey(font, text) {
  const match = /^(\d+) ([\d.]+)px /.exec(font);
  if (!match) throw new Error('Invalid native font specification');
  return JSON.stringify([Number(match[1]), Number(match[2]), canvasText(text)]);
}
export function configure(input) {
  pieces = new Map(input.pieces.map((value) => [value.text, value.pieces]));
  widths = new Map((input.measurements || []).map((value) => [value.key, value.width]));
  requests = new Map();
  discovery = input.discovery === true;
  evaluator = input.evaluator || null;
}
export function pendingMeasurements() {
  return Array.from(requests.values());
}
export const portableGraphemeSegmenter = { segment: graphemeSegments };
export const portableWordSegmenter = {
  segment(text) {
    const result = pieces.get(text);
    if (!result || result.map((p) => p.segment).join('') !== text)
      throw new Error('Exact ICU pieces missing for Fume pre-wrap input');
    return result;
  },
};
const context = {
  font: '',
  measureText(text) {
    text = canvasText(text);
    if (evaluator) return { width: evaluator(this.font, text) };
    const key = metricKey(this.font, text);
    if (widths.has(key)) return { width: widths.get(key) };
    if (!discovery) throw new Error('Missing native Fume measurement: ' + key);
    if (!requests.has(key)) {
      const match = /^(\d+) ([\d.]+)px /.exec(this.font);
      requests.set(key, { key, text, weight: Number(match[1]), size: Number(match[2]) });
    }
    return { width: 0 };
  },
};
export function getMeasureContext() {
  return context;
}
