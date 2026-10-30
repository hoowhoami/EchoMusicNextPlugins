// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
export * from './sonnetProgram.mjs';
export * from './sonnetMotion.mjs';
export * from './sonnetTransitions.mjs';
export * from './sonnetGlyphLayout.mjs';
export * from './sonnetPostProcess.mjs';
const DEFAULTS = {
    cameraIntensity: 1,
    typographyMotion: 1,
    mgDensity: 1,
    showOnlyText: !1,
    showGuide: !0,
    showBackgroundMg: !0,
    showFixedGeo: !0,
    showGiantDecorativeText: !0,
    showBackgroundDecor: !0,
    enableTransitions: !0,
    outerFrameMode: 'full',
    textureResolution: 1.5,
    postProcessEnabled: !1,
    postProcessGrain: 0.2,
    postProcessContrast: 0,
    postProcessRgbShift: 0,
    postProcessHalftone: 0,
    postProcessVignette: 0.85,
    postProcessLensDistortion: 0.3,
    postProcessLensDispersion: 0.6,
  },
  numberWithin = (value, fallback, min, max) =>
    typeof value == 'number' && Number.isFinite(value)
      ? Math.max(min, Math.min(max, value))
      : fallback,
  switchOr = (value, fallback) => (typeof value == 'boolean' ? value : fallback),
  resolve = (values, base) => ({
    cameraIntensity: numberWithin(values.cameraIntensity, base.cameraIntensity, 0, 2),
    typographyMotion: numberWithin(values.typographyMotion, base.typographyMotion, 0, 2),
    mgDensity: numberWithin(values.mgDensity, base.mgDensity, 0, 2),
    showOnlyText: switchOr(values.showOnlyText, base.showOnlyText),
    showGuide: switchOr(values.showGuide, base.showGuide),
    showBackgroundMg: switchOr(values.showBackgroundMg, base.showBackgroundMg),
    showFixedGeo: switchOr(values.showFixedGeo, base.showFixedGeo),
    showGiantDecorativeText: switchOr(values.showGiantDecorativeText, base.showGiantDecorativeText),
    showBackgroundDecor: switchOr(values.showBackgroundDecor, base.showBackgroundDecor),
    enableTransitions: switchOr(values.enableTransitions, base.enableTransitions),
    outerFrameMode:
      values.outerFrameMode === 'none' ||
      values.outerFrameMode === 'frame' ||
      values.outerFrameMode === 'full'
        ? values.outerFrameMode
        : base.outerFrameMode,
    textureResolution: numberWithin(values.textureResolution, base.textureResolution, 0.5, 4),
    postProcessEnabled: switchOr(values.postProcessEnabled, base.postProcessEnabled),
    postProcessGrain: numberWithin(values.postProcessGrain, base.postProcessGrain, 0, 1),
    postProcessContrast: numberWithin(values.postProcessContrast, base.postProcessContrast, 0, 1),
    postProcessRgbShift: numberWithin(values.postProcessRgbShift, base.postProcessRgbShift, 0, 1),
    postProcessHalftone: numberWithin(values.postProcessHalftone, base.postProcessHalftone, 0, 1),
    postProcessVignette: numberWithin(values.postProcessVignette, base.postProcessVignette, 0, 2),
    postProcessLensDistortion: numberWithin(
      values.postProcessLensDistortion,
      base.postProcessLensDistortion,
      0,
      2
    ),
    postProcessLensDispersion: numberWithin(
      values.postProcessLensDispersion,
      base.postProcessLensDispersion,
      0,
      1
    ),
  });
function tuning(settings = {}) {
  const input = {};
  for (const key of Object.keys(DEFAULTS))
    input[key] = settings['sonnet' + key[0].toUpperCase() + key.slice(1)];
  return resolve(input, DEFAULTS);
}
export { DEFAULTS, tuning };
