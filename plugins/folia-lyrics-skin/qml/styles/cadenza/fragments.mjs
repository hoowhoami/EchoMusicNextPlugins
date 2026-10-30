// Generated from Folia a8da4437 (AGPL-3.0-only). See cadenza-reference.md.
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
import { flatMap } from './compat.mjs';
import { buildWordGraphemeTimings } from '../../shared/text/graphemeTiming.mjs';
import { resolveWordColor } from './word-coloring.mjs';
import { clamp, splitGraphemes } from './envelopes.mjs';
const getActiveColor = (wordText, theme) => {
  return resolveWordColor(wordText, theme.wordColors, theme.accentColor);
};
const buildSegmentMetas = (prepared) => {
  const segmentMetas = [];
  const graphemes = [];
  let graphemeCursor = 0;
  for (const segment of prepared.segments) {
    const segmentGraphemes = splitGraphemes(segment);
    segmentMetas.push({
      graphemeStart: graphemeCursor,
      graphemeEnd: graphemeCursor + segmentGraphemes.length,
      graphemeCount: segmentGraphemes.length,
    });
    graphemes.push(...segmentGraphemes);
    graphemeCursor += segmentGraphemes.length;
  }
  return { segmentMetas, graphemes };
};
const findWordRanges = (line, graphemes, theme) => {
  const ranges = [];
  let cursor = 0;
  for (let wordIndex = 0; wordIndex < line.words.length; wordIndex++) {
    const word = line.words[wordIndex];
    const target = splitGraphemes(word.text);
    let start = -1;
    for (let i = cursor; i <= graphemes.length - target.length; i++) {
      let isMatch = true;
      for (let j = 0; j < target.length; j++) {
        if (graphemes[i + j] !== target[j]) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) {
        start = i;
        break;
      }
    }
    if (start === -1) {
      start = clamp(cursor, 0, graphemes.length);
    }
    const end = clamp(start + target.length, start, graphemes.length);
    ranges.push({
      wordIndex,
      word,
      start,
      end,
      color: getActiveColor(word.text, theme),
      graphemeTimings: buildWordGraphemeTimings(word),
    });
    cursor = end;
  }
  return ranges;
};
const cursorToGlobalOffset = (cursor, segmentMetas) => {
  if (segmentMetas.length === 0) return 0;
  const segment = segmentMetas[cursor.segmentIndex];
  if (!segment) {
    return segmentMetas[segmentMetas.length - 1].graphemeEnd;
  }
  return clamp(
    segment.graphemeStart + cursor.graphemeIndex,
    segment.graphemeStart,
    segment.graphemeEnd
  );
};
const getPartialSegmentWidth = (prepared, segmentIndex, segmentMeta, startOffset, endOffset) => {
  var _a, _b, _c;
  const localStart = clamp(startOffset - segmentMeta.graphemeStart, 0, segmentMeta.graphemeCount);
  const localEnd = clamp(endOffset - segmentMeta.graphemeStart, 0, segmentMeta.graphemeCount);
  if (localEnd <= localStart) return 0;
  if (localStart === 0 && localEnd === segmentMeta.graphemeCount) {
    return (_a = prepared.widths[segmentIndex]) != null ? _a : 0;
  }
  const breakableFitAdvances = prepared.breakableFitAdvances[segmentIndex];
  if (breakableFitAdvances && breakableFitAdvances.length > 0) {
    let width = 0;
    for (let i = localStart; i < localEnd; i++) {
      width += (_b = breakableFitAdvances[i]) != null ? _b : 0;
    }
    return width;
  }
  const fullWidth = (_c = prepared.widths[segmentIndex]) != null ? _c : 0;
  if (segmentMeta.graphemeCount === 0) return fullWidth;
  return fullWidth * ((localEnd - localStart) / segmentMeta.graphemeCount);
};
const widthBetweenOffsets = (prepared, segmentMetas, startOffset, endOffset) => {
  if (endOffset <= startOffset) return 0;
  let width = 0;
  for (let segmentIndex = 0; segmentIndex < segmentMetas.length; segmentIndex++) {
    const meta = segmentMetas[segmentIndex];
    if (endOffset <= meta.graphemeStart) break;
    if (startOffset >= meta.graphemeEnd) continue;
    const sliceStart = Math.max(startOffset, meta.graphemeStart);
    const sliceEnd = Math.min(endOffset, meta.graphemeEnd);
    width += getPartialSegmentWidth(prepared, segmentIndex, meta, sliceStart, sliceEnd);
  }
  return width;
};
const buildLineFragments = (prepared, segmentMetas, graphemes, layout, ranges) => {
  const lineViews = layout.lines.map((line) => {
    const lineStart = cursorToGlobalOffset(line.start, segmentMetas);
    const lineEnd = cursorToGlobalOffset(line.end, segmentMetas);
    const fragments = flatMap(ranges, (range) => {
      if (range.end <= lineStart || range.start >= lineEnd) {
        return [];
      }
      const fragmentStart = Math.max(range.start, lineStart);
      const fragmentEnd = Math.min(range.end, lineEnd);
      return [
        {
          wordIndex: range.wordIndex,
          lineIndex: 0,
          word: range.word,
          text: graphemes.slice(fragmentStart, fragmentEnd).join(''),
          color: range.color,
          startX: widthBetweenOffsets(prepared, segmentMetas, lineStart, fragmentStart),
          endX: widthBetweenOffsets(prepared, segmentMetas, lineStart, fragmentEnd),
          fragmentStartInWord: fragmentStart - range.start,
          fragmentEndInWord: fragmentEnd - range.start,
          wordGraphemeCount: Math.max(range.end - range.start, 1),
          wordGraphemeTimings: range.graphemeTimings,
          fragmentIndexInWord: 0,
          fragmentCountInWord: 1,
          isPrimaryFragment: true,
          isSplitAcrossLines: false,
        },
      ];
    });
    return { line, lineStart, lineEnd, fragments };
  });
  const fragmentCountByWord = /* @__PURE__ */ new Map();
  lineViews.forEach((lineView) => {
    lineView.fragments.forEach((fragment) => {
      var _a;
      fragmentCountByWord.set(
        fragment.wordIndex,
        ((_a = fragmentCountByWord.get(fragment.wordIndex)) != null ? _a : 0) + 1
      );
    });
  });
  const seenFragmentsByWord = /* @__PURE__ */ new Map();
  return lineViews.map((lineView, lineIndex) =>
    __spreadProps(__spreadValues({}, lineView), {
      fragments: lineView.fragments.map((fragment) => {
        var _a, _b;
        const fragmentCountInWord =
          (_a = fragmentCountByWord.get(fragment.wordIndex)) != null ? _a : 1;
        const fragmentIndexInWord =
          (_b = seenFragmentsByWord.get(fragment.wordIndex)) != null ? _b : 0;
        seenFragmentsByWord.set(fragment.wordIndex, fragmentIndexInWord + 1);
        return __spreadProps(__spreadValues({}, fragment), {
          lineIndex,
          fragmentIndexInWord,
          fragmentCountInWord,
          isPrimaryFragment: fragmentIndexInWord === 0,
          isSplitAcrossLines: fragmentCountInWord > 1,
        });
      }),
    })
  );
};
export { buildLineFragments, buildSegmentMetas, findWordRanges };
