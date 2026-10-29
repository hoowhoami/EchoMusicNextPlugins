// Source Canvas measurements. Cache keys retain the exact fractional source size.
// Pretext's ICU segmentation remains shared; its measurement callback is redirected
// here so the shared Monet cache cannot round a Lumiere font size.
import * as PretextNative from '../monet/native-measure.mjs';
import { graphemeSegments } from '../../shared/text/unicode.mjs';
let metrics = new Map(),
  requests = new Map(),
  evaluator = null,
  discovery = false;
export const normalize = PretextNative.normalize;
export const canvasText = PretextNative.canvasText;
function parseFont(font) {
  const match = /^(\d+) ([\d.]+)px (.*)$/.exec(font);
  if (!match) throw new Error('Invalid Lumiere native font');
  const size = Number(match[2]);
  if (!Number.isFinite(size) || size <= 0) throw new Error('Invalid Lumiere font size');
  return { weight: Number(match[1]), size, family: match[3] };
}
export function metricKey(font, text) {
  const value = parseFont(font);
  return JSON.stringify([value.weight, value.size, value.family, canvasText(text)]);
}
function measure(font, text) {
  if (font.endsWith(' flow'))
    return { width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 };
  text = canvasText(text);
  if (evaluator) return evaluator(font, text);
  const key = metricKey(font, text);
  if (metrics.has(key)) return metrics.get(key);
  if (!discovery) throw new Error('Missing native Lumiere measurement: ' + key);
  if (!requests.has(key)) {
    const value = parseFont(font);
    requests.set(key, {
      key,
      text,
      weight: value.weight,
      size: value.size,
      fontFamily: value.family,
    });
  }
  return { width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 };
}
export function configure(input) {
  metrics = new Map((input.measurements || []).map((value) => [value.key, value]));
  requests = new Map();
  evaluator = input.evaluator || null;
  discovery = input.discovery === true;
  PretextNative.configure({ pieces: input.pieces || [], evaluator: measure });
}
export function pendingMeasurements() {
  return Array.from(requests.values());
}
export const portableGraphemeSegmenter = { segment: graphemeSegments };
export const portableWordSegmenter = PretextNative.portableWordSegmenter;
const context = {
  font: '',
  measureText(text) {
    return measure(this.font, text);
  },
};
export function getMeasureContext() {
  return context;
}
