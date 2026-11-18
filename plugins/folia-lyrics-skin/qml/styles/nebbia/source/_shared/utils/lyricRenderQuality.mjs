// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/utils/lyricRenderQuality.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../../../environment.mjs';
const LYRIC_RENDER_QUALITY_STORAGE_KEY = 'lyric_render_quality';
const LYRIC_RENDER_SCALES = [0.5, 0.75, 1, 1.5, 2];
const LYRIC_ANTIALIAS_MODES = ['auto', 'on', 'off'];
const LYRIC_ANTIALIAS_OVERRIDES = ['global', 'on', 'off'];
const DEFAULT_LYRIC_RENDER_QUALITY = { scale: 1, antialias: 'auto' };
const DEFAULT_LYRIC_RENDER_OVERRIDE = { scale: 'global', antialias: 'global' };
const MAX_LYRIC_PIXEL_RATIO = 3;
const isLyricRenderScale = (value) => LYRIC_RENDER_SCALES.includes(value);
const normalizeLyricRenderQuality = (raw) => {
  const input = raw && typeof raw === 'object' ? raw : {};
  return {
    scale: isLyricRenderScale(input.scale) ? input.scale : DEFAULT_LYRIC_RENDER_QUALITY.scale,
    antialias: LYRIC_ANTIALIAS_MODES.includes(input.antialias)
      ? input.antialias
      : DEFAULT_LYRIC_RENDER_QUALITY.antialias,
  };
};
const normalizeLyricRenderOverride = (raw) => {
  const input = raw && typeof raw === 'object' ? raw : {};
  return {
    scale: isLyricRenderScale(input.scale) ? input.scale : 'global',
    antialias: input.antialias === 'on' || input.antialias === 'off' ? input.antialias : 'global',
  };
};
const resolveLyricRenderQuality = (global, override) => ({
  scale: override && override.scale !== 'global' ? override.scale : global.scale,
  antialias: override && override.antialias !== 'global' ? override.antialias : global.antialias,
});
const resolveLyricPixelRatio = (base, scale, max = MAX_LYRIC_PIXEL_RATIO) => {
  const safeBase = Number.isFinite(base) && base > 0 ? base : 1;
  const ratio = safeBase * scale;
  return scale > 1 ? Math.max(safeBase, Math.min(ratio, max)) : ratio;
};
const resolveLyricAntialias = (antialias, styleDefault) =>
  antialias === 'auto' ? styleDefault : antialias === 'on';
const formatLyricRenderScale = (scale) => `${scale}\xD7`;
export {
  DEFAULT_LYRIC_RENDER_OVERRIDE,
  DEFAULT_LYRIC_RENDER_QUALITY,
  LYRIC_ANTIALIAS_MODES,
  LYRIC_ANTIALIAS_OVERRIDES,
  LYRIC_RENDER_QUALITY_STORAGE_KEY,
  LYRIC_RENDER_SCALES,
  MAX_LYRIC_PIXEL_RATIO,
  formatLyricRenderScale,
  isLyricRenderScale,
  normalizeLyricRenderOverride,
  normalizeLyricRenderQuality,
  resolveLyricAntialias,
  resolveLyricPixelRatio,
  resolveLyricRenderQuality,
};
