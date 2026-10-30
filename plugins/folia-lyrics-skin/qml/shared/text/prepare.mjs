// Pure preparation seam: no QObject, document, timers, Intl or frame-time work.
// AGPL-3.0-only. Source fields and numeric time units are preserved unchanged.
import { UNICODE_VERSION, graphemeSegments } from './unicode.mjs';
import { segmentWithIcuFolia } from './icuFolia.mjs';
import { segmentLyricWords, isValidWordSegmentation } from './wordSegmentation.mjs';
import { buildLineGraphemeTimeline } from './graphemeTiming.mjs';
import {
  buildPostLyricLayoutUnits,
  buildDisplayWordsFromLayoutUnits,
} from './cjkSemanticLayout.mjs';

function normalizePieces(value) {
  if (!Array.isArray(value)) return undefined;
  let cursor = 0;
  return value.map((part) => {
    const segment = typeof part === 'string' ? part : part && part.segment;
    if (typeof segment !== 'string')
      throw new Error('ICU word pieces must contain strings or segment records');
    if (typeof part === 'object' && typeof part.index === 'number' && part.index !== cursor)
      throw new Error('ICU word piece UTF-16 offsets do not match');
    cursor += segment.length;
    return segment;
  });
}
export function prepareLines(lines, icuPieces, engines, options) {
  if (!Array.isArray(lines)) throw new Error('Expected an array of Folia lines');
  const settings = options || { semantic: true, sticky: true };
  return {
    unicodeVersion: UNICODE_VERSION,
    segmentation: 'icu-folia',
    lines: lines.map((input, index) => {
      if (!input || typeof input.fullText !== 'string' || !Array.isArray(input.words))
        throw new Error('Expected fullText and parser words on each Folia line');
      const line = Object.assign({}, input);
      if (
        !isValidWordSegmentation(line.fullText, line.wordSegments) &&
        !isValidWordSegmentation(line.fullText, line.autoWordSegments)
      ) {
        line.autoWordSegments = segmentWithIcuFolia(
          line.fullText,
          engines,
          normalizePieces(icuPieces && icuPieces[index])
        );
      }
      const layoutUnits = buildPostLyricLayoutUnits(line, settings);
      return {
        line,
        graphemes: graphemeSegments(line.fullText),
        wordSegments: segmentLyricWords(line),
        timeline: buildLineGraphemeTimeline(line),
        layoutUnits,
        displayWords: buildDisplayWordsFromLayoutUnits(layoutUnits),
      };
    }),
  };
}
