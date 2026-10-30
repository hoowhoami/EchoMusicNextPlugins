// Folia a8da4437 VisualizerTilt.tsx (AGPL-3.0-only). Measured widths are supplied by native GlyphRun.
import { SentenceLayout } from './sentenceLayout.mjs';
import {
  splitLyricGraphemes,
  buildWordGraphemeTimings,
} from '../../shared/text/graphemeTiming.mjs';
import { getLineRenderEndTime } from '../../shared/renderHints.mjs';
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
const CHAR_REF_LENGTH = 20;
const LOG_OFFSET = 4;
const LINE_THRESHOLDS = [0.45, 1.05, 1.7];
const determineLineCount = (charCount, seed, splitProbability) => {
  const normalized = Math.log(charCount + LOG_OFFSET) / Math.log(CHAR_REF_LENGTH + LOG_OFFSET);
  const jitter = seededRandom(seed, 1) * 0.6 + 0.7;
  const score = normalized * jitter * splitProbability;
  if (score < LINE_THRESHOLDS[0]) return 1;
  if (score < LINE_THRESHOLDS[1]) return 2;
  if (score < LINE_THRESHOLDS[2]) return 3;
  return 4;
};
const REM_PX = 16;
const RESPLIT_THRESHOLD = 1.6;
const SCALE_FLOOR_NORMAL = 0.55;
const SCALE_FLOOR_TILT = 0.5;
const getAvailableWidth = (viewportWidth) => {
  return Math.max(320, viewportWidth) * 0.85;
};
const GRAPHEME_SEGMENTER = {
  segment: (text) => splitLyricGraphemes(text).map((segment) => ({ segment })),
};
const findSegmentWordRange = (charOffset, segmentText, fullText, words) => {
  const segmentStart = charOffset;
  if (segmentStart < 0 || segmentStart >= fullText.length)
    return { startWordIndex: 0, endWordIndex: words.length };
  const segmentEnd = segmentStart + segmentText.length;
  let fullTextPos = 0;
  let startWordIndex = 0;
  let endWordIndex = words.length;
  for (let wi = 0; wi < words.length; wi++) {
    const wordText = words[wi].text;
    const wordFullStart = fullText.indexOf(wordText, fullTextPos);
    if (wordFullStart === -1) {
      fullTextPos += wordText.length;
      continue;
    }
    const wordFullEnd = wordFullStart + wordText.length;
    if (wordFullStart <= segmentStart && wordFullEnd > segmentStart) {
      startWordIndex = wi;
    }
    if (wordFullStart < segmentEnd && wordFullEnd >= segmentEnd) {
      endWordIndex = wi + 1;
      break;
    }
    fullTextPos = wordFullEnd;
  }
  return { startWordIndex, endWordIndex };
};
const buildCharTimings = (
  charOffset,
  segmentText,
  segmentStartTime,
  segmentEndTime,
  activeLine
) => {
  var _a;
  const graphemes = [...GRAPHEME_SEGMENTER.segment(segmentText)];
  if (!activeLine || graphemes.length === 0) return [];
  const nonSpaceGraphemes = graphemes.filter((g) => !/^\s+$/.test(g.segment));
  if (nonSpaceGraphemes.length === 0) return [];
  const totalDuration = Math.max(segmentEndTime - segmentStartTime, 0.3);
  const { startWordIndex, endWordIndex } = findSegmentWordRange(
    charOffset,
    segmentText,
    activeLine.fullText,
    activeLine.words
  );
  const segmentWords = activeLine.words.slice(startWordIndex, endWordIndex);
  let currentCharIndex = 0;
  const timings = [];
  if (segmentWords.length > 0) {
    for (const word of segmentWords) {
      if ((_a = word.syllables) == null ? void 0 : _a.length) {
        const wordTimings = buildWordGraphemeTimings(word).filter(
          (timing) => !/^\s+$/.test(timing.char)
        );
        for (const timing of wordTimings) {
          if (currentCharIndex >= nonSpaceGraphemes.length) break;
          timings.push({
            charIndex: currentCharIndex,
            startTime: timing.startTime,
            endTime: timing.endTime,
          });
          currentCharIndex++;
        }
        continue;
      }
      const wordGraphemes = [...GRAPHEME_SEGMENTER.segment(word.text)];
      const wordNonSpaceCount = wordGraphemes.filter((g) => !/^\s+$/.test(g.segment)).length;
      if (wordNonSpaceCount === 0) continue;
      const wordDuration = Math.max(word.endTime - word.startTime, 0.05);
      const charDuration = wordDuration / wordNonSpaceCount;
      let nonSpaceCi = 0;
      for (const grapheme of wordGraphemes) {
        if (currentCharIndex >= nonSpaceGraphemes.length) break;
        if (/^\s+$/.test(grapheme.segment)) continue;
        timings.push({
          charIndex: currentCharIndex,
          startTime: word.startTime + nonSpaceCi * charDuration,
          endTime: word.startTime + (nonSpaceCi + 1) * charDuration,
        });
        currentCharIndex++;
        nonSpaceCi++;
      }
    }
  }
  if (timings.length === 0 || timings.length !== nonSpaceGraphemes.length) {
    const avgCharDuration = totalDuration / nonSpaceGraphemes.length;
    timings.length = 0;
    currentCharIndex = 0;
    for (let i = 0; i < graphemes.length; i++) {
      const isSpace = /^\s+$/.test(graphemes[i].segment);
      if (isSpace) continue;
      timings.push({
        charIndex: currentCharIndex,
        startTime: segmentStartTime + currentCharIndex * avgCharDuration,
        endTime: segmentStartTime + (currentCharIndex + 1) * avgCharDuration,
      });
      currentCharIndex++;
    }
  }
  return timings;
};
const getCharPulseIntensity = (currentTime, charTiming) => {
  const { startTime, endTime } = charTiming;
  const rawDuration = Math.max(endTime - startTime, 0.05);
  const duration = Math.min(Math.max(rawDuration, 0.2), 0.9);
  const elapsed = currentTime - startTime;
  if (elapsed < 0) return 0;
  if (elapsed <= duration) {
    const progress = elapsed / duration;
    return Math.sin(progress * Math.PI);
  }
  const afterElapsed = elapsed - duration;
  const afterglowRamp = duration * 1.2;
  if (afterElapsed >= afterglowRamp) return 0.25;
  return 0.25 * (afterElapsed / afterglowRamp);
};
function seededRandom(seed, offset) {
  const x = Math.sin(seed * 1e3 + offset) * 1e4;
  return x - Math.floor(x);
}
const buildTiltLayout = (fullText, lineSeed, tuning, viewportWidth, measure, fragmentSegmenter) => {
  var _a, _b;
  const fontScale = tuning.lyricsFontScale;
  const fontStack = '';
  const measureAtSize = (text, px, spec) => measure(text, spec.indexOf('italic') >= 0, px);
  const measureMaxPx = Math.max(viewportWidth * 0.06875, 5.625 * REM_PX * fontScale);
  const normalBasePx = measureMaxPx;
  const tiltBasePx = measureMaxPx;
  const normalFontSpec = `${400} ${normalBasePx}px ${fontStack}`;
  const tiltFontSpec = `${300} ${tiltBasePx}px ${fontStack} italic`;
  const availableWidth = getAvailableWidth(viewportWidth);
  const charCount = fullText.trim().length;
  const isEllipsisOnly = /^[\s.…·。]+$/.test(fullText.trim());
  let mergedSegments;
  if (isEllipsisOnly) {
    mergedSegments = [fullText];
  } else {
    const numLines = determineLineCount(charCount, lineSeed, tuning.splitProbability);
    const layoutUnits = SentenceLayout.splitIntoSentences(
      fullText,
      numLines,
      lineSeed,
      fragmentSegmenter
    );
    mergedSegments = layoutUnits.map((u) => u.text);
  }
  const candidates = [];
  mergedSegments.forEach((_, i) => {
    const lineRoll = seededRandom(lineSeed, 100 + i);
    if (lineRoll < tuning.tiltStyleProbability) candidates.push(i);
  });
  let finalTiltIndex = -1;
  if (candidates.length > 0) {
    finalTiltIndex = candidates[Math.floor(seededRandom(lineSeed, 200) * candidates.length)];
  }
  let offsetAccum = 0;
  const segments = mergedSegments.map((text, i) => {
    const trimmed = text.replace(/^\s+/, '').replace(/\s+$/, '');
    const leadingSpaces = text.length - text.replace(/^\s+/, '').length;
    const seg = {
      text: trimmed,
      isTilt: i === finalTiltIndex,
      isShortLastLine: false,
      charOffset: offsetAccum + leadingSpaces,
    };
    offsetAccum += text.length;
    return seg;
  });
  let scaleMultiplier = 1;
  const tiltWithWidth = segments
    .filter((s) => s.isTilt)
    .map((s) => ({ text: s.text, width: measureAtSize(s.text, tiltBasePx, tiltFontSpec) }));
  const normalWithWidth = segments
    .filter((s) => !s.isTilt)
    .map((s) => ({ text: s.text, width: measureAtSize(s.text, normalBasePx, normalFontSpec) }));
  const widestTiltEntry = tiltWithWidth.sort((a, b) => b.width - a.width)[0];
  const widestNormalEntry = normalWithWidth.sort((a, b) => b.width - a.width)[0];
  const tiltWidth =
    (_a = widestTiltEntry == null ? void 0 : widestTiltEntry.width) != null ? _a : 0;
  const normalWidth =
    (_b = widestNormalEntry == null ? void 0 : widestNormalEntry.width) != null ? _b : 0;
  const tiltOverflow = tiltWidth > 0 ? tiltWidth / availableWidth : 0;
  const normalOverflow = normalWidth > 0 ? normalWidth / availableWidth : 0;
  const maxOverflow = Math.max(tiltOverflow, normalOverflow);
  const markShortLastLine = (segs) => {
    if (segs.length < 2) return segs;
    const last = segs[segs.length - 1];
    if (last.isTilt || last.text.trim().length > 2) return segs;
    const prev = segs[segs.length - 2];
    if (last.text.trim().length * 2 <= prev.text.length) {
      segs[segs.length - 1] = __spreadProps(__spreadValues({}, last), { isShortLastLine: true });
    }
    return segs;
  };
  if (maxOverflow > 1) {
    if (maxOverflow >= RESPLIT_THRESHOLD) {
      const targetWidth = availableWidth * (RESPLIT_THRESHOLD - 0.15);
      const totalEstWidth = measureAtSize(fullText, normalBasePx, normalFontSpec);
      const extraSplitsNeeded = Math.min(
        4,
        Math.max(segments.length + 1, Math.ceil(totalEstWidth / targetWidth))
      );
      if (extraSplitsNeeded > segments.length) {
        const reSplitUnits = SentenceLayout.splitIntoSentences(
          fullText,
          extraSplitsNeeded,
          lineSeed,
          fragmentSegmenter
        );
        let reSplitOffset = 0;
        const newSegments = reSplitUnits.map((u) => {
          const trimmed = u.text.replace(/^\s+/, '').replace(/\s+$/, '');
          const leadingSpaces = u.text.length - u.text.replace(/^\s+/, '').length;
          const seg = {
            text: trimmed,
            isTilt: false,
            isShortLastLine: false,
            charOffset: reSplitOffset + leadingSpaces,
          };
          reSplitOffset += u.text.length;
          return seg;
        });
        if (newSegments.length > 0) {
          const resplitTiltRoll = seededRandom(lineSeed, 300);
          if (resplitTiltRoll < tuning.tiltStyleProbability) {
            const picked = Math.floor(seededRandom(lineSeed, 301) * newSegments.length);
            newSegments[picked].isTilt = true;
          }
        }
        const postWidestTilt = newSegments.filter((s) => s.isTilt)[0];
        const postNormalWithWidth = newSegments
          .filter((s) => !s.isTilt)
          .map((s) => ({
            text: s.text,
            width: measureAtSize(s.text, normalBasePx, normalFontSpec),
          }));
        const postWidestNormal = postNormalWithWidth.sort((a, b) => b.width - a.width)[0];
        let postScale = 1;
        if (postWidestTilt) {
          const w = measureAtSize(postWidestTilt.text, tiltBasePx, tiltFontSpec);
          if (w > availableWidth) postScale = Math.max(SCALE_FLOOR_TILT, availableWidth / w);
        } else if (postWidestNormal) {
          const w = measureAtSize(postWidestNormal.text, normalBasePx, normalFontSpec);
          if (w > availableWidth) postScale = Math.max(SCALE_FLOOR_NORMAL, availableWidth / w);
        }
        return { segments: markShortLastLine(newSegments), scaleMultiplier: postScale };
      }
    }
    if (tiltOverflow >= normalOverflow && widestTiltEntry) {
      scaleMultiplier = Math.max(SCALE_FLOOR_TILT, availableWidth / tiltWidth);
    } else if (widestNormalEntry) {
      scaleMultiplier = Math.max(SCALE_FLOOR_NORMAL, availableWidth / normalWidth);
    }
  }
  return { segments: markShortLastLine(segments), scaleMultiplier };
};
export {
  buildCharTimings,
  buildTiltLayout,
  determineLineCount,
  findSegmentWordRange,
  getCharPulseIntensity,
  seededRandom,
};

export function resolveSettings(settings) {
  const finite = (value, fallback) => (Number.isFinite(value) ? value : fallback);
  return {
    splitProbability: Math.min(1, Math.max(0, finite(settings.tiltSplitProbability, 0.75))),
    tiltStyleProbability: Math.min(1, Math.max(0, finite(settings.tiltStyleProbability, 0.35))),
    colorScheme:
      ['default', 'swap', 'accentAll', 'primaryAll'].indexOf(settings.tiltColorScheme) >= 0
        ? settings.tiltColorScheme
        : 'default',
    lyricsFontScale: Math.min(2.5, Math.max(0.5, finite(settings.lyricsFontScale, 1))),
    fontWeight: Number.isFinite(settings.fontWeight)
      ? Math.round(Math.min(900, Math.max(100, settings.fontWeight)) / 10) * 10
      : null,
  };
}
export function resolveColors(scheme, primary, accent) {
  if (scheme === 'swap') return [accent || primary, primary];
  if (scheme === 'accentAll') return [accent || primary, accent || primary];
  if (scheme === 'primaryAll') return [primary, primary];
  return [primary, accent || primary];
}
export function measureFontSize(width, fontScale) {
  return Math.max(width * 0.06875, 90 * fontScale);
}
export function renderFontSize(width, scale, shortLast) {
  return Math.max(50, Math.min(width * 0.06875, 90)) * scale * (shortLast ? 1.18 : 1);
}
export function segmentTimings(segments, line) {
  return segments.map((segment) => {
    const range = findSegmentWordRange(segment.charOffset, segment.text, line.fullText, line.words);
    const words = line.words.slice(range.startWordIndex, range.endWordIndex);
    return words.length
      ? { start: words[0].startTime, end: words[words.length - 1].endTime }
      : { start: line.startTime, end: getLineRenderEndTime(line) };
  });
}
export function visibleSegmentIndex(time, timings, line) {
  if (!line || time < line.startTime - 0.1 || time > getLineRenderEndTime(line)) return -1;
  let index = -1;
  for (let i = 0; i < timings.length; i++) if (time >= timings[i].start - 0.25) index = i;
  return index;
}
export function ease(value) {
  return cubicBezier(value, 0.25, 0.46, 0.45, 0.94);
}
export function pulseEase(value) {
  return cubicBezier(value, 0, 0, 0.58, 1);
}
function cubicBezier(value, x1, y1, x2, y2) {
  const x = Math.max(0, Math.min(1, value));
  if (x === 0 || x === 1) return x;
  const at = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid, x1, x2) < x) lo = mid;
    else hi = mid;
  }
  return at((lo + hi) / 2, y1, y2);
}
export function segmentPose(age, italic, visible, leaving) {
  const p = ease(age / (italic ? 0.6 : 0.55));
  if (leaving)
    return { opacity: 1 - p, y: (italic ? -16 : -12) * p, scale: italic ? 1 - 0.05 * p : 1 };
  return {
    opacity: visible ? p : 1 - p,
    y: (italic ? 24 : 20) * (visible ? 1 - p : p),
    scale: italic ? (visible ? 0.92 + 0.08 * p : 1 - 0.08 * p) : 1,
  };
}
export function characterPose(age, index, italic, space, visible, pixelSize) {
  const p = ease((age - (visible && !space ? index * (italic ? 0.05 : 0.04) : 0)) / 0.5);
  const stagger = space ? 0 : ((index % 2 === 0 ? -1 : 1) * pixelSize) / 6;
  return { opacity: visible ? p : 1 - p, y: italic ? stagger * (visible ? 2 - p : 1 + p) : 0 };
}
// Each native shaping cluster is kept intact (ligatures and joining scripts included).
export function clusterGeometry(text, metric, pixelSize, italic) {
  const result = [];
  const source = [];
  let cursor = 0,
    visualIndex = 0;
  for (const char of splitLyricGraphemes(text)) {
    const space = /^\s+$/.test(char);
    source.push({ start: cursor, end: cursor + char.length, visualIndex, space });
    cursor += char.length;
    if (!space) ++visualIndex;
  }
  let added = 0;
  for (const part of metric.graphemes) {
    const char = text.slice(part.start, part.start + part.length);
    const space = /^\s+$/.test(char);
    const minSpace = pixelSize * (italic ? 0.35 : 0.25);
    const extra = space ? Math.max(0, minSpace - Math.abs(part.advance)) : 0;
    let cluster = result.length ? result[result.length - 1] : null;
    if (!cluster || cluster.start !== part.clusterStart) {
      cluster = {
        start: part.clusterStart,
        end: part.start + part.length,
        x: part.x + added,
        nativeX: part.x,
        width: Math.abs(part.advance) + extra,
        space,
      };
      result.push(cluster);
    } else {
      cluster.width += Math.abs(part.advance) + extra;
      cluster.end = Math.max(cluster.end, part.start + part.length);
    }
    added += extra;
  }
  for (const cluster of result) {
    const own = source.filter((part) => part.start < cluster.end && part.end > cluster.start);
    cluster.visualIndex = own.length ? own[0].visualIndex : 0;
    cluster.visualCount = own.filter((part) => !part.space).length;
    cluster.space = cluster.visualCount === 0;
  }
  return { clusters: result, width: metric.width + added };
}
export function clusterTimings(geometry, metric, timings) {
  return geometry.clusters.map((cluster) => {
    const own = timings.slice(cluster.visualIndex, cluster.visualIndex + cluster.visualCount);
    return own.length
      ? { startTime: own[0].startTime, endTime: own[own.length - 1].endTime }
      : null;
  });
}
