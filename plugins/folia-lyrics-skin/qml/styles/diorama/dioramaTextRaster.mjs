// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { document } from './canvas.mjs';
import * as THREE from './three.mjs';
const DIORAMA_RASTER_FONT_PX = 128,
  DEFAULT_FONT_WEIGHT = 700,
  LINE_BAND_EM = 1.4,
  GLOW_PAD_EM = 0.7,
  PLAIN_PAD_EM = 0.2,
  MAX_CANVAS_PX = 4096,
  GLOW_BLUR_EM = 0.16,
  buildDioramaFontSpec = (fontStack, fontWeight = DEFAULT_FONT_WEIGHT) =>
    `${fontWeight} ${DIORAMA_RASTER_FONT_PX}px ${fontStack}`;
let measureCtx = null;
const getMeasureCtx = () => {
    if (!measureCtx) {
      const canvas = document.createElement('canvas');
      ((canvas.width = 1), (canvas.height = 1), (measureCtx = canvas.getContext('2d')));
    }
    return measureCtx;
  },
  measureDioramaText = (text, fontSpec) => {
    const ctx = getMeasureCtx();
    return ((ctx.font = fontSpec), ctx.measureText(text).width);
  },
  makeTexture = (canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    return ((texture.anisotropy = 4), (texture.colorSpace = THREE.SRGBColorSpace), texture);
  },
  drawGlowGlyph = (ctx, text, x, y, blur) => {
    (ctx.save(), (ctx.globalCompositeOperation = 'lighter'), (ctx.fillStyle = '#ffffff'));
    const haloPass = (passBlur, alpha) => {
      ((ctx.shadowColor = `rgba(255,255,255,${alpha})`),
        (ctx.shadowBlur = passBlur),
        (ctx.shadowOffsetX = 1e4),
        (ctx.shadowOffsetY = 0),
        ctx.fillText(text, x - 1e4, y));
    };
    (haloPass(blur, 0.95),
      haloPass(blur, 0.85),
      haloPass(blur * 2, 0.55),
      haloPass(blur * 2.9, 0.3),
      ctx.restore());
  },
  rasterDioramaUnit = (text, fontSpec) => {
    const em = DIORAMA_RASTER_FONT_PX,
      pad = Math.ceil(em * GLOW_PAD_EM),
      advancePx = Math.max(1, Math.ceil(measureDioramaText(text, fontSpec))),
      canvasWidthPx = advancePx + pad * 2,
      canvasHeightPx = Math.ceil(em * LINE_BAND_EM) + pad * 2,
      drawX = pad,
      drawY = canvasHeightPx / 2,
      draw = (paint) => {
        const canvas = document.createElement('canvas');
        ((canvas.width = canvasWidthPx), (canvas.height = canvasHeightPx));
        const ctx = canvas.getContext('2d');
        return (
          (ctx.font = fontSpec),
          (ctx.textAlign = 'left'),
          (ctx.textBaseline = 'middle'),
          paint(ctx),
          makeTexture(canvas)
        );
      },
      baseTexture = draw((ctx) => {
        ((ctx.fillStyle = '#ffffff'), ctx.fillText(text, drawX, drawY));
      }),
      glowTexture = draw((ctx) => {
        drawGlowGlyph(ctx, text, drawX, drawY, em * GLOW_BLUR_EM);
      });
    return { baseTexture, glowTexture, canvasWidthPx, canvasHeightPx, advancePx };
  },
  rasterDioramaLine = (text, fontStack, fontWeight = DEFAULT_FONT_WEIGHT) => {
    let fontPx = DIORAMA_RASTER_FONT_PX,
      fontSpec = buildDioramaFontSpec(fontStack, fontWeight),
      advancePx = Math.max(1, Math.ceil(measureDioramaText(text, fontSpec)));
    const pad = Math.ceil(fontPx * PLAIN_PAD_EM);
    if (advancePx + pad * 2 > MAX_CANVAS_PX) {
      const shrink = (MAX_CANVAS_PX - pad * 2) / advancePx;
      ((fontPx = Math.max(24, Math.floor(fontPx * shrink))),
        (fontSpec = `${fontWeight} ${fontPx}px ${fontStack}`),
        (advancePx = Math.max(1, Math.ceil(measureDioramaText(text, fontSpec)))));
    }
    const canvasWidthPx = advancePx + pad * 2,
      canvasHeightPx = Math.ceil(fontPx * LINE_BAND_EM) + pad * 2,
      canvas = document.createElement('canvas');
    ((canvas.width = canvasWidthPx), (canvas.height = canvasHeightPx));
    const ctx = canvas.getContext('2d');
    return (
      (ctx.font = fontSpec),
      (ctx.textAlign = 'left'),
      (ctx.textBaseline = 'middle'),
      (ctx.fillStyle = '#ffffff'),
      ctx.fillText(text, pad, canvasHeightPx / 2),
      { texture: makeTexture(canvas), canvasWidthPx, canvasHeightPx, advancePx, fontPx }
    );
  };
function clearDioramaMeasureContext() {
  measureCtx = null;
}
export {
  DIORAMA_RASTER_FONT_PX,
  buildDioramaFontSpec,
  clearDioramaMeasureContext,
  measureDioramaText,
  rasterDioramaLine,
  rasterDioramaUnit,
};
