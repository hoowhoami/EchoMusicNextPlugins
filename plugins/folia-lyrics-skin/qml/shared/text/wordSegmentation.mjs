// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/text-reference.md.
import { flatMap } from './compat.mjs';
import { splitLyricGraphemes } from './graphemeTiming.mjs';
import { isPunctuationOnly } from './unicode.mjs';
const isWordLikeText = (text) => !isPunctuationOnly(text);
const segmentsFromBoundaries = (boundaries) => {
  let cursor = 0;
  return boundaries.map((segment) => {
    const part = { segment, index: cursor, isWordLike: isWordLikeText(segment) };
    cursor += segment.length;
    return part;
  });
};
const segmentTextWords = (text) => {
  return text ? segmentsFromBoundaries(splitLyricGraphemes(text)) : [];
};
const isValidWordSegmentation = (text, boundaries) =>
  Array.isArray(boundaries) &&
  boundaries.length > 0 &&
  boundaries.every((segment) => typeof segment === 'string') &&
  boundaries.join('') === text;
const EDGE_WHITESPACE = /^(\s*)([\s\S]*?)(\s*)$/u;
const splitEdgeWhitespace = (boundaries) =>
  flatMap(boundaries, (boundary) => {
    var _a;
    const [, lead, core, trail] = (_a = EDGE_WHITESPACE.exec(boundary)) != null ? _a : [];
    return core ? [lead, core, trail].filter(Boolean) : [boundary].filter(Boolean);
  });
const segmentLyricWords = (line) => {
  if (isValidWordSegmentation(line.fullText, line.wordSegments)) {
    return segmentsFromBoundaries(splitEdgeWhitespace(line.wordSegments));
  }
  if (isValidWordSegmentation(line.fullText, line.autoWordSegments)) {
    return segmentsFromBoundaries(line.autoWordSegments);
  }
  return segmentTextWords(line.fullText);
};
const getWordSegmentationKey = (line) => {
  if (line.wordSegments) {
    return line.wordSegments.map((segment) => segment.length).join(',');
  }
  return line.autoWordSegments
    ? `a${line.autoWordSegments.map((segment) => segment.length).join(',')}`
    : '';
};
const hasWordSegmentationOverride = (line) =>
  isValidWordSegmentation(line.fullText, line.wordSegments);
export {
  getWordSegmentationKey,
  hasWordSegmentationOverride,
  isValidWordSegmentation,
  segmentLyricWords,
  segmentTextWords,
  segmentsFromBoundaries,
};
