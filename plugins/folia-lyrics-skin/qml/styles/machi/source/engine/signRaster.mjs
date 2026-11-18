// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/signRaster.ts
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
} from '../../environment.mjs';
import {
  arrayAt,
  arrayFlatMap,
  arrayFlat,
  trimStart,
  trimEnd,
  fromEntries,
} from '../../compat.mjs';
import { resolveLucideIconNode } from '../../icons.mjs';
import { lucideIconPath2d } from '../../icons.mjs';
const MACHI_REFERENCE_PX = 100;
const fontSpec = (font, px) => `${font.weight} ${px.toFixed(1)}px ${font.stack}`;
let measureContext = null;
const createMachiMeasure = (font) => {
  if (!measureContext) measureContext = document.createElement('canvas').getContext('2d');
  const cache = /* @__PURE__ */ new Map();
  const spec = fontSpec(font, MACHI_REFERENCE_PX);
  return (text) => {
    if (!text) return 0;
    let width = cache.get(text);
    if (width === void 0) {
      measureContext.font = spec;
      width = measureContext.measureText(text).width;
      if (cache.size > 4e3) cache.clear();
      cache.set(text, width);
    }
    return width;
  };
};
const createCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
const context2d = (canvas) => canvas.getContext('2d');
const drawIcon = (context, name, fallbacks, x, y, size, color, lineWidth = 2.2) => {
  const node = [name, ...fallbacks]
    .map((candidate) => (candidate ? resolveLucideIconNode(candidate) : null))
    .find(Boolean);
  context.save();
  context.translate(x, y);
  context.scale(size / 24, size / 24);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  if (node) context.stroke(lucideIconPath2d(node));
  else {
    context.beginPath();
    context.arc(12, 12, 8, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
};
const strokeNeonText = (context, text, x, y, color, glow) => {
  context.shadowColor = color;
  context.shadowBlur = glow;
  context.strokeStyle = color;
  context.lineWidth = glow * 0.45;
  context.strokeText(text, x, y);
  context.shadowBlur = glow * 0.4;
  context.strokeStyle = '#ffffff';
  context.lineWidth = glow * 0.14;
  context.strokeText(text, x, y);
  context.shadowBlur = 0;
};
const fitFont = (context, font, text, maxWidth, maxPx, minPx = 8) => {
  let px = maxPx;
  context.font = fontSpec(font, px);
  const width = context.measureText(text).width;
  if (width > maxWidth) px = Math.max(minPx, (px * maxWidth) / width);
  context.font = fontSpec(font, px);
  return px;
};
const wrapText = (context, text, maxWidth, maxLines) => {
  var _a;
  const units =
    (_a = text.match(
      /[\u{2e80}-\u{2e99}\u{2e9b}-\u{2ef3}\u{2f00}-\u{2fd5}\u{3005}\u{3007}\u{3021}-\u{3029}\u{3038}-\u{303b}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{f900}-\u{fa6d}\u{fa70}-\u{fad9}\u{16fe2}-\u{16fe3}\u{16ff0}-\u{16ff6}\u{20000}-\u{2a6df}\u{2a700}-\u{2b81d}\u{2b820}-\u{2cead}\u{2ceb0}-\u{2ebe0}\u{2ebf0}-\u{2ee5d}\u{2f800}-\u{2fa1d}\u{30000}-\u{3134a}\u{31350}-\u{33479}\u{3041}-\u{3096}\u{309d}-\u{309f}\u{1b001}-\u{1b11f}\u{1b132}\u{1b150}-\u{1b152}\u{1f200}\u{30a1}-\u{30fa}\u{30fd}-\u{30ff}\u{31f0}-\u{31ff}\u{32d0}-\u{32fe}\u{3300}-\u{3357}\u{ff66}-\u{ff6f}\u{ff71}-\u{ff9d}\u{1aff0}-\u{1aff3}\u{1aff5}-\u{1affb}\u{1affd}-\u{1affe}\u{1b000}\u{1b120}-\u{1b122}\u{1b155}\u{1b164}-\u{1b167}\u{1100}-\u{11ff}\u{302e}-\u{302f}\u{3131}-\u{318e}\u{3200}-\u{321e}\u{3260}-\u{327e}\u{a960}-\u{a97c}\u{ac00}-\u{d7a3}\u{d7b0}-\u{d7c6}\u{d7cb}-\u{d7fb}\u{ffa0}-\u{ffbe}\u{ffc2}-\u{ffc7}\u{ffca}-\u{ffcf}\u{ffd2}-\u{ffd7}\u{ffda}-\u{ffdc}]|[^\s\u{2e80}-\u{2e99}\u{2e9b}-\u{2ef3}\u{2f00}-\u{2fd5}\u{3005}\u{3007}\u{3021}-\u{3029}\u{3038}-\u{303b}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{f900}-\u{fa6d}\u{fa70}-\u{fad9}\u{16fe2}-\u{16fe3}\u{16ff0}-\u{16ff6}\u{20000}-\u{2a6df}\u{2a700}-\u{2b81d}\u{2b820}-\u{2cead}\u{2ceb0}-\u{2ebe0}\u{2ebf0}-\u{2ee5d}\u{2f800}-\u{2fa1d}\u{30000}-\u{3134a}\u{31350}-\u{33479}\u{3041}-\u{3096}\u{309d}-\u{309f}\u{1b001}-\u{1b11f}\u{1b132}\u{1b150}-\u{1b152}\u{1f200}\u{30a1}-\u{30fa}\u{30fd}-\u{30ff}\u{31f0}-\u{31ff}\u{32d0}-\u{32fe}\u{3300}-\u{3357}\u{ff66}-\u{ff6f}\u{ff71}-\u{ff9d}\u{1aff0}-\u{1aff3}\u{1aff5}-\u{1affb}\u{1affd}-\u{1affe}\u{1b000}\u{1b120}-\u{1b122}\u{1b155}\u{1b164}-\u{1b167}\u{1100}-\u{11ff}\u{302e}-\u{302f}\u{3131}-\u{318e}\u{3200}-\u{321e}\u{3260}-\u{327e}\u{a960}-\u{a97c}\u{ac00}-\u{d7a3}\u{d7b0}-\u{d7c6}\u{d7cb}-\u{d7fb}\u{ffa0}-\u{ffbe}\u{ffc2}-\u{ffc7}\u{ffca}-\u{ffcf}\u{ffd2}-\u{ffd7}\u{ffda}-\u{ffdc}]+\s*|\s+/gu,
    )) != null
      ? _a
      : [];
  const lines = [];
  let current = '';
  units.forEach((unit) => {
    const next = current + unit;
    if (current && context.measureText(trimEnd(next)).width > maxWidth) {
      lines.push(trimEnd(current));
      current = trimStart(unit);
    } else current = next;
  });
  if (current.trim()) lines.push(trimEnd(current));
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && context.measureText(`${last}\u2026`).width > maxWidth)
      last = last.slice(0, -1);
    kept[maxLines - 1] = `${last}\u2026`;
    return kept;
  }
  return lines;
};
const paintMachiBoard = (canvas, paint) => {
  const context = context2d(canvas);
  const half = canvas.height / 2;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  const { layout, font } = paint;
  const scaleY = half / layout.height;
  const scaleX = canvas.width / layout.width;
  layout.rows.forEach((row, rowIndex) => {
    const px = row.fontPx;
    context.font = fontSpec(font, px * scaleX);
    row.glyphs.forEach((glyph) => {
      var _a;
      const x = glyph.x0 * scaleX;
      const y = row.centerY * scaleY;
      const keyword = paint.keywordRanges.find(
        (range) => glyph.offset >= range.startOffset && glyph.offset < range.endOffset,
      );
      context.fillStyle = paint.card && rowIndex === 0 ? paint.lit : paint.unlit;
      context.fillText(glyph.text, x, y);
      const color = paint.card
        ? rowIndex === 0
          ? paint.lit
          : paint.unlit
        : (_a = keyword == null ? void 0 : keyword.color) != null
          ? _a
          : paint.lit;
      context.fillStyle = color;
      context.fillText(glyph.text, x, y + half);
    });
  });
};
const paintMachiLedStrip = (canvas, font, text) => {
  const context = context2d(canvas);
  const { width, height } = canvas;
  context.fillStyle = '#000000';
  context.fillRect(0, 0, width, height);
  context.textBaseline = 'middle';
  context.textAlign = 'left';
  context.fillStyle = '#ffffff';
  const px = fitFont(context, font, text, width * 0.94, height * 0.78, height * 0.4);
  context.font = fontSpec(font, px);
  const used = Math.min(width, context.measureText(text).width + height * 3);
  context.fillText(text, height * 1.5, height * 0.54);
  return used;
};
export {
  MACHI_REFERENCE_PX,
  context2d,
  createCanvas,
  createMachiMeasure,
  drawIcon,
  fitFont,
  fontSpec,
  paintMachiBoard,
  paintMachiLedStrip,
  strokeNeonText,
  wrapText,
};
