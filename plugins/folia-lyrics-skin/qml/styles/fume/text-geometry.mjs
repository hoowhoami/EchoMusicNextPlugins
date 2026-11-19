// Derived from Folia a8da4437 (AGPL-3.0-only). See THIRD_PARTY_NOTICES.md.
// Shared article geometry: no preparation engine or font-analysis imports.
import { clamp } from './math.mjs';
import { resolveThemeFontWeight } from '../cadenza/font-stacks.mjs';
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
const buildFontSpec = (fontPx, variant, fontFamily, theme) => {
  const fontWeight = resolveThemeFontWeight(theme, variant === 'hero' ? 780 : 640);
  return `${fontWeight} ${fontPx}px ${fontFamily}`;
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
    segment.measuredGlyphOffsets.length - 1,
  );
  return (_a = segment.measuredGlyphOffsets[localOffset]) != null ? _a : 0;
};
const resolveSegmentGlyphAdvance = (segment, globalOffset) => {
  var _a, _b;
  const localOffset = clamp(
    globalOffset - segment.start,
    0,
    segment.measuredGlyphOffsets.length - 2,
  );
  const current = (_a = segment.measuredGlyphOffsets[localOffset]) != null ? _a : 0;
  const next = (_b = segment.measuredGlyphOffsets[localOffset + 1]) != null ? _b : current;
  return Math.max(next - current, 0);
};
export {
  widthBetweenOffsets,
  resolveGlyphAdvance,
  buildFontSpec,
  resolveRenderLineOffset,
  resolveSegmentGlyphOffset,
  resolveSegmentGlyphAdvance,
};
