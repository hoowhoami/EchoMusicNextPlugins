// Pinned Folia quality math; only the host configuration projection is local.
import {
  normalizeLyricRenderQuality,
  normalizeLyricRenderOverride,
  resolveLyricRenderQuality,
  resolveLyricPixelRatio,
  resolveLyricAntialias,
} from '../styles/hanabi/source/_shared/utils/lyricRenderQuality.mjs';
export { resolveLyricPixelRatio };
export function colorAttachmentBytes(width, height, samples = 1) {
  return Math.round(width) * Math.round(height) * 4 * (samples > 1 ? samples + 1 : 1);
}
export function globalQuality(settings) {
  return normalizeLyricRenderQuality({
    scale: settings.globalRenderScale,
    antialias: settings.globalAntialias,
  });
}
export function styleQuality(settings, mode, base, styleDefault = false) {
  const override = normalizeLyricRenderOverride({
    scale: settings[mode + 'RenderScale'],
    antialias: settings[mode + 'Antialias'],
  });
  const quality = resolveLyricRenderQuality(globalQuality(settings), override);
  return Object.assign({}, quality, {
    pixelRatio: resolveLyricPixelRatio(base, quality.scale),
    antialiasEnabled: resolveLyricAntialias(quality.antialias, styleDefault),
  });
}
