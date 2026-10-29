// Stage values only. Full scene and timing decisions remain in the original modules.
import { DEFAULT_LUMIERE_TUNING } from './source/app-defaults.mjs';
import { normalizeLumiereTuning } from './source/lumiereTuning.mjs';
import { resolveLumiereRenderResolution } from './source/lumiereRuntimeTuning.mjs';
export { decideSongCommit, isInstrumentalConfirmed } from './source/songHandover.mjs';
export function tuning(settings) {
  const input = {};
  for (const key of Object.keys(DEFAULT_LUMIERE_TUNING)) {
    const flat = 'lumiere' + key[0].toUpperCase() + key.slice(1);
    if (settings[flat] !== undefined) input[key] = settings[flat];
  }
  return normalizeLumiereTuning(input);
}
function cssColor(value) {
  return value && typeof value.r === 'number'
    ? 'rgba(' +
        Math.round(value.r * 255) +
        ',' +
        Math.round(value.g * 255) +
        ',' +
        Math.round(value.b * 255) +
        ',' +
        value.a +
        ')'
    : String(value);
}
export function theme(
  settings,
  baseFamily,
  primary,
  secondary,
  accent,
  background,
  lyricsIcons = []
) {
  return {
    primaryColor: cssColor(primary),
    secondaryColor: cssColor(secondary),
    accentColor: cssColor(accent),
    backgroundColor: cssColor(background),
    fontFamily: baseFamily,
    fontWeight: Number.isFinite(settings.fontWeight) ? settings.fontWeight : null,
    wordColors: settings.wordColors || [],
    lyricsIcons: Array.from(lyricsIcons),
    animationIntensity: ['calm', 'normal', 'chaotic'].includes(settings.animationIntensity)
      ? settings.animationIntensity
      : 'normal',
  };
}
export function viewport(width, height, devicePixelRatio) {
  const logicalWidth = Math.max(320, width),
    logicalHeight = Math.max(240, height),
    resolution = resolveLumiereRenderResolution(devicePixelRatio),
    physicalWidth = Math.round(logicalWidth * resolution),
    physicalHeight = Math.round(logicalHeight * resolution),
    raster = logicalWidth !== width || logicalHeight !== height || resolution !== devicePixelRatio;
  return {
    width: logicalWidth,
    height: logicalHeight,
    resolution,
    physicalWidth,
    physicalHeight,
    raster,
    rasterBytes: raster ? physicalWidth * physicalHeight * 4 : 0,
    error:
      raster &&
      (physicalWidth > 8192 ||
        physicalHeight > 8192 ||
        physicalWidth * physicalHeight * 4 >= 128 * 1024 * 1024)
        ? 'Lumiere native viewport raster exceeds budget'
        : '',
  };
}
