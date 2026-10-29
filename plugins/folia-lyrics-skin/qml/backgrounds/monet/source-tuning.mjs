// Folia a8da4437 AGPL-3.0-only. See docs/folia/monet-background-reference.md.
import { DEFAULT_MONET_BACKGROUND_TUNING } from './defaults.mjs';
const backgroundSource = (value) =>
  value === 'uploaded-global'
    ? 'uploaded-global'
    : DEFAULT_MONET_BACKGROUND_TUNING.backgroundSource;
const backgroundLayout = (value) =>
  value === 'full-overlay' || value === 'half-pane-gradient'
    ? value
    : DEFAULT_MONET_BACKGROUND_TUNING.backgroundLayout;
const washColorMode = (value) =>
  value === 'custom' ? 'custom' : DEFAULT_MONET_BACKGROUND_TUNING.backgroundWashColorMode;
const inRange = (min, max) => (value, fallback) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const blurPx = inRange(0, 60);
const unitInterval = inRange(0, 1);
const saturation = inRange(0, 2);
const offsetX = inRange(-40, 40);
const hexColor = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  const withoutHash = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (!/^[0-9a-fA-F]{6}$/.test(withoutHash)) {
    return fallback;
  }
  return `#${withoutHash.toLowerCase()}`;
};
const resolveStoredMonetBackgroundTuning = (parsed) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  return {
    backgroundSource: backgroundSource(parsed.backgroundSource),
    backgroundLayout: backgroundLayout(parsed.backgroundLayout),
    backgroundBlurPx: blurPx(
      (_a = parsed.backgroundBlurPx) != null
        ? _a
        : DEFAULT_MONET_BACKGROUND_TUNING.backgroundBlurPx,
      DEFAULT_MONET_BACKGROUND_TUNING.backgroundBlurPx
    ),
    backgroundOverlayOpacity: unitInterval(
      (_b = parsed.backgroundOverlayOpacity) != null
        ? _b
        : DEFAULT_MONET_BACKGROUND_TUNING.backgroundOverlayOpacity,
      DEFAULT_MONET_BACKGROUND_TUNING.backgroundOverlayOpacity
    ),
    backgroundGrayscale: unitInterval(
      (_c = parsed.backgroundGrayscale) != null
        ? _c
        : DEFAULT_MONET_BACKGROUND_TUNING.backgroundGrayscale,
      DEFAULT_MONET_BACKGROUND_TUNING.backgroundGrayscale
    ),
    backgroundSaturation: saturation(
      (_d = parsed.backgroundSaturation) != null
        ? _d
        : DEFAULT_MONET_BACKGROUND_TUNING.backgroundSaturation,
      DEFAULT_MONET_BACKGROUND_TUNING.backgroundSaturation
    ),
    backgroundWash: unitInterval(
      (_e = parsed.backgroundWash) != null ? _e : DEFAULT_MONET_BACKGROUND_TUNING.backgroundWash,
      DEFAULT_MONET_BACKGROUND_TUNING.backgroundWash
    ),
    backgroundHalfPaneOffsetX: offsetX(
      (_f = parsed.backgroundHalfPaneOffsetX) != null
        ? _f
        : DEFAULT_MONET_BACKGROUND_TUNING.backgroundHalfPaneOffsetX,
      DEFAULT_MONET_BACKGROUND_TUNING.backgroundHalfPaneOffsetX
    ),
    backgroundWashColorMode: washColorMode(parsed.backgroundWashColorMode),
    backgroundWashCustomColor: hexColor(
      parsed.backgroundWashCustomColor,
      DEFAULT_MONET_BACKGROUND_TUNING.backgroundWashCustomColor
    ),
    backgroundDriftEnabled:
      (_g = parsed.backgroundDriftEnabled) != null
        ? _g
        : DEFAULT_MONET_BACKGROUND_TUNING.backgroundDriftEnabled,
    backgroundDriftStrength: unitInterval(
      (_h = parsed.backgroundDriftStrength) != null
        ? _h
        : DEFAULT_MONET_BACKGROUND_TUNING.backgroundDriftStrength,
      DEFAULT_MONET_BACKGROUND_TUNING.backgroundDriftStrength
    ),
    backgroundStreaksEnabled:
      (_i = parsed.backgroundStreaksEnabled) != null
        ? _i
        : DEFAULT_MONET_BACKGROUND_TUNING.backgroundStreaksEnabled,
  };
};
export { resolveStoredMonetBackgroundTuning };
