// Explicit native widths and ICU pieces; no runtime text-width estimate is published.
import { graphemeSegments } from '../../shared/text/unicode.mjs';
// QV4 Map searches keys linearly; measured strings use native property lookup.
let pieces = Object.create(null),
  widths = Object.create(null),
  requests = Object.create(null),
  requestOrder = [],
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
  pieces = Object.create(null);
  for (const value of input.pieces) pieces[value.text] = value.pieces;
  widths = input.widths || Object.create(null);
  if (!input.widths) for (const value of input.measurements || []) widths[value.key] = value.width;
  requests = Object.create(null);
  requestOrder = [];
  discovery = input.discovery === true;
  evaluator = input.evaluator || null;
}
export function pendingMeasurements() {
  return requestOrder.slice();
}
let graphemeCache = Object.create(null),
  graphemeCount = 0,
  graphemeUnits = 0;
export function clearGraphemeCache() {
  graphemeCache = Object.create(null);
  graphemeCount = graphemeUnits = 0;
}
export const portableGraphemeSegmenter = {
  segment(text) {
    const cached = graphemeCache[text];
    if (cached !== undefined) return cached;
    const value = graphemeSegments(text);
    if (text.length <= 65536) {
      if (graphemeCount >= 1024 || graphemeUnits + text.length > 65536) clearGraphemeCache();
      graphemeCache[text] = value;
      ++graphemeCount;
      graphemeUnits += text.length;
    }
    return value;
  },
};
export const portableWordSegmenter = {
  segment(text) {
    const result = pieces[text];
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
    const width = widths[key];
    if (width !== undefined) return { width };
    if (!discovery) throw new Error('Missing native Fume measurement: ' + key);
    if (requests[key] === undefined) {
      const match = /^(\d+) ([\d.]+)px /.exec(this.font);
      const query = { key, text, weight: Number(match[1]), size: Number(match[2]) };
      requests[key] = query;
      requestOrder.push(query);
    }
    return { width: 0 };
  },
};
export function getMeasureContext() {
  return context;
}
