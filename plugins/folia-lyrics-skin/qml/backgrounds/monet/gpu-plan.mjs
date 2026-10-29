// Folia a8da4437 painter geometry/colour boundary. AGPL-3.0-only.
import { parseColorChannels } from '../../styles/cadenza/color.mjs';
import { resolveStoredMonetBackgroundTuning } from './source-tuning.mjs';

function rgb(value, fallback) {
  const parsed = parseColorChannels(value);
  if (!parsed) return fallback;
  return [parsed.r, parsed.g, parsed.b].map((channel) => Math.max(0, Math.min(255, channel)) / 255);
}
export function planMonetPainter(sourceWidth, sourceHeight, colors, stored) {
  if (
    !Number.isInteger(sourceWidth) ||
    !Number.isInteger(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    sourceWidth > 32768 ||
    sourceHeight > 32768
  )
    return {
      error: 'Monet painter requires bounded original source dimensions',
      inputBytes: 0,
      fboBytes: 0,
    };
  const tuning = resolveStoredMonetBackgroundTuning(stored || {});
  const factor = Math.min(1, 4096 / sourceWidth, 4096 / sourceHeight);
  const inputWidth = Math.max(1, Math.round(sourceWidth * factor));
  const inputHeight = Math.max(1, Math.round(sourceHeight * factor));
  const padding = Math.ceil(4 * tuning.backgroundBlurPx);
  const background = rgb(colors.backgroundColor, [10 / 255, 10 / 255, 12 / 255]);
  const alphaMatch = /^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/i.exec(
    String(colors.backgroundColor)
  );
  const alpha = alphaMatch ? Math.max(0, Math.min(1, Number(alphaMatch[1]))) : 1;
  const baseFill = background.map((channel) => channel * alpha).concat([alpha]);
  const primary = rgb(colors.primaryColor, [245 / 255, 245 / 255, 245 / 255]);
  const accent = rgb(colors.accentColor, background);
  const wash =
    tuning.backgroundWashColorMode === 'custom'
      ? rgb(tuning.backgroundWashCustomColor, accent)
      : accent;
  const inputBytes = inputWidth * inputHeight * 4;
  const fboBytes = 1920 * (1080 + 2 * padding) * 8; // Static RGBA16F horizontal pass.
  return {
    error: '',
    width: 1920,
    height: 1080,
    sourceWidth,
    sourceHeight,
    inputWidth,
    inputHeight,
    inputBytes,
    fboBytes,
    totalBytes: inputBytes + fboBytes,
    padding,
    expandedHeight: 1080 + 2 * padding,
    background,
    baseFill,
    primary,
    accent,
    wash,
    tuning,
  };
}
