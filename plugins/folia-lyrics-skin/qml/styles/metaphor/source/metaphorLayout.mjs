// Copyright (c) 2026 chthollyphile. Derived from Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935; AGPL-3.0-only.
// Source: src/components/visualizer/metaphor/metaphorLayout.ts
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
import { arrayAt, arrayFlatMap } from './compat.mjs';
import {
  buildLineGraphemeTimeline,
  splitLyricGraphemes,
} from '../../../shared/text/graphemeTiming.mjs';
import { segmentLyricWords, segmentTextWords } from '../../../shared/text/wordSegmentation.mjs';
const SPACE_ONLY = /^\s+$/u;
const LINE_HEIGHT = 1.14;
const buildMetaphorTokens = (line) => {
  const timeline = buildLineGraphemeTimeline(line);
  const tokens = [];
  let cursor = 0;
  for (const part of segmentLyricWords(line)) {
    const count = splitLyricGraphemes(part.segment).length;
    const chars = timeline
      .slice(cursor, cursor + count)
      .map((item) => ({ char: item.char, t0: item.startTime, t1: item.endTime }));
    cursor += count;
    if (chars.length === 0) continue;
    tokens.push({
      text: part.segment,
      chars,
      wordLike: part.isWordLike,
      space: SPACE_ONLY.test(part.segment),
    });
  }
  if (cursor < timeline.length) {
    const rest = timeline
      .slice(cursor)
      .map((item) => ({ char: item.char, t0: item.startTime, t1: item.endTime }));
    const last = arrayAt(tokens, -1);
    if (last) last.chars.push(...rest);
    else
      tokens.push({
        text: rest.map((item) => item.char).join(''),
        chars: rest,
        wordLike: true,
        space: false,
      });
  }
  return tokens;
};
const buildMetaphorTextTokens = (text, time) =>
  segmentTextWords(text)
    .map((part) => ({
      text: part.segment,
      chars: splitLyricGraphemes(part.segment).map((char) => ({ char, t0: time, t1: time })),
      wordLike: part.isWordLike,
      space: SPACE_ONLY.test(part.segment),
    }))
    .filter((token) => token.chars.length > 0);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const tokenAdvance = (token, measure) =>
  token.chars.reduce((sum, item) => sum + measure(item.char), 0);
const wrapRows = (tokens, widths, maxWidth) => {
  const rows = [];
  let row = [];
  let width = 0;
  tokens.forEach((token, index) => {
    if (row.length === 0 && token.space) return;
    if (row.length > 0 && !token.space && width + widths[index] > maxWidth) {
      rows.push(row);
      row = [];
      width = 0;
    }
    row.push(index);
    width += widths[index];
  });
  if (row.length > 0) rows.push(row);
  return rows
    .map((indices) => {
      const trimmed = [...indices];
      while (trimmed.length > 0 && tokens[trimmed[trimmed.length - 1]].space) trimmed.pop();
      return trimmed;
    })
    .filter((indices) => indices.length > 0);
};
const rowWidth = (row, widths, sizes) =>
  row.reduce((sum, index) => sum + widths[index] * sizes[index], 0);
const placeRows = (rows, input, widths, sizes, rowLeft, tokenRot) => {
  const placed = [];
  let top = 0;
  rows.forEach((row, rowIndex) => {
    const height = Math.max(...row.map((index) => sizes[index])) * LINE_HEIGHT;
    let x = rowLeft(rowWidth(row, widths, sizes), rowIndex);
    for (const index of row) {
      const width = widths[index] * sizes[index];
      placed.push({
        token: input.tokens[index],
        index,
        x,
        y: top - height / 2,
        size: sizes[index],
        rot: tokenRot(index),
        width,
      });
      x += width;
    }
    top -= height;
  });
  return placed;
};
const FLAT = () => 0;
const placeBlock = (input, widths, total) => {
  const sizes = widths.map(() => 1);
  const rows = wrapRows(input.tokens, widths, clamp(Math.sqrt(total * 2.2), 3.5, 11));
  return placeRows(rows, input, widths, sizes, (width) => -width / 2, FLAT);
};
const placeStair = (input, widths, total) => {
  const sizes = widths.map(() => 1);
  const rows = wrapRows(input.tokens, widths, clamp(Math.sqrt(total * 1.4), 3, 8));
  const step = 0.7 + input.rng() * 0.6;
  return placeRows(rows, input, widths, sizes, (_width, rowIndex) => rowIndex * step, FLAT);
};
const placeHero = (input, widths, total) => {
  const { tokens } = input;
  let hero = -1;
  tokens.forEach((token, index) => {
    if (token.wordLike && (hero < 0 || widths[index] >= widths[hero])) hero = index;
  });
  if (hero < 0) return placeBlock(input, widths, total);
  const heroSize = clamp(7 / Math.max(widths[hero], 0.5), 1.6, 3);
  const heroWidth = widths[hero] * heroSize;
  const sizes = widths.map((_, index) => (index === hero ? heroSize : 1));
  const sideWidth = Math.max(heroWidth, 4.5);
  const before = wrapRows(tokens.slice(0, hero), widths.slice(0, hero), sideWidth);
  const after = wrapRows(tokens.slice(hero + 1), widths.slice(hero + 1), sideWidth).map((row) =>
    row.map((index) => index + hero + 1),
  );
  const rows = [...before, [hero], ...after];
  return placeRows(
    rows,
    input,
    widths,
    sizes,
    (width, rowIndex) => (rowIndex <= before.length ? 0 : heroWidth - width),
    FLAT,
  );
};
const placeScatter = (input, widths, total) => {
  const sizes = input.tokens.map((token) => (token.wordLike ? 0.8 + input.rng() * 0.8 : 1));
  const scaled = widths.map((width, index) => width * sizes[index]);
  const rows = wrapRows(input.tokens, scaled, clamp(Math.sqrt(total * 2), 3.5, 9));
  const rots = input.tokens.map((token) => (token.space ? 0 : (input.rng() - 0.5) * 0.18));
  const shifts = rows.map(() => (input.rng() - 0.5) * 2.2);
  return placeRows(
    rows,
    input,
    widths,
    sizes,
    (width, rowIndex) => -width / 2 + shifts[rowIndex],
    (index) => rots[index],
  );
};
const JUSTIFY_MAX = 2.6;
const placeJustify = (input, widths, total) => {
  const rows = wrapRows(input.tokens, widths, clamp(Math.sqrt(total * 1.5), 3, 8));
  const unit = widths.map(() => 1);
  const rowWidths = rows.map((row) => rowWidth(row, widths, unit));
  const target = Math.max(...rowWidths);
  const sizes = [...unit];
  rows.forEach((row, rowIndex) => {
    const size = clamp(target / Math.max(0.5, rowWidths[rowIndex]), 1, JUSTIFY_MAX);
    for (const index of row) sizes[index] = size;
  });
  return placeRows(
    rows,
    input,
    widths,
    sizes,
    (width, rowIndex) => (rowIndex % 2 === 0 ? -target / 2 : target / 2 - width),
    FLAT,
  );
};
const COLUMN_MAX = 6;
const COLUMN_PITCH = 1.08;
const COLUMN_GAP = 1.3;
const buildMetaphorLayout = (input) => {
  const { tokens, measure, rng } = input;
  const widths = tokens.map((token) => tokenAdvance(token, measure));
  const total = widths.reduce((sum, width) => sum + width, 0);
  const glyphs = [];
  const words = [];
  const tints = tokens.map((token, index) => {
    var _a, _b;
    return token.space
      ? null
      : (_b = (_a = input.tints) == null ? void 0 : _a[index]) != null
        ? _b
        : null;
  });
  const accents = tokens.map((token, index) => {
    var _a;
    return (
      !token.space &&
      (tints[index] !== null ||
        Boolean((_a = input.isAccent) == null ? void 0 : _a.call(input, token.text.trim())))
    );
  });
  const pushWord = (slots, accent, tint = null) => {
    if (slots.length === 0) return;
    const word = words.length;
    const rect = {
      x0: Infinity,
      y0: Infinity,
      x1: -Infinity,
      y1: -Infinity,
      t0: Infinity,
      t1: -Infinity,
    };
    for (const slot of slots) {
      rect.x0 = Math.min(rect.x0, slot.x - slot.half);
      rect.x1 = Math.max(rect.x1, slot.x + slot.half);
      rect.y0 = Math.min(rect.y0, slot.y - slot.size * 0.55);
      rect.y1 = Math.max(rect.y1, slot.y + slot.size * 0.55);
      rect.t0 = Math.min(rect.t0, slot.t0);
      rect.t1 = Math.max(rect.t1, slot.t1);
      glyphs.push({
        char: slot.char,
        x: slot.x,
        y: slot.y,
        size: slot.size,
        rot: slot.rot,
        t0: slot.t0,
        t1: slot.t1,
        word,
        accent,
        tint,
        seed: rng(),
      });
    }
    words.push(rect);
  };
  if (input.composition === 'column') {
    const cells = arrayFlatMap(tokens, (token, index) =>
      token.space ? [] : token.chars.map((item) => ({ item, index })),
    );
    const columns = Math.max(1, Math.ceil(cells.length / COLUMN_MAX));
    const perColumn = Math.ceil(cells.length / columns);
    const byToken = /* @__PURE__ */ new Map();
    cells.forEach(({ item, index }, order) => {
      const column = Math.floor(order / perColumn);
      const slot = __spreadProps(__spreadValues({}, item), {
        x: -column * COLUMN_GAP,
        y: -(order % perColumn) * COLUMN_PITCH - column * 0.5,
        size: 1,
        rot: 0,
        half: 0.5,
      });
      const list = byToken.get(index);
      if (list) list.push(slot);
      else byToken.set(index, [slot]);
    });
    byToken.forEach((slots, index) => pushWord(slots, accents[index], tints[index]));
  } else {
    const place = {
      block: placeBlock,
      stair: placeStair,
      hero: placeHero,
      scatter: placeScatter,
      justify: placeJustify,
    }[input.composition];
    for (const placed of place(input, widths, total)) {
      if (placed.token.space) continue;
      const centerX = placed.x + placed.width / 2;
      const cos = Math.cos(placed.rot);
      const sin = Math.sin(placed.rot);
      let pen = placed.x;
      const slots = placed.token.chars.map((item) => {
        const advance = measure(item.char) * placed.size;
        const dx = pen + advance / 2 - centerX;
        pen += advance;
        return __spreadProps(__spreadValues({}, item), {
          x: centerX + dx * cos,
          y: placed.y + dx * sin,
          size: placed.size,
          rot: placed.rot,
          half: advance / 2,
        });
      });
      pushWord(slots, accents[placed.index], tints[placed.index]);
    }
  }
  if (words.length === 0) {
    return {
      composition: input.composition,
      glyphs,
      words,
      bounds: { x0: -1, y0: -0.5, x1: 1, y1: 0.5 },
    };
  }
  const bounds = words.reduce(
    (box, word) => ({
      x0: Math.min(box.x0, word.x0),
      y0: Math.min(box.y0, word.y0),
      x1: Math.max(box.x1, word.x1),
      y1: Math.max(box.y1, word.y1),
    }),
    { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
  );
  const cx = (bounds.x0 + bounds.x1) / 2;
  const cy = (bounds.y0 + bounds.y1) / 2;
  for (const glyph of glyphs) {
    glyph.x -= cx;
    glyph.y -= cy;
  }
  for (const word of words) {
    word.x0 -= cx;
    word.x1 -= cx;
    word.y0 -= cy;
    word.y1 -= cy;
  }
  return {
    composition: input.composition,
    glyphs,
    words,
    bounds: { x0: bounds.x0 - cx, y0: bounds.y0 - cy, x1: bounds.x1 - cx, y1: bounds.y1 - cy },
  };
};
export { buildMetaphorLayout, buildMetaphorTextTokens, buildMetaphorTokens };
