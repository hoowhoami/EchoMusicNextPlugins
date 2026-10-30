// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { resolveSonnetAnimationScale } from './sonnetMotion.mjs';
import { createSonnetLensFilter } from './sonnetLensFilter.mjs';
import { createSonnetPrintFilters } from './sonnetPrintFilters.mjs';
const NO_PRINT_EFFECTS = {
    rgbShift: 0,
    halftone: 0,
    vignette: 0,
  },
  resolveSonnetPostProcessProfile = (theme, tuning, staticMode) => {
    if (staticMode)
      return {
        glowStrength: 0,
        glowAlpha: 0,
        noise: 0,
        contrast: 0,
        glitchIntensity: 0,
        lensDistortion: 0,
        lensDispersion: 0,
        printEffects: NO_PRINT_EFFECTS,
      };
    const motion = tuning.typographyMotion * resolveSonnetAnimationScale(theme),
      postEnabled = tuning.postProcessEnabled;
    return {
      glowStrength: 2.8 + motion * 1.8,
      glowAlpha: Math.min(0.62, 0.28 + motion * 0.12),
      noise: postEnabled ? tuning.postProcessGrain * 0.35 : 0,
      contrast: postEnabled ? tuning.postProcessContrast * 0.5 : 0,
      glitchIntensity: 1,
      lensDistortion: postEnabled ? tuning.postProcessLensDistortion : 0,
      lensDispersion: postEnabled ? tuning.postProcessLensDispersion : 0,
      printEffects: postEnabled
        ? {
            rgbShift: tuning.postProcessRgbShift,
            halftone: tuning.postProcessHalftone,
            vignette: tuning.postProcessVignette,
          }
        : NO_PRINT_EFFECTS,
    };
  },
  createSonnetHaloLayer = (pixi, profile) => {
    const layer = new pixi.Container(),
      filters = [];
    if (profile.glowStrength > 0) {
      const blur = new pixi.BlurFilter({
        strength: profile.glowStrength,
        quality: 2,
        kernelSize: 5,
        resolution: 0.75,
      });
      ((layer.filters = [blur]),
        (layer.alpha = profile.glowAlpha),
        (layer.blendMode = 'screen'),
        filters.push(blur));
    }
    return { layer, filters };
  },
  createSonnetPostProcessFilters = (pixi, amounts, seed) => {
    const filters = [];
    if (
      ((amounts.lensDistortion > 0 || amounts.lensDispersion > 0) &&
        filters.push(
          createSonnetLensFilter(pixi, {
            distortion: amounts.lensDistortion,
            dispersion: amounts.lensDispersion,
          })
        ),
      amounts.noise > 0)
    ) {
      const noise = new pixi.NoiseFilter({
        noise: amounts.noise,
        seed: (seed % 1e4) / 1e4,
        antialias: 'on',
      });
      filters.push(noise);
    }
    if (amounts.contrast > 0) {
      const colorMatrix = new pixi.ColorMatrixFilter();
      (colorMatrix.contrast(amounts.contrast, !1),
        (colorMatrix.antialias = 'on'),
        filters.push(colorMatrix));
    }
    const printFilters = createSonnetPrintFilters(pixi, amounts.printEffects);
    return (printFilters.length > 0 && filters.push(...printFilters), filters);
  },
  applySonnetScenePostProcess = (pixi, container, profile, seed) => {
    const filters = createSonnetPostProcessFilters(pixi, profile, seed);
    return (filters.length > 0 && (container.filters = filters), filters);
  };
export {
  applySonnetScenePostProcess,
  createSonnetHaloLayer,
  createSonnetPostProcessFilters,
  resolveSonnetPostProcessProfile,
};
