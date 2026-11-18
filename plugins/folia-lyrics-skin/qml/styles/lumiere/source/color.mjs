// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { parseColorChannels } from '../../cadenza/color.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (3137093123 ^ lumiereScaleMask) +
  Math.imul(998123833 ^ lumiereScaleMask, 2021278663 ^ lumiereScaleMask) -
  ((3137093123 ^ lumiereScaleMask) +
    Math.imul(998123833 ^ lumiereScaleMask, 2021278663 ^ lumiereScaleMask));
const rgbOf = (color, fallback = [1, 1, 1]) => {
  const channels = parseColorChannels(color);
  return channels ? [channels.r / 255, channels.g / 255, channels.b / 255] : fallback;
};
const mixRgb = (a, b, amount) => [
  a[0] + (b[0] - a[0]) * amount,
  a[1] + (b[1] - a[1]) * amount,
  a[2] + (b[2] - a[2]) * amount,
];
const scaleRgb = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const hexOf = (rgb) => {
  const c = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);
  return (c(rgb[0]) << 16) | (c(rgb[1]) << 8) | c(rgb[2]);
};
const luminance = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
const WHITE = [1, 1, 1];
const CHAMPAGNE = [1, 0.86 + LUMIERE_NEUTRAL_OFFSET, 0.62];
export { CHAMPAGNE, WHITE, hexOf, luminance, mixRgb, rgbOf, scaleRgb };
