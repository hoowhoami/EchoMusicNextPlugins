// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/text-reference.md.
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { trimEnd } from './compat.mjs';
import { flatMap } from './compat.mjs';
import { hasWordSegmentationOverride, segmentLyricWords } from './wordSegmentation.mjs';
const CJK_REGEX = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/;
const WHITESPACE_REGEX = /^\s+$/;
const APOSTROPHE_ONLY_REGEX = /^['’]\s*$/;
const CONTRACTION_SUFFIX_REGEX = /^(s|t|m|d|ll|re|ve|em)\s*$/i;
const DIRECT_CONTRACTION_REGEX = /^['’](s|t|m|d|ll|re|ve|em)\s*$/i;
const TRAILING_APOSTROPHE_REGEX = /['’]\s*$/;
import {
  endsWithLetterOrNumber,
  hasInlineContraction as hasInlineContractionText,
} from './unicode.mjs';
const STICKY_TRAILING_PUNCTUATION_REGEX = /^[,.;:!?，。！？、：；）】》」』〉〕］)}\]"'’”’]+$/u;
const hasCjkText = (text) => CJK_REGEX.test(text);
const createSingleWordLayoutUnits = (words) =>
  words.map((word) => ({
    text: word.text,
    words: [word],
    startTime: word.startTime,
    endTime: word.endTime,
    isSemantic: false,
  }));
const getWordSegments = (line) => {
  const segments = segmentLyricWords(line);
  return segments.length > 0
    ? segments.map(({ segment, isWordLike }) => ({ segment, isWordLike }))
    : null;
};
const appendWordsToUnit = (unit, text, words) => {
  var _a, _b;
  unit.text += text;
  unit.words.push(...words);
  unit.endTime =
    (_b = (_a = words[words.length - 1]) == null ? void 0 : _a.endTime) != null ? _b : unit.endTime;
};
const cloneUnit = (unit) =>
  __spreadProps(__spreadValues({}, unit), {
    words: [...unit.words],
  });
const appendUnitToStickyUnit = (target, unit) => {
  target.text += unit.text;
  target.words.push(...unit.words);
  target.endTime = unit.endTime;
  target.isSticky = true;
};
const canAttachToPrevious = (text) => endsWithLetterOrNumber(trimEnd(text));
const endsWithApostrophe = (text) => TRAILING_APOSTROPHE_REGEX.test(trimEnd(text));
const isApostropheOnlyUnit = (unit) => APOSTROPHE_ONLY_REGEX.test(unit.text.trim());
const isContractionSuffixUnit = (unit) => CONTRACTION_SUFFIX_REGEX.test(unit.text.trim());
const isDirectContractionUnit = (unit) => DIRECT_CONTRACTION_REGEX.test(unit.text.trim());
const isStickyTrailingPunctuationUnit = (unit) =>
  STICKY_TRAILING_PUNCTUATION_REGEX.test(unit.text.trim());
const hasAttachedTrailingPunctuation = (unit) => {
  if (unit.words.length <= 1) {
    return false;
  }
  const lastWord = unit.words[unit.words.length - 1];
  return Boolean(
    lastWord &&
    isStickyTrailingPunctuationUnit({
      text: lastWord.text,
      words: [lastWord],
      startTime: lastWord.startTime,
      endTime: lastWord.endTime,
      isSemantic: false,
    })
  );
};
const hasInlineContraction = (unit) =>
  unit.words.length > 1 && !unit.isSemantic && hasInlineContractionText(unit.text);
const mapSegmentsToWords = (segments, words) => {
  const units = [];
  let wordIndex = 0;
  for (const segment of segments) {
    const segmentText = segment.segment;
    if (!segmentText || WHITESPACE_REGEX.test(segmentText)) {
      continue;
    }
    const startWordIndex = wordIndex;
    let collectedText = '';
    while (wordIndex < words.length && collectedText.length < segmentText.length) {
      collectedText += words[wordIndex].text;
      wordIndex += 1;
      if (!segmentText.startsWith(collectedText)) {
        return null;
      }
    }
    if (collectedText !== segmentText) {
      return null;
    }
    const segmentWords = words.slice(startWordIndex, wordIndex);
    const firstWord = segmentWords[0];
    const lastWord = segmentWords[segmentWords.length - 1];
    if (!firstWord || !lastWord) {
      return null;
    }
    if (!segment.isWordLike && units.length > 0) {
      appendWordsToUnit(units[units.length - 1], segmentText, segmentWords);
      continue;
    }
    units.push({
      text: segmentText,
      words: segmentWords,
      startTime: firstWord.startTime,
      endTime: lastWord.endTime,
      isSemantic: Boolean(segment.isWordLike && hasCjkText(segmentText) && segmentWords.length > 1),
    });
  }
  if (wordIndex !== words.length || units.length === 0) {
    return null;
  }
  return units;
};
const buildCjkSemanticLayoutUnits = (line) => {
  var _a;
  if (line.words.length === 0) {
    return [];
  }
  const fallbackUnits = createSingleWordLayoutUnits(line.words);
  if (!hasCjkText(line.fullText) && !hasWordSegmentationOverride(line)) {
    return fallbackUnits;
  }
  const segments = getWordSegments(line);
  if (!segments) {
    return fallbackUnits;
  }
  return (_a = mapSegmentsToWords(segments, line.words)) != null ? _a : fallbackUnits;
};
const applyStickyPunctuationLayoutUnits = (units) => {
  const merged = [];
  for (let index = 0; index < units.length; index += 1) {
    const current = units[index];
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push(cloneUnit(current));
      continue;
    }
    const next = units[index + 1];
    if (
      isApostropheOnlyUnit(current) &&
      next &&
      canAttachToPrevious(previous.text) &&
      isContractionSuffixUnit(next)
    ) {
      appendUnitToStickyUnit(previous, current);
      appendUnitToStickyUnit(previous, next);
      index += 1;
      continue;
    }
    if (isDirectContractionUnit(current) && canAttachToPrevious(previous.text)) {
      appendUnitToStickyUnit(previous, current);
      continue;
    }
    if (isContractionSuffixUnit(current) && endsWithApostrophe(previous.text)) {
      appendUnitToStickyUnit(previous, current);
      continue;
    }
    if (isStickyTrailingPunctuationUnit(current) && canAttachToPrevious(previous.text)) {
      appendUnitToStickyUnit(previous, current);
      continue;
    }
    merged.push(cloneUnit(current));
  }
  return merged.map((unit) =>
    hasAttachedTrailingPunctuation(unit) || hasInlineContraction(unit)
      ? __spreadProps(__spreadValues({}, unit), { isSticky: true })
      : unit
  );
};
const buildPostLyricLayoutUnits = (line, options = {}) => {
  const rawUnits = options.semantic
    ? buildCjkSemanticLayoutUnits(line)
    : createSingleWordLayoutUnits(line.words);
  return options.sticky ? applyStickyPunctuationLayoutUnits(rawUnits) : rawUnits;
};
const buildDisplayWordsFromLayoutUnits = (units) =>
  flatMap(units, (unit) => {
    if (!unit.isSticky || unit.isSemantic) {
      return unit.words;
    }
    return [
      {
        text: unit.text,
        startTime: unit.startTime,
        endTime: unit.endTime,
      },
    ];
  });
export {
  applyStickyPunctuationLayoutUnits,
  buildCjkSemanticLayoutUnits,
  buildDisplayWordsFromLayoutUnits,
  buildPostLyricLayoutUnits,
  createSingleWordLayoutUnits,
};
