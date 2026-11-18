// Generated medians retain APL licensing. Decode only requested characters.
import { packed } from './assets/strokes-data.mjs';
let override = null;
export function configureStrokes(value) {
  override = value;
}
export function getNebbiaStrokeMedians(ch) {
  if (override) return override[ch] || null;
  const value = packed[ch];
  if (!value) return null;
  let at = 0;
  const out = [],
    strokes = value.charCodeAt(at++);
  for (let i = 0; i < strokes; ++i) {
    const line = [],
      count = value.charCodeAt(at++);
    for (let j = 0; j < count; ++j)
      line.push([value.charCodeAt(at++) - 32, value.charCodeAt(at++) - 32]);
    out.push(line);
  }
  if (at !== value.length) throw Error('Nebbia packed stroke data are corrupt');
  return out;
}
