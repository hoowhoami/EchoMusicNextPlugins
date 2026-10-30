// Native measureText/ICU bridge. No estimate is accepted as a published layout.
import { graphemeSegments } from '../../shared/text/unicode.mjs';
let pieces = new Map(),
  metrics = new Map(),
  requests = new Map(),
  evaluator = null,
  discovery = false;
export function normalize(text) {
  return text.replace(/\r\n/g, '\n').replace(/[\r\f]/g, '\n');
}
export function canvasText(text) {
  return text.replace(/[\t-\r\u2028\u2029]/g, ' ');
}
export function metricKey(font, text) {
  const match = /^(\d+) ([\d.]+)px (.*)$/.exec(font);
  if (!match) throw new Error('Invalid Monet native font');
  return JSON.stringify([Number(match[1]), Number(match[2]), match[3], canvasText(text)]);
}
export function configure(input) {
  pieces = new Map((input.pieces || []).map((value) => [value.text, value.pieces]));
  metrics = new Map((input.measurements || []).map((value) => [value.key, value]));
  requests = new Map();
  evaluator = input.evaluator || null;
  discovery = input.discovery === true;
}
export function pendingMeasurements() {
  return Array.from(requests.values());
}
export const portableGraphemeSegmenter = { segment: graphemeSegments };
export const portableWordSegmenter = {
  segment(text) {
    const values = pieces.get(text);
    if (!values || values.map((value) => value.segment).join('') !== text)
      throw new Error('Exact ICU pieces missing for Monet: ' + JSON.stringify(text));
    return values;
  },
};
export function inlineBox(font, text, availableWidth, lineHeight) {
  const match = /^(\d+) ([\d.]+)px (.*)$/.exec(font);
  if (!match) throw new Error('Invalid Monet inline font');
  const key = JSON.stringify([
    'inline',
    Number(match[1]),
    Number(match[2]),
    match[3],
    text,
    availableWidth,
    lineHeight,
  ]);
  if (metrics.has(key)) return metrics.get(key);
  if (!discovery) throw new Error('Missing Monet inline box');
  requests.set(key, {
    key,
    text,
    weight: Number(match[1]),
    size: Number(match[2]),
    subtitle: match[3] === 'subtitle',
    inlineBox: true,
    availableWidth,
    lineHeight,
  });
  return null;
}
const context = {
  font: '',
  measureText(text) {
    if (this.font.endsWith(' flow'))
      return { width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 };
    text = canvasText(text);
    if (evaluator) return evaluator(this.font, text);
    const key = metricKey(this.font, text);
    if (metrics.has(key)) return metrics.get(key);
    if (!discovery) throw new Error('Missing native Monet measurement: ' + key);
    if (!requests.has(key)) {
      const match = /^(\d+) ([\d.]+)px (.*)$/.exec(this.font);
      requests.set(key, {
        key,
        text,
        weight: Number(match[1]),
        size: Number(match[2]),
        subtitle: match[3] === 'subtitle',
      });
    }
    return { width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 };
  },
};
export function getMeasureContext() {
  return context;
}
