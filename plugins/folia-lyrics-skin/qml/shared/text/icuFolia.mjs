// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/text-reference.md.
import { CHINESE_NON_HOSTS, CHINESE_TRAILING_PARTICLES } from './lexicon.mjs';
import { isCjPiece, hasKana, isAlphabeticWord } from './unicode.mjs';
const HYPHEN = /^[-‐‑]$/;
const HYPHEN_SPLIT = /[-‐‑]/;
const icuWordPieces = (text, pieces) => {
  if (
    !Array.isArray(pieces) ||
    pieces.some((piece) => typeof piece !== 'string') ||
    pieces.join('') !== text
  ) {
    throw new Error(
      'Exact ICU word pieces are required; Qt/UAX29 words are not interchangeable with Intl.Segmenter'
    );
  }
  return pieces;
};
const rebuilds = (pieces, text) => pieces.length > 0 && pieces.join('') === text;
const attachTrailingParticles = (words) => {
  const out = [];
  for (const word of words) {
    const host = out[out.length - 1];
    if (host !== void 0 && CHINESE_TRAILING_PARTICLES.has(word) && !CHINESE_NON_HOSTS.has(host)) {
      out[out.length - 1] = host + word;
    } else {
      out.push(word);
    }
  }
  return out;
};
const cutCjRun = (run, icuPieces, engines) => {
  if (!engines) {
    return icuPieces;
  }
  if (hasKana(run)) {
    const bunsetsu = engines.parseJapanese(run);
    return rebuilds(bunsetsu, run) ? bunsetsu : icuPieces;
  }
  const words = engines.cutChinese(run);
  return rebuilds(words, run) ? attachTrailingParticles(words) : icuPieces;
};
const joinHyphenatedWords = (pieces) => {
  var _a;
  const out = [];
  for (let index = 0; index < pieces.length; index += 1) {
    const piece = pieces[index];
    const previous = out[out.length - 1];
    const next = pieces[index + 1];
    if (
      HYPHEN.test(piece) &&
      previous !== void 0 &&
      next !== void 0 &&
      isAlphabeticWord((_a = previous.split(HYPHEN_SPLIT).pop()) != null ? _a : '') &&
      isAlphabeticWord(next)
    ) {
      out[out.length - 1] = previous + piece + next;
      index += 1;
    } else {
      out.push(piece);
    }
  }
  return out;
};
const segmentWithIcuFolia = (text, engines, basePieces) => {
  if (!text) {
    return [];
  }
  const pieces = icuWordPieces(text, basePieces);
  const out = [];
  let index = 0;
  while (index < pieces.length) {
    if (!isCjPiece(pieces[index])) {
      out.push(pieces[index]);
      index += 1;
      continue;
    }
    const runPieces = [];
    while (index < pieces.length && isCjPiece(pieces[index])) {
      runPieces.push(pieces[index]);
      index += 1;
    }
    out.push(...cutCjRun(runPieces.join(''), runPieces, engines));
  }
  return joinHyphenatedWords(out);
};
export { segmentWithIcuFolia };
