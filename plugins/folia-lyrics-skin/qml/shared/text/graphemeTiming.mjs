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
import { flatMap } from './compat.mjs';
import { splitLyricGraphemes } from './unicode.mjs';
const buildEvenGraphemeTimings = (text, startTime, endTime, wordIndex) => {
  const graphemes = splitLyricGraphemes(text);
  if (graphemes.length === 0) {
    return [];
  }
  const duration = Math.max(endTime - startTime, 0);
  const unitDuration = duration / graphemes.length;
  return graphemes.map((char, index) =>
    __spreadValues(
      {
        char,
        startTime: startTime + unitDuration * index,
        endTime: index === graphemes.length - 1 ? endTime : startTime + unitDuration * (index + 1),
      },
      typeof wordIndex === 'number' ? { wordIndex } : {}
    )
  );
};
const buildWordGraphemeTimings = (word, wordIndex) => {
  var _a;
  if (!((_a = word.syllables) == null ? void 0 : _a.length)) {
    return buildEvenGraphemeTimings(word.text, word.startTime, word.endTime, wordIndex);
  }
  return flatMap(word.syllables, (syllable) =>
    buildEvenGraphemeTimings(syllable.text, syllable.startTime, syllable.endTime, wordIndex)
  );
};
const findGraphemeSequence = (source, target, fromIndex) => {
  if (target.length === 0) {
    return fromIndex;
  }
  for (let index = fromIndex; index <= source.length - target.length; index += 1) {
    let matched = true;
    for (let targetIndex = 0; targetIndex < target.length; targetIndex += 1) {
      if (source[index + targetIndex] !== target[targetIndex]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return index;
    }
  }
  return -1;
};
const buildLineGraphemeTimeline = (line) => {
  const lineGraphemes = splitLyricGraphemes(line.fullText);
  if (lineGraphemes.length === 0) {
    return [];
  }
  if (line.words.length === 0) {
    return buildEvenGraphemeTimings(line.fullText, line.startTime, line.endTime);
  }
  const timeline = [];
  let cursor = 0;
  let lastResolvedTime = line.startTime;
  line.words.forEach((word, wordIndex) => {
    var _a, _b;
    const wordGraphemes = splitLyricGraphemes(word.text);
    if (wordGraphemes.length === 0) {
      return;
    }
    const matchedStart = findGraphemeSequence(lineGraphemes, wordGraphemes, cursor);
    const start = matchedStart >= 0 ? matchedStart : cursor;
    const end = Math.min(start + wordGraphemes.length, lineGraphemes.length);
    for (let gapIndex = cursor; gapIndex < start; gapIndex += 1) {
      timeline[gapIndex] = {
        char: lineGraphemes[gapIndex],
        startTime: word.startTime,
        endTime: word.startTime,
      };
    }
    const wordTimings = buildWordGraphemeTimings(word, wordIndex);
    for (let localIndex = 0; localIndex < end - start; localIndex += 1) {
      const timing =
        (_b = wordTimings[localIndex]) != null
          ? _b
          : buildEvenGraphemeTimings(
              (_a = wordGraphemes[localIndex]) != null ? _a : '',
              word.startTime,
              word.endTime,
              wordIndex
            )[0];
      if (!timing) {
        continue;
      }
      timeline[start + localIndex] = __spreadProps(__spreadValues({}, timing), {
        char: lineGraphemes[start + localIndex],
      });
      lastResolvedTime = Math.max(lastResolvedTime, timing.endTime);
    }
    cursor = Math.max(cursor, end);
  });
  for (let index = 0; index < lineGraphemes.length; index += 1) {
    if (timeline[index]) {
      continue;
    }
    timeline[index] = {
      char: lineGraphemes[index],
      startTime: lastResolvedTime,
      endTime: lastResolvedTime,
    };
  }
  return timeline;
};
export { buildLineGraphemeTimeline, buildWordGraphemeTimings, splitLyricGraphemes };
