// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaCredits.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
import { arrayAt, arrayFlatMap, fromEntries } from '../compat.mjs';
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
const CREDITS_DELAY = 2.5;
const graphemes = (text) => {
  const seg =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? new Intl.Segmenter(void 0, { granularity: 'grapheme' })
      : null;
  return seg ? [...seg.segment(text)].map((s) => s.segment) : [...text];
};
const wordsOf = (text, chars) => {
  const starts = [];
  let offset = 0;
  for (const g of chars) {
    starts.push(offset);
    offset += g.length;
  }
  const words = [];
  const seg =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? new Intl.Segmenter(void 0, { granularity: 'word' })
      : null;
  const pieces = seg
    ? [...seg.segment(text)].map((p) => ({ at: p.index, text: p.segment }))
    : [...text.matchAll(/\S+/g)].map((m) => {
        var _a;
        return { at: (_a = m.index) != null ? _a : 0, text: m[0] };
      });
  for (const p of pieces) {
    if (!p.text.trim()) continue;
    const run = arrayFlatMap(starts, (u, i) =>
      u >= p.at && u < p.at + p.text.length && chars[i].trim() ? [i] : [],
    );
    if (run.length) words.push(run);
  }
  return words;
};
const creditLine = (text, t, credits) => {
  const gs = graphemes(text);
  const chars = gs.map((ch, i) => ({ ch, t: t + i * 0.1, d: 0.5 }));
  const last = chars[chars.length - 1];
  return {
    chars,
    words: wordsOf(text, gs),
    t,
    end: last ? last.t + last.d : t,
    next: Infinity,
    credits,
  };
};
const appendNebbiaCredits = (source, title, artist) => {
  const name = title == null ? void 0 : title.trim();
  if (!source.length || !name) return source;
  const at = Math.max(...source.map((l) => l.end)) + CREDITS_DELAY;
  const out = source.map((l, i) =>
    i === source.length - 1
      ? __spreadProps(__spreadValues({}, l), { next: Math.min(l.next, at) })
      : l,
  );
  const titleLine = creditLine(name, at, 'title');
  out.push(titleLine);
  const by = artist == null ? void 0 : artist.trim();
  if (by) {
    out.push(creditLine(by, titleLine.end + 0.2, 'artist'));
  }
  return out;
};
export { CREDITS_DELAY, appendNebbiaCredits };
