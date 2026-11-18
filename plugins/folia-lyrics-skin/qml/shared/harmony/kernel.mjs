// Folia a8da4437 Harmony geometry/mask. Real font widths are supplied by native measurement.
export { buildHarmonyTextParts, fillWidth } from './text-parts.mjs';
export { resolveHarmonyAlternateText } from './runtime.mjs';
export { buildLineGraphemeTimeline } from '../text/graphemeTiming.mjs';
export { splitLyricGraphemes } from '../text/unicode.mjs';
export { resolveWordColor } from './word-color.mjs';
export function harmonyGeometry(width, scale, background) {
  const clamp = (a, b, c) => Math.min(c * 16, Math.max(a * 16, (width * b) / 100));
  const rounded = (value) => Number((value * scale).toFixed(3));
  const measureFontPx = clamp(0.95, 1.8, 1.3) * scale;
  return {
    top: 76,
    maxWidth: 896,
    outerPadding: 20,
    paddingX: background ? 16 : 0,
    paddingY: background ? 8 : 0,
    gap: 6,
    measureFontPx,
    fontPx: clamp(rounded(0.95), rounded(1.8), rounded(1.3)),
    alternateFontPx: clamp(rounded(0.72), rounded(1.2), rounded(0.9)),
    glowPadding: Math.round(Math.max(measureFontPx * 0.85, 16)),
    softness: Math.max(Math.min(measureFontPx * 1.35, 36), 18),
  };
}
export function maskStops(fillWidth, fontPx) {
  const padding = Math.round(Math.max(fontPx * 0.85, 16));
  const softness = Math.max(Math.min(fontPx * 1.35, 36), 18),
    edge = fillWidth + padding;
  const solid = Math.max(edge - softness, 0);
  return { edge, solid, half: Math.max(solid, edge - softness * 0.5), alpha: 0.86 };
}
