// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/boardLayout.ts
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
import { buildLineGraphemeTimeline } from '../../../../shared/text/graphemeTiming.mjs';
const MAX_ROWS = 3;
const SINGLE_ROW_FILL = 0.56;
const LINE_GAP = 1.22;
const ROW_PENALTY = [1, 0.94, 0.84];
const CJK_PATTERN =
  /[\u{2e80}-\u{2e99}\u{2e9b}-\u{2ef3}\u{2f00}-\u{2fd5}\u{3005}\u{3007}\u{3021}-\u{3029}\u{3038}-\u{303b}\u{3400}-\u{4dbf}\u{4e00}-\u{9fff}\u{f900}-\u{fa6d}\u{fa70}-\u{fad9}\u{16fe2}-\u{16fe3}\u{16ff0}-\u{16ff6}\u{20000}-\u{2a6df}\u{2a700}-\u{2b81d}\u{2b820}-\u{2cead}\u{2ceb0}-\u{2ebe0}\u{2ebf0}-\u{2ee5d}\u{2f800}-\u{2fa1d}\u{30000}-\u{3134a}\u{31350}-\u{33479}\u{3041}-\u{3096}\u{309d}-\u{309f}\u{1b001}-\u{1b11f}\u{1b132}\u{1b150}-\u{1b152}\u{1f200}\u{30a1}-\u{30fa}\u{30fd}-\u{30ff}\u{31f0}-\u{31ff}\u{32d0}-\u{32fe}\u{3300}-\u{3357}\u{ff66}-\u{ff6f}\u{ff71}-\u{ff9d}\u{1aff0}-\u{1aff3}\u{1aff5}-\u{1affb}\u{1affd}-\u{1affe}\u{1b000}\u{1b120}-\u{1b122}\u{1b155}\u{1b164}-\u{1b167}\u{1100}-\u{11ff}\u{302e}-\u{302f}\u{3131}-\u{318e}\u{3200}-\u{321e}\u{3260}-\u{327e}\u{a960}-\u{a97c}\u{ac00}-\u{d7a3}\u{d7b0}-\u{d7c6}\u{d7cb}-\u{d7fb}\u{ffa0}-\u{ffbe}\u{ffc2}-\u{ffc7}\u{ffca}-\u{ffcf}\u{ffd2}-\u{ffd7}\u{ffda}-\u{ffdc}]/u;
const STICKY_PUNCTUATION = /^[，。、！？；：,.!?;:」』）)\]】〉》…~～ー]+$/u;
const tokenize = (line) => {
  const timeline = buildLineGraphemeTimeline(line);
  const tokens = [];
  let current = null;
  let offset = 0;
  timeline.forEach((entry) => {
    const glyph = { text: entry.char, offset, startTime: entry.startTime, endTime: entry.endTime };
    offset += entry.char.length;
    const isSpace = /^\s+$/u.test(entry.char);
    const isCjk = CJK_PATTERN.test(entry.char);
    if (STICKY_PUNCTUATION.test(entry.char) && tokens.length > 0 && !current) {
      tokens[tokens.length - 1].glyphs.push(glyph);
      return;
    }
    if (isCjk) {
      if (current) tokens.push(current);
      current = null;
      tokens.push({ glyphs: [glyph] });
      return;
    }
    if (!current) current = { glyphs: [] };
    current.glyphs.push(glyph);
    if (isSpace) {
      tokens.push(current);
      current = null;
    }
  });
  if (current) tokens.push(current);
  return tokens.filter((token) => token.glyphs.length > 0);
};
const tokenText = (token) => token.glyphs.map((glyph) => glyph.text).join('');
const rowWidth = (tokens, measure) => measure(trimEnd(tokens.map(tokenText).join('')));
const splitRows = (tokens, rows, measure) => {
  if (rows <= 1 || tokens.length <= 1) return [tokens];
  const total = rowWidth(tokens, measure);
  const target = total / rows;
  const result = [];
  let current = [];
  tokens.forEach((token, index) => {
    const remainingRows = rows - result.length;
    const remainingTokens = tokens.length - index;
    const next = [...current, token];
    if (
      current.length > 0 &&
      remainingRows > 1 &&
      rowWidth(next, measure) > target * 1.04 &&
      remainingTokens >= remainingRows - 1
    ) {
      const without = rowWidth(current, measure);
      const withIt = rowWidth(next, measure);
      if (
        Math.abs(withIt - target) < Math.abs(without - target) &&
        remainingTokens > remainingRows - 1
      ) {
        result.push(next);
        current = [];
        return;
      }
      result.push(current);
      current = [token];
      return;
    }
    current = next;
  });
  if (current.length > 0) result.push(current);
  return result;
};
const layoutMachiBoardLine = (line, box, measure) => {
  const tokens = tokenize(line);
  const usableWidth = box.width * (1 - box.paddingX * 2);
  let best = null;
  for (let rows = 1; rows <= MAX_ROWS; rows += 1) {
    if (rows > tokens.length) break;
    const split = splitRows(tokens, rows, measure);
    const widest = Math.max(1, ...split.map((row) => rowWidth(row, measure)));
    const byWidth = (usableWidth / widest) * box.referencePx;
    const byHeight =
      rows === 1 ? box.height * SINGLE_ROW_FILL : (box.height * 0.86) / (split.length * LINE_GAP);
    const fontPx = Math.min(byWidth, byHeight);
    const score = fontPx * ROW_PENALTY[split.length - 1];
    if (!best || score > best.score) best = { rows: split, fontPx, score };
  }
  if (!best) return { fontPx: box.height * 0.4, rows: [], width: box.width, height: box.height };
  return placeRows(best.rows, best.fontPx, box, measure);
};
const placeRows = (rows, fontPx, box, measure) => {
  const scale = fontPx / box.referencePx;
  const lineHeight = fontPx * LINE_GAP;
  const blockHeight = lineHeight * rows.length;
  const firstCenter = box.height / 2 - blockHeight / 2 + lineHeight / 2;
  return {
    fontPx,
    width: box.width,
    height: box.height,
    rows: rows.map((tokens, rowIndex) => {
      const glyphs = arrayFlatMap(tokens, (token) => token.glyphs);
      const text = glyphs.map((glyph) => glyph.text).join('');
      const width = measure(trimEnd(text)) * scale;
      const left = (box.width - width) / 2;
      let prefix = '';
      const placed = glyphs.map((glyph) => {
        const x0 = left + measure(prefix) * scale;
        prefix += glyph.text;
        const x1 = left + measure(prefix) * scale;
        return __spreadProps(__spreadValues({}, glyph), { length: glyph.text.length, x0, x1 });
      });
      const centerY = firstCenter + rowIndex * lineHeight;
      return {
        glyphs: placed,
        fontPx,
        centerY,
        top: centerY - lineHeight / 2,
        bottom: centerY + lineHeight / 2,
      };
    }),
  };
};
const layoutMachiBoardCard = (title, subtitle, box, measure) => {
  const usableWidth = box.width * (1 - box.paddingX * 2);
  const titleFont = Math.min(
    box.height * (subtitle ? 0.4 : 0.5),
    (usableWidth / Math.max(1, measure(title))) * box.referencePx,
  );
  const subtitleFont = subtitle
    ? Math.min(titleFont * 0.52, (usableWidth / Math.max(1, measure(subtitle))) * box.referencePx)
    : 0;
  const rows = [];
  const totalHeight = titleFont * 1.15 + (subtitle ? subtitleFont * 1.4 : 0);
  let y = box.height / 2 - totalHeight / 2;
  const row = (text, fontPx) => {
    const scale = fontPx / box.referencePx;
    const width = measure(text) * scale;
    const left = (box.width - width) / 2;
    const height = fontPx * (rows.length === 0 ? 1.15 : 1.4);
    const centerY = y + height / 2;
    rows.push({
      glyphs: [
        {
          text,
          offset: 0,
          length: text.length,
          x0: left,
          x1: left + width,
          startTime: -Infinity,
          endTime: -Infinity,
        },
      ],
      fontPx,
      centerY,
      top: y,
      bottom: y + height,
    });
    y += height;
  };
  row(title, titleFont);
  if (subtitle) row(subtitle, subtitleFont);
  return { fontPx: titleFont, rows, width: box.width, height: box.height };
};
const resolveMachiBoardReveal = (layout, time) =>
  layout.rows.map((row) => {
    var _a, _b;
    let lit = (_b = (_a = row.glyphs[0]) == null ? void 0 : _a.x0) != null ? _b : 0;
    for (const glyph of row.glyphs) {
      if (time >= glyph.endTime) {
        lit = glyph.x1;
        continue;
      }
      if (time > glyph.startTime) {
        const span = Math.max(1e-3, glyph.endTime - glyph.startTime);
        lit = glyph.x0 + (glyph.x1 - glyph.x0) * Math.min(1, (time - glyph.startTime) / span);
      }
      break;
    }
    return lit;
  });
export { layoutMachiBoardCard, layoutMachiBoardLine, resolveMachiBoardReveal };
