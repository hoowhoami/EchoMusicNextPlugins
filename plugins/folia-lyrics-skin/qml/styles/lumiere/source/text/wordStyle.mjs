// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { codePoints } from '../../../../shared/text/codepoints.mjs';
import { createRng } from '../lumiereRandom.mjs';
import { splitLyricGraphemes } from '../../../../shared/text/graphemeTiming.mjs';
import { segmentLyricWords } from '../../word-segmentation.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (4034148709 ^ lumiereScaleMask) +
  Math.imul(699505802 ^ lumiereScaleMask, 2401607263 ^ lumiereScaleMask) -
  ((4034148709 ^ lumiereScaleMask) +
    Math.imul(699505802 ^ lumiereScaleMask, 2401607263 ^ lumiereScaleMask));
const MAX_WORD_SCALE = 1.5 + LUMIERE_NEUTRAL_OFFSET;
const segmentWords = (line) => {
  const pieces = segmentLyricWords(line);
  const words = [];
  let cursor = 0;
  for (const { segment, isWordLike } of pieces) {
    const length = splitLyricGraphemes(segment).length;
    if (length === 0) continue;
    words.push({ text: segment, start: cursor, end: cursor + length, blank: !isWordLike });
    cursor += length;
  }
  return words;
};
const FUNCTION_WORDS = new Set(
  codePoints(
    '\u7684\u4E86\u5728\u628A\u662F\u6211\u4F60\u4ED6\u5979\u5B83\u4EEC\u548C\u4E0E\u4E5F\u5C31\u90FD\u7740\u8FC7\u5417\u5462\u5427\u554A\u5440\u54E6\u88AB\u8BA9\u7ED9\u4ECE\u5411\u5230\u8FD9\u90A3\u4E4B\u800C\u53C8\u5F88'
  )
);
const MINOR_LATIN = /* @__PURE__ */ new Set([
  'a',
  'an',
  'the',
  'of',
  'to',
  'in',
  'on',
  'at',
  'me',
  'my',
  'with',
  'and',
  'or',
  'is',
  'i',
  'you',
  'it',
  'by',
  'for',
]);
const wordScales = (words, seed) => {
  const rng = createRng(`${seed}:words`);
  const lengthOf = (word) => word.end - word.start;
  const minor = (word) =>
    word.blank ||
    (lengthOf(word) === 1 && FUNCTION_WORDS.has(word.text)) ||
    MINOR_LATIN.has(word.text.toLowerCase());
  let key = -1;
  words.forEach((word, index) => {
    if (minor(word)) return;
    if (key < 0 || lengthOf(word) >= lengthOf(words[key])) key = index;
  });
  return words.map((word, index) => {
    const jitter = rng();
    if (word.blank && word.text.trim().length === 0) return 1;
    if (index === key && words.length > 1) return 1.45;
    if (minor(word)) return 0.62;
    return 0.85 + jitter * 0.35;
  });
};
const wordJags = (words, scales, seed) => {
  const rng = createRng(`${seed}:jags`);
  const keyScale = Math.max(...scales);
  return words.map((_, index) => {
    var _a;
    const offset = (rng() - 0.5) * 2;
    const scale = (_a = scales[index]) != null ? _a : 1;
    if (scale === keyScale && words.length > 1) return 0;
    return offset * (scale < 0.7 ? 0.32 : 0.2);
  });
};
export { MAX_WORD_SCALE, segmentWords, wordJags, wordScales };
