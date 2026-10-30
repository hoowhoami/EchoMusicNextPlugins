// Explicit native widths and ICU pieces; no runtime text-width estimate is published.
import { graphemeSegments } from '../../shared/text/unicode.mjs';
let pieces = new Map(),
  metrics = new Map(),
  requests = new Map(),
  segmentRequests = new Set(),
  discovery = false,
  evaluator = null,
  pieceEvaluator = null;
export function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/[\r\f]/g, '\n');
}
// Canvas measures and paints control whitespace as spaces, not QTextLayout tabs/paragraphs.
export function canvasText(text) {
  return text.replace(/[\t-\r\u2028\u2029]/g, ' ');
}
export function metricKey(font, text) {
  const match = /^(\d+) ([\d.]+)px (.+)$/.exec(font);
  if (!match) throw new Error('Invalid native font specification');
  return JSON.stringify([Number(match[1]), Number(match[2]), match[3], canvasText(text)]);
}
export function configure(input) {
  pieces = new Map(input.pieces.map((value) => [value.text, value.pieces]));
  metrics = new Map((input.measurements || []).map((value) => [value.key, value]));
  requests = new Map();
  segmentRequests = new Set();
  discovery = input.discovery === true;
  evaluator = input.evaluator || null;
  pieceEvaluator = input.pieceEvaluator || null;
}
export function pendingMeasurements() {
  return Array.from(requests.values());
}
export function pendingSegmentations() {
  return Array.from(segmentRequests);
}
export function requestMetric(font, text) {
  text = canvasText(text);
  const key = metricKey(font, text);
  if (metrics.has(key)) return metrics.get(key);
  if (!discovery) throw new Error('Missing native Tempera measurement: ' + key);
  if (!requests.has(key)) {
    const match = /^(\d+) ([\d.]+)px (.+)$/.exec(font);
    requests.set(key, {
      key,
      text,
      weight: Number(match[1]),
      size: Number(match[2]),
      fontFamily: match[3],
    });
  }
  // Provisional values only drive discovery. prepare() never publishes this layout.
  return {
    key,
    width: 0,
    advance: 0,
    inkLeft: 0,
    inkRight: 0,
    height: 0,
    baseline: 0,
    inkTop: 0,
    inkBottom: 0,
  };
}
export const portableGraphemeSegmenter = { segment: graphemeSegments };
export const portableWordSegmenter = {
  segment(text) {
    if (pieceEvaluator) return pieceEvaluator(text);
    const result = pieces.get(text);
    if (!result || result.map((p) => p.segment).join('') !== text) {
      if (!discovery) throw new Error('Exact ICU pieces missing for Tempera pre-wrap input');
      segmentRequests.add(text);
      return [{ segment: text, index: 0, isWordLike: true }];
    }
    return result;
  },
};
const context = {
  font: '',
  measureText(text) {
    text = canvasText(text);
    if (evaluator) return { width: evaluator(this.font, text) };
    return { width: requestMetric(this.font, text).advance };
  },
};
export function getMeasureContext() {
  return context;
}
