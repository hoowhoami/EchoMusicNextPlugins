// Generated from Folia a8da4437 (AGPL-3.0-only). See cadenza-reference.md.
import { getLineTransitionTiming } from '../../shared/renderHints.mjs';
import { colorWithAlpha } from './color.mjs';
import { splitLyricGraphemes as splitGraphemes } from '../../shared/text/unicode.mjs';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (from, to, amount) => from + (to - from) * amount;
const easeOutCubic = (value) => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
const easeInOutQuad = (value) => {
  const normalized = clamp(value, 0, 1);
  return normalized < 0.5 ? 2 * normalized * normalized : 1 - Math.pow(-2 * normalized + 2, 2) / 2;
};
const ACTIVE_PULSE_FREQUENCY = 10;
const isCJK = (text) => /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af]/.test(text);
const getWordStatus = (time, lineTiming, word) => {
  const lookahead =
    lineTiming.wordRevealMode === 'fast'
      ? 0.045
      : lineTiming.wordRevealMode === 'instant'
        ? 0
        : 0.18;
  const activeEndTime =
    lineTiming.wordRevealMode === 'instant' ? lineTiming.lineRenderEndTime : word.endTime;
  if (time >= word.startTime - lookahead && time <= activeEndTime) {
    return 'active';
  }
  if (time > activeEndTime) {
    return 'passed';
  }
  return 'waiting';
};
const getWordProgress = (time, wordRevealMode, word) => {
  if (wordRevealMode === 'instant') {
    return time < word.startTime ? 0 : 1;
  }
  const minDuration = wordRevealMode === 'fast' ? 0.045 : 0.01;
  const duration = Math.max(word.endTime - word.startTime, minDuration);
  return clamp((time - word.startTime) / duration, 0, 1);
};
const getClassicKeyframedGlow = (progress) => {
  if (progress <= 0 || progress >= 1) {
    return 0;
  }
  if (progress < 0.3) {
    return easeOutCubic(progress / 0.3);
  }
  return 1 - clamp((progress - 0.3) / 0.7, 0, 1);
};
const getClassicGlowEnvelope = (time, lineTiming, word) => {
  if (lineTiming.wordRevealMode === 'instant') {
    const activeEndTime = lineTiming.lineRenderEndTime;
    if (time < word.startTime || time > activeEndTime) {
      return 0;
    }
    const pulseProgress = clamp((time - word.startTime) / 0.067, 0, 1);
    return getClassicKeyframedGlow(pulseProgress);
  }
  if (lineTiming.wordRevealMode === 'fast') {
    const duration2 = Math.max(word.endTime - word.startTime, 0.045);
    if (time < word.startTime) {
      return 0;
    }
    if (time <= word.endTime) {
      const progress = clamp((time - word.startTime) / duration2, 0, 1);
      if (progress < 0.14) {
        return easeOutCubic(progress / 0.14);
      }
      if (progress < 0.82) {
        return 1;
      }
      return mix(1, 0.92, (progress - 0.82) / 0.18);
    }
    const fadeOut2 = clamp((time - word.endTime) / 0.14, 0, 1);
    return Math.pow(1 - fadeOut2, 2);
  }
  const duration = Math.max(word.endTime - word.startTime, 0.1);
  if (time < word.startTime) {
    return 0;
  }
  if (time <= word.endTime) {
    const progress = clamp((time - word.startTime) / duration, 0, 1);
    if (progress < 0.18) {
      return easeOutCubic(progress / 0.18);
    }
    if (progress < 0.9) {
      return 1;
    }
    return mix(1, 0.9, (progress - 0.9) / 0.1);
  }
  const fadeOut = clamp((time - word.endTime) / 0.9, 0, 1);
  return 0.9 * Math.pow(1 - fadeOut, 2);
};
const getClassicCharGlow = (time, word, glyphIndex, glyphCount, wordGraphemeTimings = []) => {
  var _a;
  const duration = Math.max(word.endTime - word.startTime, 0.1);
  const singleDuration = duration / Math.max(glyphCount, 1);
  const timing = wordGraphemeTimings[glyphIndex];
  const charDuration = timing ? Math.max(timing.endTime - timing.startTime, 1e-3) : singleDuration;
  const charStartTime =
    (_a = timing == null ? void 0 : timing.startTime) != null
      ? _a
      : word.startTime + singleDuration * glyphIndex;
  const animationDuration = charDuration * 6;
  const elapsed = time - charStartTime;
  const activeGlow = elapsed <= 0 ? 0 : getClassicKeyframedGlow(elapsed / animationDuration);
  if (time <= word.endTime) {
    return activeGlow;
  }
  const fadeOut = Math.pow(1 - clamp((time - word.endTime) / 0.9, 0, 1), 2);
  return activeGlow * fadeOut;
};
const getClassicBodyMix = (time, lineTiming, word) => {
  if (lineTiming.wordRevealMode === 'instant') {
    if (time < word.startTime) {
      return 0;
    }
    return time <= lineTiming.lineRenderEndTime ? 1 : 0;
  }
  if (time < word.startTime) {
    return 0;
  }
  if (time <= word.endTime) {
    return getWordProgress(time, lineTiming.wordRevealMode, word);
  }
  const fadeOut = clamp(
    (time - word.endTime) / (lineTiming.wordRevealMode === 'fast' ? 0.12 : 0.8),
    0,
    1
  );
  return 1 - fadeOut;
};
const getClassicLineEnvelope = (time, line, lineTiming) => {
  if (!line) {
    return {
      opacity: 1,
      scale: 1,
      blur: 0,
    };
  }
  const renderHints = lineTiming.renderHints;
  const lineEndTime = lineTiming.lineRenderEndTime;
  const linePassStart =
    Math.max(lineTiming.lastWordEndTime, line.startTime) + lineTiming.linePassHold;
  if ((renderHints == null ? void 0 : renderHints.lineTransitionMode) === 'none') {
    return {
      opacity: 1,
      scale: 1,
      blur: 0,
    };
  }
  if ((renderHints == null ? void 0 : renderHints.lineTransitionMode) === 'fast') {
    const enterDuration2 = lineTiming.transitionTiming.enterDuration;
    const exitDuration2 = lineTiming.transitionTiming.exitDuration;
    const exitStart2 = Math.max(
      line.startTime + enterDuration2 + 0.01,
      linePassStart,
      lineEndTime - exitDuration2
    );
    const enterProgress2 = easeOutCubic(clamp((time - line.startTime) / enterDuration2, 0, 1));
    let opacity2 = mix(0.65, 1, enterProgress2);
    let scale2 = mix(0.97, 1, enterProgress2);
    let blur2 = mix(4, 0, enterProgress2);
    const exitProgress2 = easeOutCubic(clamp((time - exitStart2) / exitDuration2, 0, 1));
    if (exitProgress2 > 0) {
      opacity2 = mix(opacity2, 0, exitProgress2);
      scale2 = mix(scale2, 1.03, exitProgress2);
      blur2 = Math.max(blur2, mix(0, 6, exitProgress2));
    }
    return {
      opacity: clamp(opacity2, 0, 1),
      scale: scale2,
      blur: blur2,
    };
  }
  const enterDuration = lineTiming.transitionTiming.enterDuration;
  const exitDuration = lineTiming.transitionTiming.exitDuration;
  const preEnter = Math.min(0.1, enterDuration * 0.35);
  const enterProgress = easeOutCubic(
    clamp((time - (line.startTime - preEnter)) / (enterDuration + preEnter), 0, 1)
  );
  let opacity = mix(0, 1, enterProgress);
  let scale = mix(0.9, 1, enterProgress);
  let blur = mix(10, 0, enterProgress);
  const exitStart = Math.max(linePassStart, lineEndTime - exitDuration);
  const exitProgress = easeOutCubic(clamp((time - exitStart) / exitDuration, 0, 1));
  if (exitProgress > 0) {
    opacity *= 1 - exitProgress;
    scale = mix(scale, 1.1, exitProgress);
    blur = Math.max(blur, mix(0, 20, exitProgress));
  }
  return {
    opacity: clamp(opacity, 0, 1),
    scale,
    blur,
  };
};
const getClassicPassedDrift = (time, word) => {
  if (time <= word.endTime) {
    return 0;
  }
  return easeInOutQuad(clamp((time - word.endTime) / 5, 0, 1));
};
const resolveLineRenderTiming = (line) => {
  var _a, _b, _c, _d, _e, _f;
  const renderHints = (_a = line.renderHints) != null ? _a : null;
  const wordRevealMode =
    (_b = renderHints == null ? void 0 : renderHints.wordRevealMode) != null ? _b : 'normal';
  const lastWord = line.words[line.words.length - 1];
  const rawDuration =
    (_c = renderHints == null ? void 0 : renderHints.rawDuration) != null
      ? _c
      : Math.max(line.endTime - line.startTime, 0);
  const transitionTiming = getLineTransitionTiming(
    rawDuration,
    (_d = renderHints == null ? void 0 : renderHints.lineTransitionMode) != null ? _d : 'normal',
    wordRevealMode
  );
  return {
    renderHints,
    lineRenderEndTime:
      (_e = renderHints == null ? void 0 : renderHints.renderEndTime) != null ? _e : line.endTime,
    wordRevealMode,
    lastWordEndTime:
      (_f = lastWord == null ? void 0 : lastWord.endTime) != null ? _f : line.endTime,
    linePassHold: transitionTiming.linePassHold,
    transitionTiming,
  };
};
const buildDomTextShadow = (color, intensity, blurScale = 1) => {
  const glow = clamp(intensity, 0, 1.6);
  if (glow <= 0.01) {
    return 'none';
  }
  return [
    `0 0 40px ${colorWithAlpha(color, Math.min(0.98, glow))}`,
    `0 0 40px ${colorWithAlpha(color, Math.min(0.92, glow * 0.92))}`,
    `0 0 40px ${colorWithAlpha(color, Math.min(0.35, glow * 0.26))}`,
  ].join(', ');
};
export {
  ACTIVE_PULSE_FREQUENCY,
  buildDomTextShadow,
  clamp,
  getClassicBodyMix,
  getClassicCharGlow,
  getClassicGlowEnvelope,
  getClassicLineEnvelope,
  getClassicPassedDrift,
  getWordProgress,
  getWordStatus,
  isCJK,
  mix,
  resolveLineRenderTiming,
  splitGraphemes,
};
