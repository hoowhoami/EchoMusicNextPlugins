// Derived from Folia a8da4437 src/utils/lyrics/renderHints.ts (AGPL-3.0-only).
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
const MICRO_LINE_DURATION_THRESHOLD = 0.1;
const SHORT_LINE_DURATION_THRESHOLD = 0.18;
const MICRO_LINE_RENDER_FLOOR = 0.067;
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const getLastWordEndTime = (line) => {
  var _a, _b;
  const lastWord = (_a = line.words) == null ? void 0 : _a[line.words.length - 1];
  return (_b = lastWord == null ? void 0 : lastWord.endTime) != null ? _b : line.endTime;
};
const getLineTransitionTiming = (rawDuration, lineTransitionMode, wordRevealMode) => {
  if (lineTransitionMode === 'none') {
    return {
      enterDuration: 0,
      exitDuration: 0,
      linePassHold: 0,
    };
  }
  if (lineTransitionMode === 'fast') {
    return {
      enterDuration: clamp(rawDuration * 0.45, 0.045, 0.06),
      exitDuration: clamp(rawDuration * 0.22, 0.03, 0.04),
      linePassHold: wordRevealMode === 'instant' ? 0 : 0.03,
    };
  }
  return {
    enterDuration: Math.min(0.42, Math.max(0.22, Math.max(rawDuration, 0.12) * 0.34)),
    exitDuration: Math.min(0.32, Math.max(0.18, Math.max(rawDuration, 0.12) * 0.18)),
    linePassHold: wordRevealMode === 'instant' ? 0 : 0.06,
  };
};
const getTimingClass = (rawDuration) => {
  if (rawDuration < MICRO_LINE_DURATION_THRESHOLD) {
    return 'micro';
  }
  if (rawDuration < SHORT_LINE_DURATION_THRESHOLD) {
    return 'short';
  }
  return 'normal';
};
const getLineTransitionMode = (timingClass) => {
  if (timingClass === 'micro') {
    return 'none';
  }
  if (timingClass === 'short') {
    return 'fast';
  }
  return 'normal';
};
const getWordRevealMode = (timingClass) => {
  if (timingClass === 'micro') {
    return 'instant';
  }
  if (timingClass === 'short') {
    return 'fast';
  }
  return 'normal';
};
const buildLineRenderEndTime = (line, rawDuration, lineTransitionMode, wordRevealMode) => {
  if (lineTransitionMode === 'none') {
    return Math.max(line.endTime, line.startTime + MICRO_LINE_RENDER_FLOOR);
  }
  const transitionTiming = getLineTransitionTiming(rawDuration, lineTransitionMode, wordRevealMode);
  const linePassStart =
    Math.max(getLastWordEndTime(line), line.startTime) + transitionTiming.linePassHold;
  const exitStart =
    lineTransitionMode === 'fast'
      ? Math.max(
          line.startTime + transitionTiming.enterDuration + 0.01,
          linePassStart,
          line.endTime - transitionTiming.exitDuration
        )
      : Math.max(linePassStart, line.endTime - transitionTiming.exitDuration);
  return Math.max(line.endTime, exitStart + transitionTiming.exitDuration);
};
function buildLineRenderHints(lineOrStart, endTime) {
  const line =
    typeof lineOrStart === 'number'
      ? { startTime: lineOrStart, endTime: endTime != null ? endTime : lineOrStart }
      : lineOrStart;
  const rawDuration = Math.max(line.endTime - line.startTime, 0);
  const timingClass = getTimingClass(rawDuration);
  const lineTransitionMode = getLineTransitionMode(timingClass);
  const wordRevealMode = getWordRevealMode(timingClass);
  return {
    rawDuration,
    timingClass,
    renderEndTime: buildLineRenderEndTime(line, rawDuration, lineTransitionMode, wordRevealMode),
    lineTransitionMode,
    wordRevealMode,
  };
}
const getLineRenderHints = (line) => {
  var _a;
  if (!line) {
    return null;
  }
  return (_a = line.renderHints) != null ? _a : buildLineRenderHints(line);
};
const getLineRenderEndTime = (line) => {
  var _a, _b;
  if (!line) {
    return Number.NEGATIVE_INFINITY;
  }
  return (_b = (_a = getLineRenderHints(line)) == null ? void 0 : _a.renderEndTime) != null
    ? _b
    : line.endTime;
};
const hasExpectedRenderHints = (line, expected) => {
  const current = line.renderHints;
  return Boolean(
    current &&
    current.rawDuration === expected.rawDuration &&
    current.timingClass === expected.timingClass &&
    current.renderEndTime === expected.renderEndTime &&
    current.lineTransitionMode === expected.lineTransitionMode &&
    current.wordRevealMode === expected.wordRevealMode
  );
};
const migrateLyricLinesRenderHints = (lines) => {
  let changed = false;
  const nextLines = lines.map((line) => {
    const renderHints = buildLineRenderHints(line);
    if (hasExpectedRenderHints(line, renderHints)) {
      return line;
    }
    changed = true;
    return __spreadProps(__spreadValues({}, line), {
      renderHints,
    });
  });
  return {
    value: changed ? nextLines : lines,
    changed,
  };
};
const annotateLyricLines = (lines) => {
  return migrateLyricLinesRenderHints(lines).value;
};
const ensureLyricLinesRenderHints = (lines) => {
  return migrateLyricLinesRenderHints(lines).value;
};
function migrateLyricDataRenderHints(lyrics) {
  if (!lyrics) {
    return { value: null, changed: false };
  }
  const migration = migrateLyricLinesRenderHints(lyrics.lines);
  if (!migration.changed) {
    return { value: lyrics, changed: false };
  }
  return {
    value: __spreadProps(__spreadValues({}, lyrics), {
      lines: migration.value,
    }),
    changed: true,
  };
}
const ensureLyricDataRenderHints = (lyrics) => {
  return migrateLyricDataRenderHints(lyrics).value;
};
export {
  MICRO_LINE_DURATION_THRESHOLD,
  MICRO_LINE_RENDER_FLOOR,
  SHORT_LINE_DURATION_THRESHOLD,
  annotateLyricLines,
  buildLineRenderHints,
  ensureLyricDataRenderHints,
  ensureLyricLinesRenderHints,
  getLineRenderEndTime,
  getLineRenderHints,
  getLineTransitionTiming,
  migrateLyricDataRenderHints,
  migrateLyricLinesRenderHints,
};
