// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { snapResolutionToTexturePool } from './pixiTextureBudget.mjs';
const LUMIERE_QUALITY_PROFILES = {
  full: { graphicsScale: 1, maxFogOctaves: 6, moteScale: 1 },
  balanced: { graphicsScale: 0.7, maxFogOctaves: 4, moteScale: 1 },
  low: { graphicsScale: 0.5, maxFogOctaves: 3, moteScale: 0.6 },
};
const LUMIERE_MAX_RENDER_RESOLUTION = 2;
const resolveLumiereRenderResolution = (devicePixelRatio) => {
  const ratio =
    typeof devicePixelRatio === 'number' && Number.isFinite(devicePixelRatio)
      ? devicePixelRatio
      : 1;
  return Math.min(LUMIERE_MAX_RENDER_RESOLUTION, Math.max(1, ratio));
};
const resolveLumiereGraphicsResolution = (width, height, renderResolution, quality) => {
  const { graphicsScale } = LUMIERE_QUALITY_PROFILES[quality];
  if (graphicsScale >= 1) return renderResolution;
  return snapResolutionToTexturePool(width, height, renderResolution * graphicsScale);
};
const resolveLumiereBloomLevelDrop = (renderResolution, graphicsResolution) =>
  graphicsResolution > 0 && graphicsResolution < renderResolution
    ? Math.max(0, Math.round(Math.log2(renderResolution / graphicsResolution)))
    : 0;
const toLumiereSceneTuning = (tuning, context) => {
  var _a;
  const profile =
    (_a = LUMIERE_QUALITY_PROFILES[tuning.renderQuality]) != null
      ? _a
      : LUMIERE_QUALITY_PROFILES.full;
  return {
    lightIntensity: tuning.lightIntensity,
    audioResponse: tuning.audioResponse,
    fogDensity: tuning.fogDensity,
    darkField: tuning.darkField,
    moteAmount: tuning.moteAmount * profile.moteScale,
    bloom: tuning.bloom,
    textBloom: tuning.textBloom,
    unlitOpacity: tuning.unlitOpacity,
    windowNeighbors: tuning.windowNeighbors,
    decay: tuning.decay,
    echo: context.showText ? tuning.echo : 0,
    fogOctaves: Math.min(tuning.fogOctaves, profile.maxFogOctaves),
    lineArt: tuning.lineArt,
    frontBokeh: tuning.frontBokeh,
    trails: tuning.trails,
    hideTrails: tuning.hideTrails,
    overlayFrame: tuning.overlayFrame,
    textOnly: tuning.textOnly,
    keywordColors: tuning.keywordColors,
    themeIcons: tuning.themeIcons,
    themeColorMix: tuning.themeColorMix,
  };
};
const LUMIERE_LIVE_SCENE_KEYS = [
  'lightIntensity',
  'audioResponse',
  'fogDensity',
  'darkField',
  'unlitOpacity',
  'fogOctaves',
  'hideTrails',
];
const LUMIERE_COMPILE_KEYS = ['seamlessTransitions'];
const resolveLumiereCompileOptions = (tuning) => ({ seamless: tuning.seamlessTransitions });
const crossesZero = (previous, next) => previous > 0 !== next > 0;
const requiresLumiereSceneRebuild = (previous, next) =>
  previous.moteAmount !== next.moteAmount ||
  previous.windowNeighbors !== next.windowNeighbors ||
  previous.decay !== next.decay ||
  previous.echo !== next.echo ||
  previous.lineArt !== next.lineArt ||
  previous.frontBokeh !== next.frontBokeh ||
  previous.trails !== next.trails ||
  previous.textOnly !== next.textOnly ||
  previous.keywordColors !== next.keywordColors ||
  previous.themeIcons !== next.themeIcons ||
  previous.themeColorMix !== next.themeColorMix ||
  crossesZero(previous.bloom, next.bloom) ||
  crossesZero(previous.textBloom, next.textBloom);
export {
  LUMIERE_COMPILE_KEYS,
  LUMIERE_LIVE_SCENE_KEYS,
  LUMIERE_MAX_RENDER_RESOLUTION,
  LUMIERE_QUALITY_PROFILES,
  requiresLumiereSceneRebuild,
  resolveLumiereBloomLevelDrop,
  resolveLumiereCompileOptions,
  resolveLumiereGraphicsResolution,
  resolveLumiereRenderResolution,
  toLumiereSceneTuning,
};
