// Derived from Folia a8da4437 (AGPL-3.0-only). See monet-reference.md.
import { clearCache, layoutWithLines, prepareWithSegments } from './pretext.mjs';
import { measureRichInlineStats, prepareRichInline } from './pretext.mjs';
import { resolveLyricSubtitleTracks, resolveSubtitleContentMode } from './alternate-text.mjs';
import {
  SECONDARY_TRACK_FONT_WEIGHT_FALLBACK,
  SECONDARY_TRACK_GAP_EM,
  SECONDARY_TRACK_SIZE_FACTOR,
} from './subtitle-style.mjs';
import {
  buildLineGraphemeTimeline,
  buildWordGraphemeTimings,
} from '../../shared/text/graphemeTiming.mjs';
import { getLineRenderEndTime } from '../../shared/renderHints.mjs';
import { measurePrefixOffsets, rememberBounded } from './text-cache.mjs';
const ROOT_FONT_PX = 16;
const VIEWPORT_WIDTH_FALLBACK_PX = 1280;
const MONET_ACTIVE_TEXT_LINE_LIMIT = 14;
const MONET_INACTIVE_TEXT_LINE_LIMIT = 2;
const MONET_TRANSLATION_LINE_LIMIT = 2;
const MONET_MIN_MEASURE_WIDTH_PX = 180;
const MONET_GRAPHEME_OFFSETS_CACHE_LIMIT = 420;
const MONET_VERTICAL_METRICS_CACHE_LIMIT = 420;
const MONET_GLYPH_VERTICAL_SAFETY_PX = 2;
const MONET_LARGE_SCREEN_MIN_PX = 1536;
const MONET_LARGE_SCREEN_FULL_PX = 2200;
const MONET_LARGE_SCREEN_MAX_SCALE = 1.16;
const MONET_RAIL_BASE_MAX_WIDTH_PX = 780;
const MONET_RAIL_BASE_MAX_HEIGHT_PX = 520;
const MONET_ROW_BASE_MAX_WIDTH_PX = 1520;
const MONET_PORTRAIT_BASE_MAX_PX = 430;
const MONET_PORTRAIT_INNER_BASE_MAX_PX = 380;
const monetGraphemeOffsetsCache = /* @__PURE__ */ new Map();
const monetVerticalMetricsCache = /* @__PURE__ */ new Map();
let monetVerticalMeasureContext = null;
import { splitLyricGraphemes } from '../../shared/text/unicode.mjs';
import { propertyTest } from '../cadenza/unicode-properties.mjs';
import { getMeasureContext } from './native-measure.mjs';
let viewportWidth = 1280;
function configureViewport(width) {
  viewportWidth = width > 0 ? width : 1280;
}
import {
  buildWordColorRanges,
  buildWordColorRangesFromMatchers,
  prepareWordColorMatchers,
  resolveTokenColorMap,
} from '../cadenza/word-coloring.mjs';
const resolveMonetLargeScreenScale = (containerWidthPx) => {
  const referenceWidth =
    containerWidthPx && containerWidthPx > 0 ? containerWidthPx : viewportWidth;
  if (referenceWidth <= MONET_LARGE_SCREEN_MIN_PX) {
    return 1;
  }
  const progress = Math.min(
    1,
    (referenceWidth - MONET_LARGE_SCREEN_MIN_PX) /
      (MONET_LARGE_SCREEN_FULL_PX - MONET_LARGE_SCREEN_MIN_PX)
  );
  return 1 + (MONET_LARGE_SCREEN_MAX_SCALE - 1) * progress;
};
const resolveClampFontPx = (minRem, preferredVw, maxRem) => {
  const currentViewportWidth = viewportWidth;
  return Math.min(
    maxRem * ROOT_FONT_PX,
    Math.max(minRem * ROOT_FONT_PX, currentViewportWidth * (preferredVw / 100))
  );
};
const splitMonetGraphemes = splitLyricGraphemes;
const measureLyricLineStats = (line, fontSpec, maxWidthPx) => {
  const tokens = buildMonetDisplayTokens(line);
  if (tokens.length === 0) {
    return { lineCount: 1, maxLineWidthPx: 0 };
  }
  const items = tokens.map((token) => ({
    text: token.text,
    font: fontSpec,
    break: token.timed ? 'never' : 'normal',
  }));
  const { lineCount, maxLineWidth } = measureRichInlineStats(
    prepareRichInline(items),
    Math.max(maxWidthPx, MONET_MIN_MEASURE_WIDTH_PX)
  );
  return { lineCount: Math.max(lineCount, 1), maxLineWidthPx: maxLineWidth };
};
const measureTextLineCount = (text, fontSpec, maxWidthPx, lineHeightPx) => {
  const prepared = prepareWithSegments(text || ' ', fontSpec, { whiteSpace: 'pre-wrap' });
  const layout = layoutWithLines(
    prepared,
    Math.max(maxWidthPx, MONET_MIN_MEASURE_WIDTH_PX),
    lineHeightPx
  );
  return Math.max(layout.lines.length, 1);
};
const getMonetVerticalMeasureContext = getMeasureContext;
const measureMonetLineHeight = (text, fontSpec, fontPx, defaultLineHeightPx) => {
  const cacheKey = `${fontSpec}|${text}`;
  const cached = monetVerticalMetricsCache.get(cacheKey);
  if (cached !== void 0) {
    return cached;
  }
  const context = getMonetVerticalMeasureContext();
  if (!context) {
    return defaultLineHeightPx;
  }
  context.font = fontSpec;
  const metrics = context.measureText(text || 'Hg');
  const glyphHeightPx = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  const measuredLineHeightPx =
    glyphHeightPx > 0
      ? Math.max(defaultLineHeightPx, Math.ceil(glyphHeightPx + MONET_GLYPH_VERTICAL_SAFETY_PX))
      : defaultLineHeightPx;
  return rememberBounded(
    monetVerticalMetricsCache,
    cacheKey,
    measuredLineHeightPx,
    MONET_VERTICAL_METRICS_CACHE_LIMIT
  );
};
const clearMonetMeasurementCaches = () => {
  monetVerticalMetricsCache.clear();
  monetGraphemeOffsetsCache.clear();
  clearCache();
};
const measureTextWidthAtPx = (text, fontPx, fontSpec) => {
  var _a, _b;
  const prepared = prepareWithSegments(text || ' ', fontSpec);
  const layout = layoutWithLines(prepared, 99999, fontPx * 1.2);
  return (_b = (_a = layout.lines[0]) == null ? void 0 : _a.width) != null
    ? _b
    : Math.max(text.length, 1) * fontPx * 0.6;
};
const buildGraphemeOffsetsCacheKey = (text, fontPx, fontSpec) => `${fontPx}|${fontSpec}|${text}`;
const measureMonetGraphemeOffsets = (text, fontPx, fontSpec) => {
  const cacheKey = buildGraphemeOffsetsCacheKey(text, fontPx, fontSpec);
  const cached = monetGraphemeOffsetsCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const offsets = measurePrefixOffsets(splitMonetGraphemes(text), (prefix) =>
    measureTextWidthAtPx(prefix, fontPx, fontSpec)
  );
  return rememberBounded(
    monetGraphemeOffsetsCache,
    cacheKey,
    offsets,
    MONET_GRAPHEME_OFFSETS_CACHE_LIMIT
  );
};
const resolveMonetSweepEdgeSoftness = (fontPx) => Math.max(Math.min(fontPx * 0.45, 16), 6);
const resolveMonetSweepEnd = (filledWidthPx, fullWidthPx, edgeSoftnessPx) => {
  if (fullWidthPx <= 0) {
    return 0;
  }
  const progress = Math.min(1, Math.max(0, filledWidthPx / fullWidthPx));
  return filledWidthPx + edgeSoftnessPx * progress;
};
const resolveMonetLineStatus = (line, index, activeIndex, currentTime) => {
  if (
    index === activeIndex ||
    (activeIndex < 0 && currentTime >= line.startTime && currentTime <= line.endTime)
  ) {
    return 'active';
  }
  if (currentTime > line.endTime || (activeIndex >= 0 && index < activeIndex)) {
    return 'passed';
  }
  return 'waiting';
};
const resolveMonetWordStatus = (currentTime, startTime, endTime) => {
  if (currentTime < startTime) {
    return 'waiting';
  }
  if (currentTime <= endTime) {
    return 'active';
  }
  return 'passed';
};
const buildMonetDisplayTokens = (line) => {
  if (line.words.length === 0) {
    return [
      {
        text: line.fullText,
        startTime: line.startTime,
        endTime: getLineRenderEndTime(line),
        key: `${line.startTime}-full`,
        timed: true,
        startOffset: 0,
        endOffset: line.fullText.length,
        graphemeTimings: buildLineGraphemeTimeline(line),
      },
    ];
  }
  const tokens = [];
  let cursor = 0;
  line.words.forEach((word, index) => {
    const matchIndex = line.fullText.indexOf(word.text, cursor);
    if (matchIndex < 0) {
      return;
    }
    if (matchIndex > cursor) {
      tokens.push({
        text: line.fullText.slice(cursor, matchIndex),
        startTime: null,
        endTime: null,
        key: `${line.startTime}-static-${cursor}`,
        timed: false,
        startOffset: cursor,
        endOffset: matchIndex,
        graphemeTimings: [],
      });
    }
    const endOffset = matchIndex + word.text.length;
    tokens.push({
      text: word.text,
      startTime: word.startTime,
      endTime: word.endTime,
      key: `${line.startTime}-${index}-${word.startTime}`,
      timed: true,
      startOffset: matchIndex,
      endOffset,
      graphemeTimings: buildWordGraphemeTimings(word),
    });
    cursor = endOffset;
  });
  if (cursor < line.fullText.length) {
    tokens.push({
      text: line.fullText.slice(cursor),
      startTime: null,
      endTime: null,
      key: `${line.startTime}-tail-${cursor}`,
      timed: false,
      startOffset: cursor,
      endOffset: line.fullText.length,
      graphemeTimings: [],
    });
  }
  return tokens.length > 0
    ? tokens
    : [
        {
          text: line.fullText,
          startTime: line.startTime,
          endTime: getLineRenderEndTime(line),
          key: `${line.startTime}-fallback-full`,
          timed: true,
          startOffset: 0,
          endOffset: line.fullText.length,
          graphemeTimings: buildLineGraphemeTimeline(line),
        },
      ];
};
const resolveMonetLyricContext = (
  lines,
  currentLineIndex,
  activeLine,
  recentCompletedLine,
  nextLine
) => {
  var _a, _b;
  if (!activeLine) {
    return {
      previousLine: recentCompletedLine,
      activeLine: null,
      nextLine,
    };
  }
  return {
    previousLine:
      currentLineIndex > 0 ? ((_a = lines[currentLineIndex - 1]) != null ? _a : null) : null,
    activeLine,
    nextLine: (_b = lines[currentLineIndex + 1]) != null ? _b : nextLine,
  };
};
const findLineIndex = (lines, target) => {
  if (!target) {
    return -1;
  }
  const directIndex = lines.indexOf(target);
  if (directIndex >= 0) {
    return directIndex;
  }
  return lines.findIndex(
    (line) => line.startTime === target.startTime && line.fullText === target.fullText
  );
};
const buildMonetVisibleLineEntries = ({
  lines,
  currentLineIndex,
  activeLine,
  recentCompletedLine,
  upcomingLine,
  currentTime,
  before = 2,
  after = 2,
}) => {
  if (lines.length === 0) {
    return [];
  }
  const activeIndex = activeLine
    ? currentLineIndex >= 0
      ? currentLineIndex
      : findLineIndex(lines, activeLine)
    : -1;
  const upcomingIndex = findLineIndex(lines, upcomingLine);
  const recentIndex = findLineIndex(lines, recentCompletedLine);
  const anchorIndex =
    activeIndex >= 0 ? activeIndex : upcomingIndex >= 0 ? upcomingIndex : recentIndex;
  if (anchorIndex < 0) {
    return [];
  }
  const startIndex = Math.max(0, anchorIndex - before);
  const endIndex = Math.min(lines.length - 1, anchorIndex + after);
  const entries = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const line = lines[index];
    entries.push({
      key: `${index}-${line.startTime}-${line.fullText}`,
      line,
      index,
      offset: index - anchorIndex,
      status: resolveMonetLineStatus(line, index, activeIndex, currentTime),
    });
  }
  return entries;
};
const isReadableSubtitleText = (text) => propertyTest(['L', 'N']).test(text);
const resolveMonetSubtitleTracks = (line, mode) =>
  resolveLyricSubtitleTracks(line, mode, isReadableSubtitleText);
const measureMonetSubtitleTrack = (track, isSecondary, inputs) => {
  const fontPx = isSecondary
    ? inputs.translationFontPx * SECONDARY_TRACK_SIZE_FACTOR
    : inputs.translationFontPx;
  const fontWeight = isSecondary
    ? inputs.secondaryTranslationFontWeight
    : inputs.translationFontWeight;
  const fontSpec = `${fontWeight} ${fontPx}px ${inputs.translationFontStack}`;
  const lineHeightPx = measureMonetLineHeight(track.text, fontSpec, fontPx, fontPx * 1.28);
  const paddingTopPx = isSecondary ? fontPx * SECONDARY_TRACK_GAP_EM : Math.max(fontPx * 0.45, 7);
  const paddingBottomPx = Math.max(fontPx * 0.18, 5);
  const rawLineCount = measureTextLineCount(track.text, fontSpec, inputs.maxWidthPx, lineHeightPx);
  const lineCount = Math.min(rawLineCount, MONET_TRANSLATION_LINE_LIMIT);
  const contentHeightPx = lineCount * lineHeightPx;
  return {
    role: track.role,
    text: track.text,
    fontPx,
    fontWeight,
    lineCount,
    lineHeightPx,
    contentHeightPx,
    paddingTopPx,
    paddingBottomPx,
    heightPx: contentHeightPx + paddingTopPx + paddingBottomPx,
    isClipped: rawLineCount > lineCount,
  };
};
const buildMonetLayoutCacheKey = (entry, inputs) =>
  [
    entry.index,
    entry.line.startTime,
    entry.line.endTime,
    entry.line.fullText,
    inputs.subtitleContentMode,
    // Only an active line measures subtitle rows, so other lines don't churn when the subtitle text changes.
    entry.status === 'active'
      ? resolveMonetSubtitleTracks(entry.line, inputs.subtitleContentMode)
          .map((track) => `${track.role}:${track.text}`)
          .join('')
      : '',
    entry.status,
    inputs.fontPx,
    inputs.translationFontPx,
    inputs.fontStack,
    inputs.translationFontStack,
    inputs.fontWeight,
    inputs.translationFontWeight,
    inputs.secondaryTranslationFontWeight,
    inputs.maxWidthPx,
  ].join('');
const measureMonetLineLayout = ({
  line,
  status,
  fontPx,
  translationFontPx,
  fontStack,
  translationFontStack,
  fontWeight = 600,
  translationFontWeight = 500,
  secondaryTranslationFontWeight = SECONDARY_TRACK_FONT_WEIGHT_FALLBACK,
  maxWidthPx,
  showSubtitleTranslation = true,
  subtitleContentMode,
}) => {
  var _a, _b, _c;
  const fontSpec = `${fontWeight} ${fontPx}px ${fontStack}`;
  const resolvedTranslationFontStack =
    translationFontStack != null ? translationFontStack : fontStack;
  const lineHeightPx = measureMonetLineHeight(line.fullText, fontSpec, fontPx, fontPx * 1.18);
  const textPaddingTopPx = Math.max(fontPx * 0.16, 8);
  const textPaddingBottomPx = Math.max(fontPx * 0.34, 14);
  const { lineCount: textLineCount, maxLineWidthPx } = measureLyricLineStats(
    line,
    fontSpec,
    maxWidthPx
  );
  const textLimit =
    status === 'active' ? MONET_ACTIVE_TEXT_LINE_LIMIT : MONET_INACTIVE_TEXT_LINE_LIMIT;
  const visibleTextLineCount = Math.min(textLineCount, textLimit);
  const textContentHeightPx = visibleTextLineCount * lineHeightPx;
  const textHeightPx = textContentHeightPx + textPaddingTopPx + textPaddingBottomPx;
  const trackInputs = {
    fontPx,
    translationFontPx,
    fontStack,
    translationFontStack: resolvedTranslationFontStack,
    fontWeight,
    translationFontWeight,
    secondaryTranslationFontWeight,
    maxWidthPx,
    subtitleContentMode: resolveSubtitleContentMode(subtitleContentMode, showSubtitleTranslation),
  };
  const subtitleTracks =
    status === 'active'
      ? resolveMonetSubtitleTracks(line, trackInputs.subtitleContentMode).map((track, index) =>
          measureMonetSubtitleTrack(track, index > 0, trackInputs)
        )
      : [];
  const firstTrack = subtitleTracks[0];
  const lastTrack = subtitleTracks[subtitleTracks.length - 1];
  const translationHeightPx = subtitleTracks.reduce((total, track) => total + track.heightPx, 0);
  return {
    textLineCount,
    visibleTextLineCount,
    textHeightPx,
    textContentHeightPx,
    textPaddingTopPx,
    textPaddingBottomPx,
    subtitleTracks,
    translationLineCount: subtitleTracks.reduce((total, track) => total + track.lineCount, 0),
    translationHeightPx,
    translationContentHeightPx: subtitleTracks.reduce(
      (total, track) => total + track.contentHeightPx,
      0
    ),
    translationPaddingTopPx:
      (_a = firstTrack == null ? void 0 : firstTrack.paddingTopPx) != null
        ? _a
        : Math.max(translationFontPx * 0.45, 7),
    translationPaddingBottomPx:
      (_b = lastTrack == null ? void 0 : lastTrack.paddingBottomPx) != null
        ? _b
        : Math.max(translationFontPx * 0.18, 5),
    visualHeightPx: textHeightPx + translationHeightPx,
    lineHeightPx,
    translationLineHeightPx:
      (_c = firstTrack == null ? void 0 : firstTrack.lineHeightPx) != null
        ? _c
        : measureMonetLineHeight(
            '',
            `${translationFontWeight} ${translationFontPx}px ${resolvedTranslationFontStack}`,
            translationFontPx,
            translationFontPx * 1.28
          ),
    isTextClipped: textLineCount > visibleTextLineCount,
    // A token wider than the column (a long compound word) overruns the text box and would be
    // sliced mid-glyph by `overflow: hidden`. The rail fades that edge out instead.
    isTextOverflowingWidth: maxLineWidthPx > maxWidthPx,
    isTranslationClipped: subtitleTracks.some((track) => track.isClipped),
  };
};
export {
  MONET_PORTRAIT_BASE_MAX_PX,
  MONET_PORTRAIT_INNER_BASE_MAX_PX,
  MONET_RAIL_BASE_MAX_HEIGHT_PX,
  MONET_RAIL_BASE_MAX_WIDTH_PX,
  MONET_ROW_BASE_MAX_WIDTH_PX,
  buildMonetDisplayTokens,
  buildMonetLayoutCacheKey,
  buildMonetVisibleLineEntries,
  buildWordColorRanges as buildMonetWordColorRanges,
  buildWordColorRangesFromMatchers as buildMonetWordColorRangesFromMatchers,
  clearMonetMeasurementCaches,
  configureViewport,
  measureMonetGraphemeOffsets,
  measureMonetLineLayout,
  prepareWordColorMatchers as prepareMonetWordColorMatchers,
  resolveClampFontPx,
  resolveMonetLargeScreenScale,
  resolveMonetLineStatus,
  resolveMonetLyricContext,
  resolveMonetSubtitleTracks,
  resolveMonetSweepEdgeSoftness,
  resolveMonetSweepEnd,
  resolveTokenColorMap as resolveMonetTokenColorMap,
  resolveMonetWordStatus,
  splitMonetGraphemes,
};
