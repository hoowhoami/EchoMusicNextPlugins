// Derived from Folia a8da4437 (AGPL-3.0-only). See monet-reference.md.
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
import { colorWithAlpha } from '../cadenza/color.mjs';
import { resolveWordColor } from '../cadenza/word-coloring.mjs';
import { MONET_SCROLL_SPRING, MONET_SCALE_SPRING } from './lyric-motion.mjs';
import { buildMonetLayoutCacheKey, measureMonetLineLayout } from './model.mjs';
import { rememberBounded } from './text-cache.mjs';
const MONET_RAIL_WIDTH_FALLBACK_PX = 680;
const MONET_RAIL_HEIGHT_FALLBACK_PX = 340;
const MONET_SUBTITLE_TRACK_STAGGER_S = 0.04;
const MONET_ACTIVE_GAP_PX = 18;
const MONET_INACTIVE_GAP_PX = 14;
const MONET_RAIL_MIN_ROWS = 7;
const MONET_ACTIVE_GAP_RATIO = 0.49;
const MONET_INACTIVE_GAP_RATIO = 0.38;
const MONET_SCROLL_IDLE_RESET_MS = 1800;
const MONET_SCROLL_STEP_PX = 72;
const MONET_TOUCH_STEP_PX = 52;
const MONET_SCROLL_BEFORE = 4;
const MONET_SCROLL_AFTER = 4;
const MONET_LAYOUT_CACHE_LIMIT = 240;
const MONET_RAIL_SCROLL_EVENT_OPTIONS = { passive: false };
const MONET_SCROLL_TRANSITION = {
  y: __spreadValues({ type: 'spring' }, MONET_SCROLL_SPRING),
  scale: __spreadValues({ type: 'spring' }, MONET_SCALE_SPRING),
  opacity: { duration: 0.28, ease: [0.32, 0.72, 0, 1] },
  filter: { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clampScrollSteps = (steps) => Math.max(-1, Math.min(1, steps));
const getScrollDirection = (delta) => (delta === 0 ? 0 : delta > 0 ? 1 : -1);
const resolveMonetWordColor = (wordText, theme, fallbackColor, keywordColoringEnabled = true) => {
  return resolveWordColor(wordText, theme.wordColors, fallbackColor, {
    keywordColoringEnabled,
    cjkMatchMode: 'exact',
  });
};
const resolveLineTone = (entry, theme, inactiveScale) => {
  if (entry.status === 'active') {
    return {
      opacity: 1,
      scale: 1,
      blurPx: 0,
      baseColor: colorWithAlpha(theme.primaryColor, 0.34),
      fontWeight: 600,
      zIndex: 4,
    };
  }
  const distance = Math.max(Math.abs(entry.offset), 1);
  const isWaiting = entry.status === 'waiting';
  const scale = clamp(inactiveScale * Math.pow(0.9, distance - 1), 0.68, 0.92);
  return {
    opacity: isWaiting
      ? clamp(0.72 - (distance - 1) * 0.18, 0.36, 0.72)
      : clamp(0.52 - (distance - 1) * 0.12, 0.28, 0.52),
    scale,
    blurPx: isWaiting
      ? distance === 1
        ? 0.7
        : 1.8 + (distance - 2) * 0.8
      : 1.1 + (distance - 1) * 0.7,
    baseColor: colorWithAlpha(theme.primaryColor, isWaiting ? 0.46 : 0.36),
    fontWeight: 500,
    zIndex: isWaiting ? 3 - distance : 2 - distance,
  };
};
const resolveLineGap = (previous, next, lyricFontPx) =>
  previous.status === 'active' || next.status === 'active'
    ? Math.max(MONET_ACTIVE_GAP_PX, lyricFontPx * MONET_ACTIVE_GAP_RATIO)
    : Math.max(MONET_INACTIVE_GAP_PX, lyricFontPx * MONET_INACTIVE_GAP_RATIO);
const resolveRailLineStatus = (lineIndex, activeLineIndex) => {
  if (lineIndex === activeLineIndex) {
    return 'active';
  }
  if (activeLineIndex >= 0 && lineIndex < activeLineIndex) {
    return 'passed';
  }
  return 'waiting';
};
const buildScrollableRailEntries = (lines, anchorIndex, activeLineIndex) => {
  if (lines.length === 0) {
    return [];
  }
  const safeAnchorIndex = Math.round(clamp(anchorIndex, 0, lines.length - 1));
  const startIndex = Math.max(0, safeAnchorIndex - MONET_SCROLL_BEFORE);
  const endIndex = Math.min(lines.length - 1, safeAnchorIndex + MONET_SCROLL_AFTER);
  const nextEntries = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const line = lines[index];
    nextEntries.push({
      key: `${index}-${line.startTime}-${line.fullText}`,
      line,
      index,
      offset: index - safeAnchorIndex,
      status: resolveRailLineStatus(index, activeLineIndex),
    });
  }
  return nextEntries;
};
const getOrMeasureMonetLineLayout = (cache, entry, inputs) => {
  const cacheKey = buildMonetLayoutCacheKey(entry, inputs);
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const layout = measureMonetLineLayout(
    __spreadValues(
      {
        line: entry.line,
        status: entry.status,
      },
      inputs
    )
  );
  return rememberBounded(cache, cacheKey, layout, MONET_LAYOUT_CACHE_LIMIT);
};
const buildPositionedEntries = (
  entries,
  railSize,
  theme,
  lyricFontPx,
  inactiveFontPx,
  layoutInputs,
  glowBufferPx,
  layoutCache
) => {
  const railWidth = railSize.width || MONET_RAIL_WIDTH_FALLBACK_PX;
  const railHeight = railSize.height || MONET_RAIL_HEIGHT_FALLBACK_PX;
  const inactiveScale = clamp(inactiveFontPx / Math.max(lyricFontPx, 1), 0.72, 0.92);
  const contentWidthPx = Math.max(railWidth - glowBufferPx * 2, 0);
  const measureInputs = __spreadProps(__spreadValues({}, layoutInputs), {
    fontPx: lyricFontPx,
    maxWidthPx: contentWidthPx - 8,
  });
  const measuredEntries = entries.map((entry) => {
    const tone = __spreadProps(__spreadValues({}, resolveLineTone(entry, theme, inactiveScale)), {
      fontWeight: layoutInputs.fontWeight,
    });
    const layout = getOrMeasureMonetLineLayout(layoutCache, entry, measureInputs);
    return __spreadProps(__spreadValues({}, entry), {
      y: 0,
      tone,
      layout,
      scaledHeight: layout.visualHeightPx * tone.scale,
    });
  });
  if (measuredEntries.length === 0) {
    return [];
  }
  const anchorIndex = Math.max(
    0,
    measuredEntries.findIndex((entry) => entry.offset === 0)
  );
  const focusCenterY = railHeight * 0.46;
  measuredEntries[anchorIndex].y = focusCenterY - measuredEntries[anchorIndex].scaledHeight / 2;
  for (let index = anchorIndex + 1; index < measuredEntries.length; index += 1) {
    const previous = measuredEntries[index - 1];
    const current = measuredEntries[index];
    current.y = previous.y + previous.scaledHeight + resolveLineGap(previous, current, lyricFontPx);
  }
  for (let index = anchorIndex - 1; index >= 0; index -= 1) {
    const current = measuredEntries[index];
    const next = measuredEntries[index + 1];
    current.y = next.y - current.scaledHeight - resolveLineGap(current, next, lyricFontPx);
  }
  return measuredEntries;
};
export {
  MONET_RAIL_MIN_ROWS,
  MONET_RAIL_SCROLL_EVENT_OPTIONS,
  MONET_SCROLL_IDLE_RESET_MS,
  MONET_SCROLL_STEP_PX,
  MONET_SCROLL_TRANSITION,
  MONET_SUBTITLE_TRACK_STAGGER_S,
  MONET_TOUCH_STEP_PX,
  buildPositionedEntries,
  buildScrollableRailEntries,
  clamp,
  clampScrollSteps,
  getScrollDirection,
  resolveMonetWordColor,
};
