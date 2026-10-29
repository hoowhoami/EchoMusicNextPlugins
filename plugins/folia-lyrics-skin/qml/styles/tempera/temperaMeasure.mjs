// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { layoutWithLines, prepareWithSegments } from './pretext.mjs';
const MEASURE_CACHE_LIMIT = 2e4;
const measureCache = /* @__PURE__ */ new Map();
const readMeasureCache = (key) => measureCache.get(key);
const writeMeasureCache = (key, width) => {
  if (measureCache.size >= MEASURE_CACHE_LIMIT) {
    const oldest = measureCache.keys().next();
    if (!oldest.done) measureCache.delete(oldest.value);
  }
  measureCache.set(key, width);
};
const createTemperaMeasureContext = (fontFamily, fontWeight) => ({
  cache: measureCache,
  fontFamily,
  fontWeight,
});
const measureText = (ctx, text, fontSize) => {
  var _a, _b;
  const fontSpec = `${ctx.fontWeight} ${fontSize}px ${ctx.fontFamily}`;
  const key = `${fontSpec}|${text}`;
  const cached = readMeasureCache(key);
  if (cached !== void 0) return cached;
  let measured;
  try {
    const layout = layoutWithLines(prepareWithSegments(text, fontSpec), 99999, fontSize * 1.2);
    measured =
      (_b = (_a = layout.lines[0]) == null ? void 0 : _a.width) != null
        ? _b
        : text.length * fontSize * 0.6;
  } catch (e) {
    measured = text.length * fontSize * 0.6;
  }
  const width = Math.max(fontSize * 0.08, measured);
  writeMeasureCache(key, width);
  return width;
};
const measureTemperaGrapheme = (ctx, char, fontSize) =>
  char.trim().length === 0 ? fontSize * 0.3 : measureText(ctx, char, fontSize);
const buildTemperaWordUnit = (ctx, segment, lineIndex, segmentIndex, fontSize, scale) => {
  const glyphs = segment.graphemes.filter((grapheme) => grapheme.char.length > 0);
  if (glyphs.length === 0) return null;
  const scaledSize = fontSize * scale;
  const raw = glyphs.map((grapheme) => measureTemperaGrapheme(ctx, grapheme.char, scaledSize));
  const rawTotal = raw.reduce((sum, value) => sum + value, 0);
  const shaped = measureText(ctx, segment.text.replace(/\s+$/u, ''), scaledSize);
  const correction = rawTotal > 0 ? shaped / rawTotal : 1;
  let offset = 0;
  const placed = glyphs.map((grapheme, index) => {
    const width = raw[index] * correction;
    const glyph = {
      char: grapheme.char,
      startTime: grapheme.startTime,
      endTime: grapheme.endTime,
      offset,
      width,
    };
    offset += width;
    return glyph;
  });
  return {
    lineIndex,
    segmentIndex,
    text: segment.text,
    startOffset: segment.startOffset,
    endOffset: segment.endOffset,
    leadingGap: 0,
    scale,
    width: offset,
    glyphs: placed,
    startTime: placed[0].startTime,
    endTime: placed[placed.length - 1].endTime,
  };
};
const clearLayoutMeasurements = () => measureCache.clear();
export {
  buildTemperaWordUnit,
  clearLayoutMeasurements,
  createTemperaMeasureContext,
  measureTemperaGrapheme,
};
