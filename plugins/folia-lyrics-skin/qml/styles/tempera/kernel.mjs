// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { flatMap } from './compat.mjs';
export * from './types.mjs';
export * from './temperaProgram.mjs';
export * from './temperaShotProfiles.mjs';
export * from './temperaCompositions.mjs';
export * from './temperaMotion.mjs';
export * from './temperaTransitions.mjs';
export * from './temperaCamera.mjs';
export * from './temperaPalette.mjs';
export * from './temperaLayout.mjs';
export * from './temperaImageLayer.mjs';
export * from './temperaCreditsLayer.mjs';
export * from './texture-budget.mjs';
const DEFAULT_TEMPERA_TUNING = {
  cameraIntensity: 1,
  glyphMotion: 1,
  wholeLineLyrics: false,
  glyphSettleStretch: 0.5,
  colorMode: 'duo',
  showBlocks: true,
  showDecor: true,
  showCornerMarks: true,
  textInversion: true,
  layerImages: [],
  layerImageDepth: 'back',
  layerImageFrequency: 0.6,
  enableTransitions: true,
  textureResolution: 1.5,
  postProcessEnabled: true,
  postProcessTextureCompression: false,
  postProcessGrain: 0.2,
  postProcessContrast: 0,
  postProcessRgbShift: 0,
  postProcessVignette: 0.85,
  postProcessLensDistortion: 0.3,
};
const DEFAULT_TEMPERA_LAYER_IMAGE = {
  align: 'free',
  // Preserve the original character-art composition, which placed images low in the frame.
  verticalAlign: 'bottom',
  scale: 0.7,
  opacity: 1,
};
const TEMPERA_MAX_LAYER_IMAGES = 16;
const numberWithin = (value, fallback, min, max) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
const switchOr = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const sanitizeLayerImages = (value) => {
  if (!Array.isArray(value)) return [];
  return flatMap(value, (entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry;
    if (typeof record.id !== 'string' || !record.id) return [];
    const align = record.align;
    const verticalAlign = record.verticalAlign;
    return [
      {
        id: record.id,
        name: typeof record.name === 'string' ? record.name : record.id,
        align:
          align === 'left' || align === 'center' || align === 'right' || align === 'free'
            ? align
            : DEFAULT_TEMPERA_LAYER_IMAGE.align,
        verticalAlign:
          verticalAlign === 'top' ||
          verticalAlign === 'center' ||
          verticalAlign === 'bottom' ||
          verticalAlign === 'free'
            ? verticalAlign
            : DEFAULT_TEMPERA_LAYER_IMAGE.verticalAlign,
        scale: numberWithin(record.scale, DEFAULT_TEMPERA_LAYER_IMAGE.scale, 0.05, 2),
        opacity: numberWithin(record.opacity, DEFAULT_TEMPERA_LAYER_IMAGE.opacity, 0, 1),
      },
    ];
  }).slice(0, TEMPERA_MAX_LAYER_IMAGES);
};
const resolve = (values, base) => ({
  cameraIntensity: numberWithin(values.cameraIntensity, base.cameraIntensity, 0, 2),
  glyphMotion: numberWithin(values.glyphMotion, base.glyphMotion, 0, 2),
  wholeLineLyrics: switchOr(values.wholeLineLyrics, base.wholeLineLyrics),
  glyphSettleStretch: numberWithin(values.glyphSettleStretch, base.glyphSettleStretch, 0, 1),
  colorMode:
    values.colorMode === 'duo' || values.colorMode === 'mono' || values.colorMode === 'gradient'
      ? values.colorMode
      : base.colorMode,
  textInversion: switchOr(values.textInversion, base.textInversion),
  layerImages: values.layerImages ? sanitizeLayerImages(values.layerImages) : base.layerImages,
  layerImageDepth:
    values.layerImageDepth === 'front' || values.layerImageDepth === 'back'
      ? values.layerImageDepth
      : base.layerImageDepth,
  layerImageFrequency: numberWithin(values.layerImageFrequency, base.layerImageFrequency, 0, 1),
  showBlocks: switchOr(values.showBlocks, base.showBlocks),
  showDecor: switchOr(values.showDecor, base.showDecor),
  showCornerMarks: switchOr(values.showCornerMarks, base.showCornerMarks),
  enableTransitions: switchOr(values.enableTransitions, base.enableTransitions),
  textureResolution: numberWithin(values.textureResolution, base.textureResolution, 0.5, 4),
  postProcessEnabled: switchOr(values.postProcessEnabled, base.postProcessEnabled),
  postProcessTextureCompression: switchOr(
    values.postProcessTextureCompression,
    base.postProcessTextureCompression
  ),
  postProcessGrain: numberWithin(values.postProcessGrain, base.postProcessGrain, 0, 1),
  postProcessContrast: numberWithin(values.postProcessContrast, base.postProcessContrast, 0, 1),
  postProcessRgbShift: numberWithin(values.postProcessRgbShift, base.postProcessRgbShift, 0, 1),
  postProcessVignette: numberWithin(values.postProcessVignette, base.postProcessVignette, 0, 2),
  postProcessLensDistortion: numberWithin(
    values.postProcessLensDistortion,
    base.postProcessLensDistortion,
    0,
    2
  ),
});
const resolveStoredTemperaTuning = (stored) => resolve(stored, DEFAULT_TEMPERA_TUNING);
function tuning(settings = {}) {
  const input = {};
  for (const key of Object.keys(DEFAULT_TEMPERA_TUNING))
    input[key] = settings['tempera' + key[0].toUpperCase() + key.slice(1)];
  return resolveStoredTemperaTuning(input);
}
export {
  DEFAULT_TEMPERA_LAYER_IMAGE,
  DEFAULT_TEMPERA_TUNING,
  TEMPERA_MAX_LAYER_IMAGES,
  resolveStoredTemperaTuning,
  tuning,
};
