// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty,
  __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty,
  __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
      : (obj[key] = value),
  __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  },
  __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { flatMap } from './compat.mjs';
import {
  buildLineGraphemeTimeline,
  splitLyricGraphemes,
} from '../../shared/text/graphemeTiming.mjs';
import { segmentLyricWords } from '../../shared/text/wordSegmentation.mjs';
const getGraphemeRanges = (text) => {
    let cursor = 0;
    return splitLyricGraphemes(text).map((grapheme) => {
      const range = { start: cursor, end: cursor + grapheme.length };
      return ((cursor = range.end), range);
    });
  },
  timingForRange = (line, startOffset, endOffset, timeline, ranges) => {
    var _a, _b, _c, _d;
    const graphemes = flatMap(ranges, (range, index) =>
        range.end > startOffset && range.start < endOffset ? [index] : []
      )
        .map((index) => timeline[index])
        .filter(Boolean),
      wordIndices = [
        ...new Set(
          flatMap(graphemes, (item) => (typeof item.wordIndex == 'number' ? [item.wordIndex] : []))
        ),
      ];
    return {
      graphemes,
      wordIndices,
      startTime:
        (_b = (_a = graphemes[0]) == null ? void 0 : _a.startTime) != null ? _b : line.startTime,
      endTime:
        (_d = (_c = graphemes[graphemes.length - 1]) == null ? void 0 : _c.endTime) != null
          ? _d
          : line.endTime,
    };
  },
  buildSonnetSemanticSegments = (line) => {
    if (!line.fullText) return [];
    const timeline = buildLineGraphemeTimeline(line),
      ranges = getGraphemeRanges(line.fullText),
      parts = segmentLyricWords(line),
      segments = parts.map((part, index) => {
        var _a, _b;
        const startOffset = part.index,
          endOffset =
            (_b = (_a = parts[index + 1]) == null ? void 0 : _a.index) != null
              ? _b
              : line.fullText.length;
        return __spreadProps(
          __spreadValues(
            {
              text: line.fullText.slice(startOffset, endOffset),
              startOffset,
              endOffset,
            },
            timingForRange(line, startOffset, endOffset, timeline, ranges)
          ),
          {
            isWordLike: part.isWordLike,
          }
        );
      }),
      sticky = [];
    for (const segment of segments) {
      const previous = sticky[sticky.length - 1];
      previous && !segment.isWordLike && !/^\s+$/u.test(segment.text)
        ? ((previous.text += segment.text),
          (previous.endOffset = segment.endOffset),
          (previous.endTime = Math.max(previous.endTime, segment.endTime)),
          previous.graphemes.push(...segment.graphemes),
          (previous.wordIndices = [
            .../* @__PURE__ */ new Set([...previous.wordIndices, ...segment.wordIndices]),
          ]))
        : sticky.push(
            __spreadProps(__spreadValues({}, segment), {
              graphemes: [...segment.graphemes],
              wordIndices: [...segment.wordIndices],
            })
          );
    }
    return sticky;
  };
export { buildSonnetSemanticSegments };
