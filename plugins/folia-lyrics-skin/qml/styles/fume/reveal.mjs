// Derived from Folia a8da4437 (AGPL-3.0-only). See fume-reference.md.
import { buildWordGraphemeTimings } from '../../shared/text/graphemeTiming.mjs';
import { getLineRenderEndTime } from '../../shared/renderHints.mjs';
import { clamp, splitGraphemes } from './math.mjs';
const buildWordRangesFromWords = (line, graphemes) => {
  var _a;
  if (line.words.length === 0 || graphemes.length === 0) {
    return [];
  }
  const rangedWords = line.words.filter((word) => splitGraphemes(word.text).length > 0);
  if (rangedWords.length === 0) {
    return [];
  }
  const ranges = [];
  let cursor = 0;
  for (let wordIndex = 0; wordIndex < rangedWords.length; wordIndex += 1) {
    const word = rangedWords[wordIndex];
    const wordGraphemes = splitGraphemes(word.text);
    const start = clamp(cursor, 0, graphemes.length);
    let end = clamp(start + wordGraphemes.length, start, graphemes.length);
    while (end < graphemes.length && /\s/.test((_a = graphemes[end]) != null ? _a : '')) {
      end += 1;
    }
    ranges.push({
      wordIndex,
      word,
      start,
      end,
      colorStart: start,
      colorEnd: end,
      graphemeTimings: buildWordGraphemeTimings(word),
    });
    cursor = end;
  }
  return ranges;
};
const resolveWordRevealProgress = (range, currentTimeValue) => {
  if (range.word.endTime <= range.word.startTime) {
    return currentTimeValue >= range.word.endTime ? 1 : 0;
  }
  const duration = Math.max(range.word.endTime - range.word.startTime, 0.08);
  return clamp((currentTimeValue - range.word.startTime) / duration, 0, 1);
};
const resolvePrintedGlyphsInRange = (range, currentTimeValue) => {
  var _a;
  const length = Math.max(range.end - range.start, 0);
  if (length === 0) {
    return 0;
  }
  if (currentTimeValue < range.word.startTime) {
    return 0;
  }
  const timedGlyphCount = ((_a = range.word.syllables) == null ? void 0 : _a.length)
    ? Math.min(range.graphemeTimings.length, length)
    : 0;
  if (timedGlyphCount > 0) {
    if (currentTimeValue >= range.word.endTime) {
      return length;
    }
    let printed = 0;
    for (let index = 0; index < timedGlyphCount; index += 1) {
      if (currentTimeValue >= range.graphemeTimings[index].startTime) {
        printed = index + 1;
      }
    }
    return clamp(printed, 0, length);
  }
  const progress = resolveWordRevealProgress(range, currentTimeValue);
  if (progress >= 1) {
    return length;
  }
  return clamp(Math.floor(progress * length + 0.2), progress > 0 ? 1 : 0, length);
};
const hasRevealCompletedByLineEnd = (line, currentTimeValue) => currentTimeValue >= line.endTime;
const resolveLinePassCutoffTime = (line, nextLineStartTime) => {
  const renderEndTime = getLineRenderEndTime(line);
  if (typeof nextLineStartTime !== 'number' || !Number.isFinite(nextLineStartTime)) {
    return renderEndTime;
  }
  return Math.min(renderEndTime, nextLineStartTime);
};
const resolveVisualProgressWithCutoff = (startedAt, duration, currentTimeValue, cutoffTime) => {
  const nominalEndTime = startedAt + Math.max(duration, 1e-3);
  const effectiveEndTime = Math.max(startedAt + 1e-3, Math.min(nominalEndTime, cutoffTime));
  return clamp((currentTimeValue - startedAt) / Math.max(effectiveEndTime - startedAt, 1e-3), 0, 1);
};
const resolvePrintedGraphemeCount = (line, wordRanges, graphemeCount, currentTimeValue) => {
  if (graphemeCount === 0) {
    return 0;
  }
  if (currentTimeValue < line.startTime) {
    return 0;
  }
  if (hasRevealCompletedByLineEnd(line, currentTimeValue)) {
    return graphemeCount;
  }
  if (wordRanges.length === 0) {
    const duration = Math.max(line.endTime - line.startTime, 0.12);
    const progress = clamp((currentTimeValue - line.startTime) / duration, 0, 1);
    return clamp(Math.floor(progress * graphemeCount + (progress > 0 ? 1 : 0)), 0, graphemeCount);
  }
  let printed = 0;
  for (let index = 0; index < wordRanges.length; index += 1) {
    const range = wordRanges[index];
    const partial = resolvePrintedGlyphsInRange(range, currentTimeValue);
    printed = range.start + partial;
    if (partial < range.end - range.start) {
      return clamp(printed, 0, graphemeCount);
    }
  }
  return clamp(printed, 0, graphemeCount);
};
const resolvePrintedGraphemeProgress = (line, wordRanges, graphemeCount, currentTimeValue) => {
  if (graphemeCount === 0) {
    return 0;
  }
  if (currentTimeValue < line.startTime) {
    return 0;
  }
  if (hasRevealCompletedByLineEnd(line, currentTimeValue)) {
    return graphemeCount;
  }
  if (wordRanges.length === 0) {
    const duration = Math.max(line.endTime - line.startTime, 0.12);
    const progress = clamp((currentTimeValue - line.startTime) / duration, 0, 1);
    return clamp(progress * graphemeCount, 0, graphemeCount);
  }
  let printed = 0;
  for (let index = 0; index < wordRanges.length; index += 1) {
    const range = wordRanges[index];
    if (currentTimeValue < range.word.startTime) {
      return clamp(printed, 0, graphemeCount);
    }
    const progress = resolveWordRevealProgress(range, currentTimeValue);
    const length = Math.max(range.end - range.start, 0);
    printed = range.start + progress * length;
    if (progress < 1) {
      return clamp(printed, 0, graphemeCount);
    }
  }
  return clamp(printed, 0, graphemeCount);
};
export {
  buildWordRangesFromWords,
  resolveLinePassCutoffTime,
  resolvePrintedGraphemeCount,
  resolvePrintedGraphemeProgress,
  resolveVisualProgressWithCutoff,
};
