// Generated from Folia a8da4437 (AGPL-3.0-only). See cadenza-reference.md.
import { layoutWithLines, prepareWithSegments } from './pretext.mjs';
import { resolveThemeFontStack, resolveThemeFontWeight } from './font-stacks.mjs';
import { clamp, isCJK, splitGraphemes } from './envelopes.mjs';
import { buildLineFragments, buildSegmentMetas, findWordRanges } from './fragments.mjs';
import { buildWordPlacements } from './placements.mjs';
const chooseFontPx = (width, line) => {
  const graphemeCount = splitGraphemes(line.fullText).length || 1;
  const wordCount = line.words.length || 1;
  const widthBase = clamp(width * 0.086, 34, 94);
  const lengthPenalty = graphemeCount > 12 ? Math.min((graphemeCount - 12) * 1.8, 34) : 0;
  const densityPenalty = wordCount > 7 ? Math.min((wordCount - 7) * 1.5, 18) : 0;
  return clamp(widthBase - lengthPenalty - densityPenalty, 28, 104);
};
const buildCanvasFont = (theme, fontPx) =>
  `${resolveThemeFontWeight(theme, 700)} ${fontPx}px ${resolveThemeFontStack(theme)}`;
const buildPreparedState = (line, context) => {
  const { showText, viewport, theme, tuning } = context;
  if (!showText || viewport.width <= 0 || viewport.height <= 0) {
    return null;
  }
  const fontPx = clamp(chooseFontPx(viewport.width, line) * tuning.fontScale, 24, 132);
  const font = buildCanvasFont(theme, fontPx);
  const prepared = prepareWithSegments(line.fullText, font);
  const text = prepared.segments.join('');
  const { segmentMetas, graphemes } = buildSegmentMetas(prepared);
  const lineHeight = Math.round(fontPx * (isCJK(text) ? 1.22 : 1.1));
  const availableWidth = Math.max(viewport.width - 48, 120);
  const minWidth = Math.min(220, availableWidth);
  const wrapCompression =
    graphemes.length > 12 ? clamp(0.92 - (graphemes.length - 12) * 0.018, 0.62, 0.92) : 0.92;
  const compactWidthRatio = tuning.widthRatio * wrapCompression;
  const maxWidth = clamp(
    Math.min(viewport.width * compactWidthRatio, 820),
    minWidth,
    availableWidth
  );
  const layout = layoutWithLines(prepared, maxWidth, lineHeight);
  const ranges = findWordRanges(line, graphemes, theme);
  const lineFragments = buildLineFragments(prepared, segmentMetas, graphemes, layout, ranges);
  const placements = buildWordPlacements(
    lineFragments,
    fontPx,
    lineHeight,
    maxWidth,
    theme.animationIntensity,
    line.startTime * 1e3,
    line.fullText === '......'
  );
  return {
    prepared,
    text,
    font,
    fontPx,
    lineHeight,
    maxWidth,
    layout,
    segmentMetas,
    graphemes,
    placements,
  };
};
export { buildPreparedState };
