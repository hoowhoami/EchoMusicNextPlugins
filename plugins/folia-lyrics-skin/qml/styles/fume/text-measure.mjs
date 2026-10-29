// Derived from Folia a8da4437 (AGPL-3.0-only). See fume-reference.md.
import { measureNaturalWidth, prepareWithSegments, walkLineRanges } from './pretext.mjs';
import { resolveThemeFontWeight } from '../cadenza/font-stacks.mjs';
import { clamp, splitGraphemes } from './math.mjs';
import { measurePrefixOffsets, rememberBounded } from './text-cache.mjs';
const FUME_PRETEXT_OPTIONS = { whiteSpace: 'pre-wrap' };
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
  return { graphemes, segmentMetas };
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
    for (let index = localStart; index < localEnd; index += 1) {
      width += (_b = breakableFitAdvances[index]) != null ? _b : 0;
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
  for (let segmentIndex = 0; segmentIndex < segmentMetas.length; segmentIndex += 1) {
    const meta = segmentMetas[segmentIndex];
    if (endOffset <= meta.graphemeStart) break;
    if (startOffset >= meta.graphemeEnd) continue;
    const sliceStart = Math.max(startOffset, meta.graphemeStart);
    const sliceEnd = Math.min(endOffset, meta.graphemeEnd);
    width += getPartialSegmentWidth(prepared, segmentIndex, meta, sliceStart, sliceEnd);
  }
  return width;
};
const buildGlyphOffsets = (prepared, segmentMetas, startOffset, graphemeCount) => {
  const offsets = new Array(graphemeCount);
  for (let index = 0; index < graphemeCount; index += 1) {
    offsets[index] = widthBetweenOffsets(prepared, segmentMetas, startOffset, startOffset + index);
  }
  return offsets;
};
const resolveGlyphAdvance = (renderLine, graphemeIndex) => {
  var _a, _b;
  const currentOffset = (_a = renderLine.glyphOffsets[graphemeIndex]) != null ? _a : 0;
  const nextOffset =
    graphemeIndex < renderLine.graphemes.length - 1
      ? (_b = renderLine.glyphOffsets[graphemeIndex + 1]) != null
        ? _b
        : renderLine.width
      : renderLine.width;
  return Math.max(nextOffset - currentOffset, 0);
};
const buildRenderSegments = (prepared, segmentMetas, lineStart, lineEnd, fontSpec) => {
  var _a;
  const segments = [];
  for (let segmentIndex = 0; segmentIndex < segmentMetas.length; segmentIndex += 1) {
    const meta = segmentMetas[segmentIndex];
    if (lineEnd <= meta.graphemeStart) {
      break;
    }
    if (lineStart >= meta.graphemeEnd) {
      continue;
    }
    const start = Math.max(lineStart, meta.graphemeStart);
    const end = Math.min(lineEnd, meta.graphemeEnd);
    if (end <= start) {
      continue;
    }
    const localStart = start - lineStart;
    const localEnd = end - lineStart;
    const segmentText = (_a = prepared.segments[segmentIndex]) != null ? _a : '';
    const segmentGraphemes = splitGraphemes(segmentText);
    const text =
      start === meta.graphemeStart && end === meta.graphemeEnd
        ? segmentText
        : segmentGraphemes.slice(start - meta.graphemeStart, end - meta.graphemeStart).join('');
    const measuredGlyphOffsets = measureSegmentGlyphOffsets(text, fontSpec);
    segments.push({
      text,
      start,
      end,
      localStart,
      localEnd,
      x: widthBetweenOffsets(prepared, segmentMetas, lineStart, start),
      width: widthBetweenOffsets(prepared, segmentMetas, start, end),
      isFullSegment: start === meta.graphemeStart && end === meta.graphemeEnd,
      measuredGlyphOffsets,
    });
  }
  return segments;
};
const buildFontSpec = (fontPx, variant, fontFamily, theme) => {
  const fontWeight = resolveThemeFontWeight(theme, variant === 'hero' ? 780 : 640);
  return `${fontWeight} ${fontPx}px ${fontFamily}`;
};
import { getMeasureContext } from './native-measure.mjs';
const SEGMENT_MEASURE_CACHE_LIMIT = 2048;
const segmentMeasureCache = /* @__PURE__ */ new Map();
function measureSegmentGlyphOffsets(text, fontSpec) {
  const cacheKey = `${fontSpec}__${text}`;
  const cached = segmentMeasureCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const graphemes = splitGraphemes(text);
  const offsets = new Array(graphemes.length + 1).fill(0);
  const context = getMeasureContext();
  context.font = fontSpec;
  const measured = measurePrefixOffsets(graphemes, (prefix) => context.measureText(prefix).width);
  return rememberBounded(segmentMeasureCache, cacheKey, measured, SEGMENT_MEASURE_CACHE_LIMIT);
}
const buildWordRangeIndexByOffset = (graphemeCount, wordRanges, rangeKind = 'timing') => {
  const indices = new Array(graphemeCount).fill(-1);
  for (let rangeIndex = 0; rangeIndex < wordRanges.length; rangeIndex += 1) {
    const range = wordRanges[rangeIndex];
    const start = rangeKind === 'color' ? range.colorStart : range.start;
    const end = rangeKind === 'color' ? range.colorEnd : range.end;
    for (let offset = start; offset < end && offset < graphemeCount; offset += 1) {
      indices[offset] = rangeIndex;
    }
  }
  return indices;
};
const countRenderableGraphemes = (text) =>
  splitGraphemes(text).filter((value) => value.trim().length > 0).length;
const FIT_GUESS_MARGIN = 1e-3;
const LINEAR_FROM_PX = 24;
const PIXEL_EDGE_PX = 0.02;
const sizeRegime = (fontPx) => {
  if (fontPx >= LINEAR_FROM_PX) return 'linear';
  const halves = fontPx * 2;
  return Math.abs(halves - Math.round(halves)) < PIXEL_EDGE_PX * 2
    ? null
    : `half ${Math.floor(halves)}`;
};
const lineMeasuresFor = (all, text, variant, fontFamily, theme) => {
  const key = `${variant}:${text}`;
  let measures = all.get(key);
  if (!measures) {
    measures = {
      text,
      variant,
      fontFamily,
      theme,
      preparedByFontPx: /* @__PURE__ */ new Map(),
      fits: /* @__PURE__ */ new Map(),
      lastMeasured: null,
    };
    all.set(key, measures);
  }
  return measures;
};
const countLines = (prepared, width) => walkLineRanges(prepared, width, () => {});
const noteFit = (fit, fontPx, prepared) => {
  const lineCount = countLines(prepared, fit.width);
  if (lineCount <= 1) {
    if (fontPx > fit.fits) {
      fit.fits = fontPx;
      fit.lineCount = lineCount;
    }
  } else if (fontPx < fit.overflows) {
    fit.overflows = fontPx;
  }
};
const prepareLineAt = (measures, fontPx) => {
  let prepared = measures.preparedByFontPx.get(fontPx);
  if (!prepared) {
    const fontSpec = buildFontSpec(fontPx, measures.variant, measures.fontFamily, measures.theme);
    prepared = prepareWithSegments(measures.text, fontSpec, FUME_PRETEXT_OPTIONS);
    measures.preparedByFontPx.set(fontPx, prepared);
    const regime = sizeRegime(fontPx);
    if (regime === 'linear')
      measures.lastMeasured = { fontPx, naturalWidth: measureNaturalWidth(prepared) };
    for (const fit of measures.fits.values()) {
      if (fit.regime === regime) noteFit(fit, fontPx, prepared);
    }
  }
  return prepared;
};
const fitIn = (measures, regime, width) => {
  const key = `${regime}|${width}`;
  let fit = measures.fits.get(key);
  if (!fit) {
    fit = {
      regime,
      width,
      fits: Number.NEGATIVE_INFINITY,
      lineCount: 1,
      overflows: Number.POSITIVE_INFINITY,
      guessed: false,
    };
    for (const [measuredPx, prepared] of measures.preparedByFontPx) {
      if (sizeRegime(measuredPx) === regime) noteFit(fit, measuredPx, prepared);
    }
    measures.fits.set(key, fit);
  }
  return fit;
};
const fitsOnOneLine = (measures, fontPx, width) => {
  const regime = sizeRegime(fontPx);
  if (regime === null) return countLines(prepareLineAt(measures, fontPx), width) <= 1;
  const fit = fitIn(measures, regime, width);
  if (fontPx <= fit.fits) return true;
  if (fontPx >= fit.overflows) return false;
  const last = measures.lastMeasured;
  if (regime === 'linear' && !fit.guessed && last && last.naturalWidth > 0) {
    fit.guessed = true;
    const guess = (last.fontPx * width) / last.naturalWidth;
    for (const at of [guess * (1 - FIT_GUESS_MARGIN), guess * (1 + FIT_GUESS_MARGIN)]) {
      if (at > fit.fits && at < fit.overflows && at >= LINEAR_FROM_PX) prepareLineAt(measures, at);
    }
    if (fontPx <= fit.fits) return true;
    if (fontPx >= fit.overflows) return false;
  }
  prepareLineAt(measures, fontPx);
  return fontPx <= fit.fits;
};
const chooseSingleLineFontPx = (measures, width, lyricsFontScale, densityScale, heroScale) => {
  const { variant } = measures;
  let low = variant === 'hero' ? 18 : 10;
  let high = variant === 'hero' ? 58 : 30;
  let best = null;
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const candidateFontPx =
      ((low + high) / 2) * lyricsFontScale * densityScale * (variant === 'hero' ? heroScale : 1);
    if (fitsOnOneLine(measures, candidateFontPx, width)) {
      best = candidateFontPx;
      low = (low + high) / 2;
    } else {
      high = (low + high) / 2;
    }
  }
  if (best !== null) {
    const prepared = measures.preparedByFontPx.get(best);
    return {
      fontPx: best,
      lineCount: prepared
        ? countLines(prepared, width)
        : fitIn(measures, sizeRegime(best), width).lineCount,
    };
  }
  const fallbackFontPx =
    (variant === 'hero' ? 18 : 10) *
    lyricsFontScale *
    densityScale *
    (variant === 'hero' ? heroScale : 1);
  return {
    fontPx: fallbackFontPx,
    lineCount: countLines(prepareLineAt(measures, fallbackFontPx), width),
  };
};
const resolveRenderLineOffset = (renderLine, localOffset) => {
  var _a;
  if (localOffset <= 0) {
    return 0;
  }
  if (localOffset >= renderLine.graphemes.length) {
    return renderLine.width;
  }
  return (_a = renderLine.glyphOffsets[localOffset]) != null ? _a : renderLine.width;
};
const resolveSegmentGlyphOffset = (segment, globalOffset) => {
  var _a;
  const localOffset = clamp(
    globalOffset - segment.start,
    0,
    segment.measuredGlyphOffsets.length - 1
  );
  return (_a = segment.measuredGlyphOffsets[localOffset]) != null ? _a : 0;
};
const resolveSegmentGlyphAdvance = (segment, globalOffset) => {
  var _a, _b;
  const localOffset = clamp(
    globalOffset - segment.start,
    0,
    segment.measuredGlyphOffsets.length - 2
  );
  const current = (_a = segment.measuredGlyphOffsets[localOffset]) != null ? _a : 0;
  const next = (_b = segment.measuredGlyphOffsets[localOffset + 1]) != null ? _b : current;
  return Math.max(next - current, 0);
};
const clearFumeTextMeasureCaches = () => segmentMeasureCache.clear();
export {
  buildFontSpec,
  buildGlyphOffsets,
  buildRenderSegments,
  buildSegmentMetas,
  buildWordRangeIndexByOffset,
  chooseSingleLineFontPx,
  clearFumeTextMeasureCaches,
  countRenderableGraphemes,
  cursorToGlobalOffset,
  lineMeasuresFor,
  prepareLineAt,
  resolveGlyphAdvance,
  resolveRenderLineOffset,
  resolveSegmentGlyphAdvance,
  resolveSegmentGlyphOffset,
  widthBetweenOffsets,
};
