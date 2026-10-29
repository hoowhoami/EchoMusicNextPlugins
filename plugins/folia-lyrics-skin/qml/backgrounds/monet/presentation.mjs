// Folia MonetBackgroundLayer.tsx CSS/layout, AGPL-3.0-only.
import { DEFAULT_MONET_BACKGROUND_TUNING } from './defaults.mjs';
import { resolveStoredMonetBackgroundTuning } from './source-tuning.mjs';
export function resolveMonetBackgroundSettings(settings) {
  const input = {};
  for (const key of Object.keys(DEFAULT_MONET_BACKGROUND_TUNING)) {
    const flat = 'monet' + key[0].toUpperCase() + key.slice(1);
    if (settings && settings[flat] !== undefined) input[key] = settings[flat];
  }
  return resolveStoredMonetBackgroundTuning(input);
}
export function paneFraction(width) {
  return width < 640 ? 0.72 : width < 1024 ? 0.68 : 0.6;
}
export function imageOpacity(daylight, tuning) {
  return (daylight ? 0.7 : 0.3) + Math.max(0, Math.min(1, tuning.backgroundOverlayOpacity)) * 0.16;
}
export function imagePosition(tuning) {
  return Math.max(10, Math.min(90, 50 + tuning.backgroundHalfPaneOffsetX)) / 100;
}
export function sourceCssColor(value) {
  if (value && typeof value.r === 'number')
    return (
      'rgba(' +
      [value.r, value.g, value.b].map((c) => Math.round(c * 255)).join(',') +
      ',' +
      value.a +
      ')'
    );
  return String(value);
}
export function displayDecodeSize(sourceWidth, sourceHeight, width, height, dpr) {
  if (sourceWidth <= 0 || sourceHeight <= 0) return { width: 0, height: 0, bytes: 0 };
  const scale = Math.min(
    1,
    4096 / sourceWidth,
    4096 / sourceHeight,
    Math.max((width * dpr) / sourceWidth, (height * dpr) / sourceHeight) * 1.15
  );
  const w = Math.max(1, Math.round(sourceWidth * scale)),
    h = Math.max(1, Math.round(sourceHeight * scale));
  return { width: w, height: h, bytes: w * h * 4 };
}
