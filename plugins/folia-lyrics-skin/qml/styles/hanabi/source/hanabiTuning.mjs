// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/hanabiTuning.ts
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
import { normalizeLyricRenderOverride } from './_shared/utils/lyricRenderQuality.mjs';
import { snapResolutionToTexturePool } from './_shared/components/visualizer/pixi/pixiTextureBudget.mjs';
import { numberWithin } from './_shared/components/visualizer/tuningDefinition.mjs';
import { DEFAULT_HANABI_TUNING } from './types.mjs';
const MAX_BASE_RESOLUTION = 2;
const resolveHanabiBaseResolution = (devicePixelRatio) =>
  Math.min(MAX_BASE_RESOLUTION, Math.max(1, devicePixelRatio || 1));
const COLOR_MODES = ['theme', 'vivid', 'mixed'];
const RENDER_QUALITIES = ['full', 'balanced', 'low'];
const normalizeHanabiTuning = (raw) => {
  const input = __spreadValues(
    __spreadValues({}, DEFAULT_HANABI_TUNING),
    raw && typeof raw === 'object' ? raw : {},
  );
  const d = DEFAULT_HANABI_TUNING;
  return {
    render: normalizeLyricRenderOverride(input.render),
    colorMode: COLOR_MODES.includes(input.colorMode) ? input.colorMode : d.colorMode,
    sparkAmount: numberWithin(input.sparkAmount, d.sparkAmount, 0, 2),
    ornamentAmount: numberWithin(input.ornamentAmount, d.ornamentAmount, 0, 2),
    textMotion: numberWithin(input.textMotion, d.textMotion, 0, 2),
    blockOpacity: numberWithin(input.blockOpacity, d.blockOpacity, 0, 1),
    riseSpeed: numberWithin(input.riseSpeed, d.riseSpeed, 0, 2),
    spin: numberWithin(input.spin, d.spin, 0, 2),
    ambient: numberWithin(input.ambient, d.ambient, 0, 2),
    glow: numberWithin(input.glow, d.glow, 0, 2),
    bloom: numberWithin(input.bloom, d.bloom, 0, 2),
    chorusBloom: numberWithin(input.chorusBloom, d.chorusBloom, 0, 2),
    launches: input.launches !== false,
    overlayFrame: input.overlayFrame !== false,
    textOnly: input.textOnly === true,
    sky: numberWithin(input.sky, d.sky, 0, 1),
    collage: numberWithin(input.collage, d.collage, 0, 2),
    renderQuality: RENDER_QUALITIES.includes(input.renderQuality)
      ? input.renderQuality
      : d.renderQuality,
  };
};
const HANABI_LIVE_KEYS = ['render', 'sky', 'overlayFrame', 'bloom', 'chorusBloom'];
const HANABI_OVERLAY_KEYS = ['overlayFrame', 'colorMode', 'textOnly'];
const requiresHanabiSceneRebuild = (previous, next) =>
  Object.keys(next).some((key) => !HANABI_LIVE_KEYS.includes(key) && previous[key] !== next[key]);
const changedHanabiKeys = (previous, next, keys) => keys.some((key) => previous[key] !== next[key]);
const HANABI_QUALITY_PROFILES = {
  full: { glowScale: 1, ambientScale: 1 },
  balanced: { glowScale: 0.7, ambientScale: 1 },
  low: { glowScale: 0.5, ambientScale: 0.6 },
};
const resolveHanabiGlowResolution = (width, height, renderResolution, quality) => {
  var _a;
  const { glowScale } =
    (_a = HANABI_QUALITY_PROFILES[quality]) != null ? _a : HANABI_QUALITY_PROFILES.full;
  if (glowScale >= 1) return renderResolution;
  return snapResolutionToTexturePool(width, height, renderResolution * glowScale);
};
const resolveHanabiGlowLevelDrop = (renderResolution, glowResolution) =>
  glowResolution > 0 && glowResolution < renderResolution
    ? Math.max(0, Math.round(Math.log2(renderResolution / glowResolution)))
    : 0;
const resolveHanabiGlowQuality = (width, height, renderResolution, quality) => {
  const resolution = resolveHanabiGlowResolution(width, height, renderResolution, quality);
  return {
    resolution: resolution < renderResolution ? resolution : null,
    levelDrop: resolveHanabiGlowLevelDrop(renderResolution, resolution),
  };
};
export {
  HANABI_OVERLAY_KEYS,
  HANABI_QUALITY_PROFILES,
  changedHanabiKeys,
  normalizeHanabiTuning,
  requiresHanabiSceneRebuild,
  resolveHanabiBaseResolution,
  resolveHanabiGlowLevelDrop,
  resolveHanabiGlowQuality,
  resolveHanabiGlowResolution,
};
