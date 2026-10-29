import { graphemeSegments } from '../../shared/text/unicode.mjs';
let current = null;
export function configure(text, pieces, measurements, discovery) {
  if (!Array.isArray(pieces) || pieces.map((part) => part.segment).join('') !== text)
    throw new Error('Exact ICU word pieces required for normalized pretext text');
  let index = 0;
  for (const piece of pieces) {
    if (piece.index !== index || typeof piece.isWordLike !== 'boolean')
      throw new Error('Invalid ICU word indices');
    index += piece.segment.length;
  }
  current = {
    text,
    pieces,
    discovery,
    measurements: new Map((measurements || []).map((value) => [value.text, value.width])),
    texts: [],
  };
}
export function discoveredTexts() {
  return current.texts.slice();
}
export function release() {
  current = null;
}
export const portableGraphemeSegmenter = { segment: graphemeSegments };
export const portableWordSegmenter = {
  segment(text) {
    if (!current || text !== current.text) throw new Error('Exact ICU word pieces not prepared');
    return current.pieces;
  },
};
const context = {
  font: '',
  measureText(text) {
    if (!current) throw new Error('Native measurement context unavailable');
    if (current.discovery) {
      if (!current.measurements.has(text)) {
        current.measurements.set(text, 0);
        current.texts.push(text);
      }
      return { width: 0 };
    }
    if (!current.measurements.has(text)) throw new Error('Missing native measurement: ' + text);
    return { width: current.measurements.get(text) };
  },
};
export function getMeasureContext() {
  return context;
}
