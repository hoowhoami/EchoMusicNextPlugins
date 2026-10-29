import { propertyTest } from '../cadenza/unicode-properties.mjs';
import { codePoints } from '../../shared/text/codepoints.mjs';
const punctuation = propertyTest(['P', 'S']),
  han = propertyTest(['Script=Han']);
export function isPunctuationOnly(text) {
  return (
    text.length > 0 && codePoints(text).every((char) => /\s/.test(char) || punctuation.test(char))
  );
}
export function isSingleHan(text) {
  const points = codePoints(text);
  return points.length === 1 && han.test(points[0]);
}
