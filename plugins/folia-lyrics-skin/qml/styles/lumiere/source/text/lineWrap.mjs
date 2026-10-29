// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
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
import { flatMap } from '../../../../shared/text/compat.mjs';
import { propertyTest } from '../../../cadenza/unicode-properties.mjs';
import { measureNaturalWidth, prepareWithSegments } from '../../../monet/pretext.mjs';
import {
  measureRichInlineStats,
  prepareRichInline,
  walkRichInlineLineRanges,
} from '../../../monet/pretext.mjs';
import { glyphFont } from './glyphLine.mjs';
const frameInsets = (width, height) => ({
  padX: Math.max(30, width * 0.065),
  padY: Math.max(30, height * 0.085),
});
const FRAME_CLEARANCE_X = 0.04;
const FRAME_CLEARANCE_TOP = 0.035;
const SUBTITLE_CLEARANCE = 0.2;
const frameBand = (width, height) => {
  const { padX, padY } = frameInsets(width, height);
  const left = padX / height + FRAME_CLEARANCE_X;
  return {
    left,
    right: width / height - left,
    top: padY / height + FRAME_CLEARANCE_TOP,
    bottom: Math.max(padY / height + FRAME_CLEARANCE_TOP + 0.2, 1 - SUBTITLE_CLEARANCE),
  };
};
const SINGLE_MIN_FIT = 0.8;
const MAX_LINES = 2;
const ROW_PITCH = 1.6;
const COLUMN_PITCH = 1.6;
const createTextMeasurer = (family, weight, letterSpacing) => {
  const cache = /* @__PURE__ */ new Map();
  const font = (px) => glyphFont(weight, px, family);
  const spacing = (px) => letterSpacing * px;
  return {
    font,
    spacing,
    natural: (text, px) => {
      const key = `${px}|${text}`;
      let width = cache.get(key);
      if (width === void 0) {
        const ls = spacing(px);
        width = measureNaturalWidth(
          prepareWithSegments(text, font(px), ls === 0 ? void 0 : { letterSpacing: ls })
        );
        cache.set(key, width);
      }
      return width;
    },
  };
};
const OPENING = /^[([{（【《「『〈〔［“‘]+$/u;
const spansOf = (glyphs, words) => {
  const isSpace = (index) => glyphs[index].char.trim().length === 0;
  const ranges = [];
  let cursor = 0;
  for (const word of words) {
    const start = Math.max(cursor, Math.min(glyphs.length, word.start));
    const end = Math.min(glyphs.length, word.end);
    for (let index = cursor; index < start; index += 1)
      ranges.push({ start: index, end: index + 1, word: false });
    if (end > start) ranges.push({ start, end, word: !word.blank });
    cursor = Math.max(cursor, end);
  }
  for (let index = cursor; index < glyphs.length; index += 1)
    ranges.push({ start: index, end: index + 1, word: false });
  const spans = [];
  for (const range of ranges) {
    let { start, end } = range;
    const lead = [];
    const tail = [];
    while (start < end && isSpace(start)) lead.push({ start, end: ++start, kind: 'space' });
    while (end > start && isSpace(end - 1))
      tail.unshift({ start: end - 1, end: end--, kind: 'space' });
    spans.push(...lead);
    if (end > start) spans.push({ start, end, kind: range.word ? 'word' : 'punct' });
    spans.push(...tail);
  }
  return spans;
};
const textOf = (glyphs, start, end) =>
  glyphs
    .slice(start, end)
    .map((glyph) => glyph.char)
    .join('');
const unitsOf = (glyphs, spans, heroPx) => {
  const pieces = [];
  const pxOf = (index) => heroPx * glyphs[index].scale;
  let pendingOpen = null;
  spans.forEach((span, index) => {
    if (span.kind === 'space') {
      if (pendingOpen)
        pieces.push({
          kind: 'unit',
          unit: {
            start: pendingOpen.start,
            end: pendingOpen.end,
            text: textOf(glyphs, pendingOpen.start, pendingOpen.end),
            px: pxOf(pendingOpen.start),
          },
        });
      pendingOpen = null;
      pieces.push({ kind: 'space', span });
      return;
    }
    const previous = pieces[pieces.length - 1];
    const next = spans[index + 1];
    if (span.kind === 'punct') {
      const text = textOf(glyphs, span.start, span.end);
      if (OPENING.test(text) && next && next.kind !== 'space') {
        pendingOpen = pendingOpen
          ? __spreadProps(__spreadValues({}, pendingOpen), { end: span.end })
          : span;
        return;
      }
      if (
        !pendingOpen &&
        (previous == null ? void 0 : previous.kind) === 'unit' &&
        previous.unit.end === span.start
      ) {
        previous.unit.end = span.end;
        return;
      }
    }
    const start = pendingOpen ? pendingOpen.start : span.start;
    pendingOpen = null;
    pieces.push({
      kind: 'unit',
      unit: {
        start,
        end: span.end,
        text: textOf(glyphs, span.start, span.end),
        px: pxOf(span.start),
      },
    });
  });
  const open = pendingOpen;
  if (open)
    pieces.push({
      kind: 'unit',
      unit: {
        start: open.start,
        end: open.end,
        text: textOf(glyphs, open.start, open.end),
        px: pxOf(open.start),
      },
    });
  return pieces;
};
const breakLines = (measurer, glyphs, pieces, advances, heroPx, lines) => {
  const extentOf = (unit) =>
    advances.slice(unit.start, unit.end).reduce((sum, advance) => sum + advance, 0);
  const items = [];
  const unitOfItem = [];
  let widest = 0;
  let widestGap = 0;
  for (const piece of pieces) {
    if (piece.kind === 'space') {
      const px = heroPx * glyphs[piece.span.start].scale;
      items.push({
        text: textOf(glyphs, piece.span.start, piece.span.end),
        font: measurer.font(px),
        letterSpacing: measurer.spacing(px),
      });
      unitOfItem.push(null);
      widestGap = Math.max(widestGap, measurer.natural('a a', px) - measurer.natural('aa', px));
      continue;
    }
    const { unit } = piece;
    const extent = extentOf(unit);
    items.push({
      text: unit.text,
      font: measurer.font(unit.px),
      letterSpacing: measurer.spacing(unit.px),
      break: 'never',
      extraWidth: extent - measurer.natural(unit.text, unit.px),
    });
    unitOfItem.push(unit);
    widest = Math.max(widest, extent);
  }
  const prepared = prepareRichInline(items);
  const walk = (maxWidth) => {
    const rows2 = [];
    walkRichInlineLineRanges(prepared, maxWidth, (line) => {
      rows2.push(line);
    });
    return rows2;
  };
  let rows = walk(Number.POSITIVE_INFINITY);
  if (lines > 1 && rows.length === 1 && rows[0].fragments.length > 1) {
    const total = rows[0].width;
    let target = (total + widest) / 2 + widestGap;
    if (measureRichInlineStats(prepared, target).lineCount > lines)
      target = total / 2 + widest + widestGap;
    rows = walk(target);
    if (rows.length > lines) {
      const kept = rows.slice(0, lines - 1);
      const rest = rows.slice(lines - 1);
      const fragments = flatMap(rest, (row2, index) =>
        row2.fragments.map((fragment, k) =>
          index > 0 && k === 0
            ? __spreadProps(__spreadValues({}, fragment), { gapBefore: widestGap })
            : fragment
        )
      );
      rows = [
        ...kept,
        {
          fragments,
          width: fragments.reduce((sum, f) => sum + f.gapBefore + f.occupiedWidth, 0),
          end: rest[rest.length - 1].end,
        },
      ];
    }
  }
  const row = new Array(glyphs.length).fill(-1);
  const offset = new Array(glyphs.length).fill(0);
  const lengths = rows.map((line) => line.width);
  rows.forEach((line, r) => {
    let cursor = 0;
    for (const fragment of line.fragments) {
      const unit = unitOfItem[fragment.itemIndex];
      const gapStart = cursor;
      cursor += fragment.gapBefore;
      if (!unit) continue;
      for (
        let index = unit.start - 1;
        index >= 0 && row[index] === -1 && glyphs[index].char.trim().length === 0;
        index -= 1
      ) {
        row[index] = r;
        offset[index] = gapStart + fragment.gapBefore / 2;
      }
      const extent = extentOf(unit);
      const ratio = extent > 0 ? fragment.occupiedWidth / extent : 0;
      let inner = cursor;
      for (let index = unit.start; index < unit.end; index += 1) {
        const advance = advances[index] * ratio;
        row[index] = r;
        offset[index] = inner + advance / 2;
        inner += advance;
      }
      cursor += fragment.occupiedWidth;
    }
  });
  for (let index = 0; index < glyphs.length; index += 1) {
    if (row[index] !== -1) continue;
    const previous = index > 0 ? index - 1 : -1;
    if (previous >= 0 && row[previous] !== -1) {
      row[index] = row[previous];
      offset[index] = offset[previous] + advances[previous] / 2;
    }
  }
  for (let index = glyphs.length - 1; index >= 0; index -= 1) {
    if (row[index] !== -1) continue;
    row[index] = index + 1 < glyphs.length && row[index + 1] !== -1 ? row[index + 1] : 0;
    offset[index] =
      index + 1 < glyphs.length ? Math.max(0, offset[index + 1] - advances[index + 1] / 2) : 0;
  }
  return { row, offset, lengths: lengths.length ? lengths : [0] };
};
const splitLongUnits = (glyphs, pieces, advances, limit, heroPx) =>
  flatMap(pieces, (piece) => {
    if (piece.kind === 'space') return [piece];
    const { unit } = piece;
    const extent = advances.slice(unit.start, unit.end).reduce((sum, advance) => sum + advance, 0);
    if (extent <= limit || unit.end - unit.start < 2) return [piece];
    const out = [];
    for (let index = unit.start; index < unit.end; index += 1) {
      const char = glyphs[index].char;
      const last = out[out.length - 1];
      if (last && last.kind === 'unit' && !propertyTest(['L', 'N']).test(char)) {
        last.unit.end = index + 1;
        continue;
      }
      out.push({
        kind: 'unit',
        unit: { start: index, end: index + 1, text: char, px: heroPx * glyphs[index].scale },
      });
    }
    return out;
  });
const flowLine = (measurer, glyphs, words, options) => {
  const { heroPx } = options;
  const spans = spansOf(glyphs, words);
  const basePieces = unitsOf(glyphs, spans, heroPx);
  const horizontal = new Array(glyphs.length).fill(0);
  for (const span of spans) {
    const px = heroPx * glyphs[span.start].scale;
    const text = textOf(glyphs, span.start, span.end);
    const width = measurer.natural(text, px);
    const canvas = glyphs
      .slice(span.start, span.end)
      .reduce((sum, glyph) => sum + glyph.advance, 0);
    for (let index = span.start; index < span.end; index += 1) {
      horizontal[index] =
        canvas > 0 ? (width * glyphs[index].advance) / canvas : width / (span.end - span.start);
    }
  }
  const vertical = glyphs.map((glyph, index) =>
    glyph.upright ? heroPx * glyph.scale * (1 + measurer.spacing(1)) : horizontal[index]
  );
  const variant = (orient, lines) => {
    const advances = orient === 0 ? horizontal : vertical;
    const pieces = splitLongUnits(
      glyphs,
      basePieces,
      advances,
      orient === 0 ? options.limits.horizontal : options.limits.vertical,
      heroPx
    );
    const { row, offset, lengths } = breakLines(measurer, glyphs, pieces, advances, heroPx, lines);
    const count = lengths.length;
    const along = Math.max(...lengths);
    const pitch = (orient === 0 ? ROW_PITCH : COLUMN_PITCH) * heroPx;
    const points = [];
    const spots = [];
    let inkX = 0;
    let inkY = 0;
    glyphs.forEach((glyph, index) => {
      const r = row[index];
      const size = heroPx * glyph.scale;
      let point;
      if (orient === 0) {
        const x = offset[index] - lengths[r] / 2;
        const rowY = (r - (count - 1) / 2) * pitch;
        point = { x, y: rowY + (1 - glyph.scale) * heroPx * 0.32 + glyph.jag };
        spots.push({ x, y: rowY });
        if (glyph.char.trim()) {
          inkX = Math.max(inkX, Math.abs(point.x) + advances[index] / 2);
          inkY = Math.max(inkY, Math.abs(point.y) + size / 2);
        }
      } else {
        const columnX = ((count - 1) / 2 - r) * pitch;
        const y = offset[index] - lengths[r] / 2;
        point = { x: columnX + glyph.jag * 0.8, y };
        spots.push({ x: columnX, y });
        if (glyph.char.trim()) {
          inkX = Math.max(inkX, Math.abs(point.x) + size / 2);
          inkY = Math.max(inkY, Math.abs(point.y) + advances[index] / 2);
        }
      }
      points.push(point);
    });
    return {
      points,
      spots,
      along,
      across: (count - 1) * pitch + heroPx,
      lines: count,
      inkWidth: inkX * 2,
      inkHeight: inkY * 2,
    };
  };
  return [
    [variant(0, 1), variant(0, MAX_LINES)],
    [variant(1, 1), variant(1, MAX_LINES)],
  ];
};
const fitScale = (along, budget, scale = 1) => Math.min(1, budget / Math.max(scale * along, 1e-6));
const shouldWrap = (flow, budget, scale) =>
  flow[1].lines > 1 && scale * flow[0].along * SINGLE_MIN_FIT > budget;
const clampInto = (center, extent, lo, hi) => {
  if (extent >= hi - lo) return (lo + hi) / 2;
  return Math.min(hi - extent / 2, Math.max(lo + extent / 2, center));
};
export {
  COLUMN_PITCH,
  MAX_LINES,
  ROW_PITCH,
  SINGLE_MIN_FIT,
  clampInto,
  createTextMeasurer,
  fitScale,
  flowLine,
  frameBand,
  frameInsets,
  shouldWrap,
};
