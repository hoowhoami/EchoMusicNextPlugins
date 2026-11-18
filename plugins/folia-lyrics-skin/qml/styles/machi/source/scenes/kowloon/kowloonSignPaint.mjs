// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/kowloon/kowloonSignPaint.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../../environment.mjs';
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
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
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { fitFont, fontSpec, strokeNeonText } from '../../engine/signRaster.mjs';
const CJK =
  /[\u{2e80}-\u{2e99}\u{2e9b}-\u{2ef3}\u{2f00}-\u{2fd5}\u{3005}\u{3007}\u{3021}-\u{3029}\u{3038}-\u{303b}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{f900}-\u{fa6d}\u{fa70}-\u{fad9}\u{16fe2}-\u{16fe3}\u{16ff0}-\u{16ff6}\u{20000}-\u{2a6df}\u{2a700}-\u{2b81d}\u{2b820}-\u{2cead}\u{2ceb0}-\u{2ebe0}\u{2ebf0}-\u{2ee5d}\u{2f800}-\u{2fa1d}\u{30000}-\u{3134a}\u{31350}-\u{33479}\u{3041}-\u{3096}\u{309d}-\u{309f}\u{1b001}-\u{1b11f}\u{1b132}\u{1b150}-\u{1b152}\u{1f200}\u{30a1}-\u{30fa}\u{30fd}-\u{30ff}\u{31f0}-\u{31ff}\u{32d0}-\u{32fe}\u{3300}-\u{3357}\u{ff66}-\u{ff6f}\u{ff71}-\u{ff9d}\u{1aff0}-\u{1aff3}\u{1aff5}-\u{1affb}\u{1affd}-\u{1affe}\u{1b000}\u{1b120}-\u{1b122}\u{1b155}\u{1b164}-\u{1b167}\u{1100}-\u{11ff}\u{302e}-\u{302f}\u{3131}-\u{318e}\u{3200}-\u{321e}\u{3260}-\u{327e}\u{a960}-\u{a97c}\u{ac00}-\u{d7a3}\u{d7b0}-\u{d7c6}\u{d7cb}-\u{d7fb}\u{ffa0}-\u{ffbe}\u{ffc2}-\u{ffc7}\u{ffca}-\u{ffcf}\u{ffd2}-\u{ffd7}\u{ffda}-\u{ffdc}]/u;
const NEON_BACKGROUND = '#130f19';
const resolveKowloonVerticalText = (text) => {
  const compact = text.replace(/\s+/g, '');
  const glyphs = Array.from(compact);
  if (glyphs.length === 0) return { mode: 'stack', glyphs: [] };
  if (CJK.test(compact) || glyphs.length <= 7) {
    return {
      mode: 'stack',
      glyphs: glyphs.length > 8 ? [...glyphs.slice(0, 7), '\u2026'] : glyphs,
    };
  }
  return { mode: 'rotate', text: text.trim() };
};
const roundRect = (context, x, y, width, height, radius) => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
};
const paintPanel = (context, rect, style) => {
  const { x, y, width, height } = rect;
  const unit = Math.min(width, height);
  if (style.kind === 'neon') {
    context.fillStyle = NEON_BACKGROUND;
    context.fillRect(x, y, width, height);
    context.save();
    context.shadowColor = style.border;
    context.shadowBlur = unit * 0.05;
    context.strokeStyle = style.border;
    context.lineWidth = Math.max(2, unit * 0.025);
    const inset2 = unit * 0.06;
    roundRect(
      context,
      x + inset2,
      y + inset2,
      width - inset2 * 2,
      height - inset2 * 2,
      unit * 0.06,
    );
    context.stroke();
    context.restore();
    return;
  }
  context.fillStyle = style.background;
  context.fillRect(x, y, width, height);
  context.fillStyle = 'rgba(0, 0, 0, 0.16)';
  context.fillRect(x, y, width, height);
  context.strokeStyle = style.ink;
  context.globalAlpha = 0.55;
  context.lineWidth = Math.max(2, unit * 0.02);
  const inset = unit * 0.05;
  roundRect(context, x + inset, y + inset, width - inset * 2, height - inset * 2, unit * 0.04);
  context.stroke();
  context.globalAlpha = 1;
};
const writeText = (context, text, cx, cy, px, style) => {
  if (style.kind === 'neon') {
    context.save();
    context.shadowColor = style.color;
    context.shadowBlur = px * 0.25;
    context.fillStyle = style.color;
    context.fillText(text, cx, cy);
    context.restore();
    strokeNeonText(context, text, cx, cy, style.color, px * 0.07);
    return;
  }
  context.fillStyle = style.ink;
  context.fillText(text, cx, cy);
};
const paintKowloonSign = (context, rect, paint) => {
  const { x, y, width, height } = rect;
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  paintPanel(context, rect, paint.style);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const font = __spreadProps(__spreadValues({}, paint.font), { weight: 800 });
  const captionHeight = paint.caption ? Math.min(width, height) * 0.22 : 0;
  if (paint.vertical) {
    const vertical = resolveKowloonVerticalText(paint.text);
    const top = y + height * 0.07;
    const usable = height * 0.86 - captionHeight;
    if (vertical.mode === 'stack') {
      const count = Math.max(1, vertical.glyphs.length);
      const step = usable / count;
      const px = Math.min(width * 0.7, step * 0.86);
      context.font = fontSpec(font, px);
      vertical.glyphs.forEach((glyph, index) =>
        writeText(context, glyph, x + width / 2, top + step * (index + 0.5), px, paint.style),
      );
    } else {
      context.save();
      context.translate(x + width / 2, top + usable / 2);
      context.rotate(Math.PI / 2);
      const px = fitFont(context, font, vertical.text, usable * 0.94, width * 0.62);
      writeText(context, vertical.text, 0, 0, px, paint.style);
      context.restore();
    }
    if (paint.caption) {
      const px = fitFont(
        context,
        __spreadProps(__spreadValues({}, paint.font), { weight: 700 }),
        paint.caption,
        width * 0.84,
        captionHeight * 0.7,
      );
      writeText(
        context,
        paint.caption,
        x + width / 2,
        y + height * 0.93 - captionHeight / 2,
        px,
        paint.style,
      );
    }
  } else {
    const px = fitFont(context, font, paint.text, width * 0.84, height * 0.66);
    writeText(context, paint.text, x + width / 2, y + height * 0.53, px, paint.style);
  }
  context.restore();
};
const drawCocktail = (context, cx, cy, size, color) => {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = size * 0.18;
  context.strokeStyle = color;
  context.lineWidth = size * 0.07;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  const top = cy - size * 0.42;
  context.beginPath();
  context.moveTo(cx - size * 0.38, top);
  context.lineTo(cx + size * 0.38, top);
  context.lineTo(cx, cy + size * 0.05);
  context.closePath();
  context.moveTo(cx, cy + size * 0.05);
  context.lineTo(cx, cy + size * 0.38);
  context.moveTo(cx - size * 0.2, cy + size * 0.4);
  context.lineTo(cx + size * 0.2, cy + size * 0.4);
  context.stroke();
  context.beginPath();
  context.arc(cx + size * 0.08, top + size * 0.14, size * 0.07, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};
const paintKowloonBarSign = (context, rect, paint) => {
  const { x, y, width, height } = rect;
  context.save();
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.fillStyle = NEON_BACKGROUND;
  context.fillRect(x, y, width, height);
  drawCocktail(context, x + height * 0.6, y + height * 0.5, height * 0.8, paint.glass);
  const markWidth = height * 0.7;
  const markX = x + width - markWidth * 0.75;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const markPx = height * 0.36;
  context.font = fontSpec(__spreadProps(__spreadValues({}, paint.font), { weight: 800 }), markPx);
  writeText(context, '\u9152', markX, y + height * 0.29, markPx, {
    kind: 'neon',
    color: paint.mark,
    border: paint.mark,
  });
  writeText(context, '\u5427', markX, y + height * 0.71, markPx, {
    kind: 'neon',
    color: paint.mark,
    border: paint.mark,
  });
  const left = x + height * 1.15;
  const right = markX - markWidth * 0.55;
  const px = fitFont(context, paint.font, paint.title, right - left, height * 0.6);
  writeText(context, paint.title, (left + right) / 2, y + height * 0.54, px, {
    kind: 'neon',
    color: paint.neon,
    border: paint.neon,
  });
  context.restore();
};
export { paintKowloonBarSign, paintKowloonSign, resolveKowloonVerticalText };
