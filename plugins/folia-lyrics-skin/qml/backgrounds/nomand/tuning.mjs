// Folia a8da4437 / Paper0.0.80. See nomand-reference.md.
const DEFAULT_NOMAND_BACKGROUND_TUNING = {
  imageSource: 'cover-derived',
  effect: 'dithering',
  ditheringType: '8x8',
  size: 3,
  colorSteps: 4,
  originalColors: false,
  inverted: false,
  flutedGlassSize: 0.5,
  flutedGlassDistortion: 0.5,
  flutedGlassBlur: 0.08,
  paperTextureContrast: 0.32,
  paperTextureRoughness: 0.42,
  paperTextureFiber: 0.3,
  halftoneDotsSize: 0.5,
  halftoneDotsRadius: 1.25,
  halftoneDotsContrast: 0.4,
  halftoneDotsOriginalColors: false,
  halftoneDotsInverted: false,
  lensDistortionSpread: 0.45,
  lensDistortionBulge: 0.3,
  lensDistortionDispersion: 0.65,
  overlayEnabled: true,
  overlayOpacity: 0.35,
};
const resolveNomandBackgroundSource = (value) =>
  value === 'uploaded-global' ? 'uploaded-global' : DEFAULT_NOMAND_BACKGROUND_TUNING.imageSource;
const resolveNomandDitheringType = (value) =>
  value === '2x2' || value === '4x4' || value === '8x8'
    ? value
    : DEFAULT_NOMAND_BACKGROUND_TUNING.ditheringType;
const resolveNomandBackgroundEffect = (value) =>
  value === 'fluted-glass' ||
  value === 'paper-texture' ||
  value === 'halftone-dots' ||
  value === 'lens-distortion' ||
  value === 'dithering'
    ? value
    : DEFAULT_NOMAND_BACKGROUND_TUNING.effect;
const clampNomandEffectValue = (value, fallback, min = 0, max = 1) =>
  Math.min(
    max,
    Math.max(min, typeof value === 'number' && Number.isFinite(value) ? value : fallback)
  );
const resolveStoredNomandBackgroundTuning = (parsed) => {
  var _a, _b, _c, _d;
  return {
    imageSource: resolveNomandBackgroundSource(parsed.imageSource),
    effect: resolveNomandBackgroundEffect(parsed.effect),
    ditheringType: resolveNomandDitheringType(parsed.ditheringType),
    size: Math.min(
      20,
      Math.max(
        0.5,
        Number.isFinite(parsed.size) ? parsed.size : DEFAULT_NOMAND_BACKGROUND_TUNING.size
      )
    ),
    colorSteps: Math.min(
      7,
      Math.max(
        1,
        Math.round(
          Number.isFinite(parsed.colorSteps)
            ? parsed.colorSteps
            : DEFAULT_NOMAND_BACKGROUND_TUNING.colorSteps
        )
      )
    ),
    originalColors:
      (_a = parsed.originalColors) != null ? _a : DEFAULT_NOMAND_BACKGROUND_TUNING.originalColors,
    inverted: (_b = parsed.inverted) != null ? _b : DEFAULT_NOMAND_BACKGROUND_TUNING.inverted,
    flutedGlassSize: clampNomandEffectValue(
      parsed.flutedGlassSize,
      DEFAULT_NOMAND_BACKGROUND_TUNING.flutedGlassSize,
      0.1
    ),
    flutedGlassDistortion: clampNomandEffectValue(
      parsed.flutedGlassDistortion,
      DEFAULT_NOMAND_BACKGROUND_TUNING.flutedGlassDistortion
    ),
    flutedGlassBlur: clampNomandEffectValue(
      parsed.flutedGlassBlur,
      DEFAULT_NOMAND_BACKGROUND_TUNING.flutedGlassBlur
    ),
    paperTextureContrast: clampNomandEffectValue(
      parsed.paperTextureContrast,
      DEFAULT_NOMAND_BACKGROUND_TUNING.paperTextureContrast
    ),
    paperTextureRoughness: clampNomandEffectValue(
      parsed.paperTextureRoughness,
      DEFAULT_NOMAND_BACKGROUND_TUNING.paperTextureRoughness
    ),
    paperTextureFiber: clampNomandEffectValue(
      parsed.paperTextureFiber,
      DEFAULT_NOMAND_BACKGROUND_TUNING.paperTextureFiber
    ),
    halftoneDotsSize: clampNomandEffectValue(
      parsed.halftoneDotsSize,
      DEFAULT_NOMAND_BACKGROUND_TUNING.halftoneDotsSize,
      0.1
    ),
    halftoneDotsRadius: clampNomandEffectValue(
      parsed.halftoneDotsRadius,
      DEFAULT_NOMAND_BACKGROUND_TUNING.halftoneDotsRadius,
      0.1,
      2
    ),
    halftoneDotsContrast: clampNomandEffectValue(
      parsed.halftoneDotsContrast,
      DEFAULT_NOMAND_BACKGROUND_TUNING.halftoneDotsContrast
    ),
    halftoneDotsOriginalColors:
      (_c = parsed.halftoneDotsOriginalColors) != null
        ? _c
        : DEFAULT_NOMAND_BACKGROUND_TUNING.halftoneDotsOriginalColors,
    halftoneDotsInverted:
      (_d = parsed.halftoneDotsInverted) != null
        ? _d
        : DEFAULT_NOMAND_BACKGROUND_TUNING.halftoneDotsInverted,
    lensDistortionSpread: clampNomandEffectValue(
      parsed.lensDistortionSpread,
      DEFAULT_NOMAND_BACKGROUND_TUNING.lensDistortionSpread
    ),
    lensDistortionBulge: clampNomandEffectValue(
      parsed.lensDistortionBulge,
      DEFAULT_NOMAND_BACKGROUND_TUNING.lensDistortionBulge,
      -1,
      1
    ),
    lensDistortionDispersion: clampNomandEffectValue(
      parsed.lensDistortionDispersion,
      DEFAULT_NOMAND_BACKGROUND_TUNING.lensDistortionDispersion
    ),
    overlayEnabled:
      typeof parsed.overlayEnabled === 'boolean'
        ? parsed.overlayEnabled
        : DEFAULT_NOMAND_BACKGROUND_TUNING.overlayEnabled,
    overlayOpacity: Math.min(
      1,
      Math.max(
        0,
        Number.isFinite(parsed.overlayOpacity)
          ? parsed.overlayOpacity
          : DEFAULT_NOMAND_BACKGROUND_TUNING.overlayOpacity
      )
    ),
  };
};
const defaults = DEFAULT_NOMAND_BACKGROUND_TUNING;
export { DEFAULT_NOMAND_BACKGROUND_TUNING, defaults, resolveStoredNomandBackgroundTuning };
