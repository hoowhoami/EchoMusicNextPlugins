// Native-only scene layout preparation. Source geometry is retained in the imported kernels.
import { normalizeFontWeight, resolveThemeFontStack } from './font-stacks.mjs';
import { clearCache } from './pretext.mjs';
import {
  configure,
  pendingMeasurements,
  pendingSegmentations,
  requestMetric,
} from './native-measure.mjs';
import {
  clearLayoutMeasurements,
  isSonnetLayoutSegment,
  resolveSonnetTypographyLayout,
} from './sonnetTypographyLayout.mjs';
import { resolveSonnetRoleFontWeight } from './sonnetTypographyRoles.mjs';
import { buildSonnetGlyphLayout } from './sonnetGlyphLayout.mjs';
import { buildScene } from './scene-build.mjs';

// Pixi's CanvasTextMetrics.measureFont measures this complete probe for real ink ascent/descent.
export const FONT_PROBE = '|ÉqÅM';
export function prepare(paragraph, context, measurements = [], pieces = [], discovery = true) {
  configure({ measurements, pieces, discovery });
  clearCache();
  clearLayoutMeasurements();
  const width = Math.max(context.width, 320),
    height = Math.max(context.height, 240);
  if (![width, height, context.lyricsFontScale].every(Number.isFinite))
    throw new Error('Invalid Sonnet layout dimensions');
  const fontFamily = resolveThemeFontStack(context.theme);
  const manualWeight = normalizeFontWeight(context.theme.fontWeight);
  const shots = paragraph.shots.map((shot) => {
    const lines = shot.lineIndices
      .map((sourceIndex) => paragraph.lines.find((line) => line.sourceIndex === sourceIndex))
      .filter(Boolean)
      .map((line) => line.segments.filter(isSonnetLayoutSegment))
      .filter((line) => line.length);
    const segments = [].concat(...lines);
    const wordCount = Math.max(1, segments.filter((segment) => segment.isWordLike).length);
    const heroScale = shot.kind === 'type-impact' ? 1.55 : shot.kind === 'quiet-tableau' ? 0.82 : 1;
    const baseFontSize = Math.max(
      24,
      Math.min(112, (width / Math.max(7, wordCount * 2.15)) * heroScale * context.lyricsFontScale)
    );
    const placements = resolveSonnetTypographyLayout({
      lines,
      shotKind: shot.kind,
      paragraphKind: paragraph.kind,
      width,
      height,
      baseFontSize,
      fontFamily,
      fontWeight: manualWeight,
    });
    const text = placements.map((placement) => {
      const segment = segments[placement.segmentIndex];
      const size = baseFontSize * placement.fontScale;
      const weight = resolveSonnetRoleFontWeight(manualWeight, placement.role);
      const font = `${weight} ${size}px ${fontFamily}`;
      const metric = requestMetric(font, segment.text);
      const fontMetric = requestMetric(font, FONT_PROBE);
      const glyphs = buildSonnetGlyphLayout(
        segment,
        placement,
        size,
        (char) => requestMetric(font, char).advance,
        { startTime: shot.startTime, endTime: shot.endTime }
      );
      return { segment, placement, size, weight, metric, fontMetric, glyphs };
    });
    return { shot, baseFontSize, placements, segments, text };
  });
  if (context.tuning) {
    const nativeScene = buildScene(paragraph, context);
    nativeScene.scene.container.destroy({ children: true });
    nativeScene.credits.destroy({ children: true });
    nativeScene.overlay.destroy({ children: true });
  }
  const requests = pendingMeasurements(),
    segmentations = pendingSegmentations();
  if (requests.length || segmentations.length) {
    // Source max-gap splits can exceed six lines; query count and text volume remain bounded.
    if (
      requests.length > 8192 ||
      requests.reduce((sum, value) => sum + value.text.length, 0) > 1048576
    )
      throw new Error('Sonnet native measurement discovery exceeds its bounded paragraph budget');
    return { phase: 'native', measurements: requests, segmentations };
  }
  return { phase: 'complete', fontFamily, width, height, shots };
}
