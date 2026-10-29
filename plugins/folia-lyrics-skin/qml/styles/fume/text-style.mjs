// Derived from Folia a8da4437 (AGPL-3.0-only). See fume-reference.md.
import { getLineRenderEndTime } from '../../shared/renderHints.mjs';
import { resolveWordColor } from '../cadenza/word-coloring.mjs';
import { clamp, easeInCubic } from './math.mjs';
let lastFumePassedFadeDurationCache = null;
const resolvePassedTextStyle = (variant, textHoldStyle) =>
  textHoldStyle === 'dimmed'
    ? {
        opacity: variant === 'hero' ? 0.11 : 0.075,
        glowMultiplier: 0,
        shadowAlphaBase: 0,
        shadowAlphaTrail: 0,
      }
    : {
        opacity: variant === 'hero' ? 0.74 : 0.58,
        glowMultiplier: 1,
        shadowAlphaBase: 0.1,
        shadowAlphaTrail: 0.16,
      };
const resolvePassedDimAmount = (currentTimeValue, passedAt, fadeDuration) => {
  if (
    !Number.isFinite(currentTimeValue) ||
    !Number.isFinite(passedAt) ||
    !Number.isFinite(fadeDuration) ||
    fadeDuration <= 0
  ) {
    return 1;
  }
  const passedAge = Math.max(currentTimeValue - passedAt, 0);
  return easeInCubic(clamp(passedAge / fadeDuration, 0, 1));
};
const resolveFumePassedFadeDuration = (lines, textHoldRatio) => {
  if (textHoldRatio >= 1) {
    return Number.POSITIVE_INFINITY;
  }
  const timedLines = lines
    .map((line) => ({
      startTime: line.startTime,
      endTime: getLineRenderEndTime(line),
    }))
    .filter(
      (line) =>
        Number.isFinite(line.startTime) &&
        Number.isFinite(line.endTime) &&
        line.endTime >= line.startTime
    )
    .sort((left, right) => left.startTime - right.startTime);
  const cacheKey =
    timedLines.map((line) => `${line.startTime.toFixed(3)}:${line.endTime.toFixed(3)}`).join('|') +
    `:${textHoldRatio.toFixed(3)}`;
  if (
    (lastFumePassedFadeDurationCache == null ? void 0 : lastFumePassedFadeDurationCache.key) ===
    cacheKey
  ) {
    return lastFumePassedFadeDurationCache.duration;
  }
  if (timedLines.length <= 1) {
    const duration2 = clamp(8 * textHoldRatio, 2.4, 130);
    lastFumePassedFadeDurationCache = { key: cacheKey, duration: duration2 };
    return duration2;
  }
  const first = timedLines[0];
  const last = timedLines[timedLines.length - 1];
  const totalDuration = Math.max(last.endTime - first.startTime, 0);
  const duration = clamp(totalDuration * textHoldRatio, 2.4, 130);
  lastFumePassedFadeDurationCache = { key: cacheKey, duration };
  return duration;
};
const getActiveColor = (wordText, theme) => {
  return resolveWordColor(wordText, theme.wordColors, theme.accentColor, {
    cjkMatchMode: 'bidirectional-contains',
  });
};
export {
  getActiveColor,
  resolveFumePassedFadeDuration,
  resolvePassedDimAmount,
  resolvePassedTextStyle,
};
