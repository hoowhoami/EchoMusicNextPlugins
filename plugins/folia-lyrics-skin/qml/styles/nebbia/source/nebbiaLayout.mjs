// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaLayout.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
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
import { clamp } from './nebbiaConstants.mjs';
import {
  assignRoles,
  makeBlocks,
  mergeWords,
  ROLE_SCALE,
  ROLE_SCALE_FAST,
} from './nebbiaBlocks.mjs';
import { COMPOSITION_BIAS, COMPOSITIONS, SIMPLE_COMPOSITIONS } from './nebbiaCompositions.mjs';
import {
  createVisualizerRng,
  hashVisualizerSeed,
} from './_shared/components/visualizer/visualizerSeedHash.mjs';
const LINGER_WEIGHT = 0.03;
const bboxOf = (items) => {
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (const it of items) {
    x0 = Math.min(x0, it.x - it.s / 2);
    x1 = Math.max(x1, it.x + it.s / 2);
    y0 = Math.min(y0, it.y - it.s / 2);
    y1 = Math.max(y1, it.y + it.s / 2);
  }
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
};
const overlapArea = (a, b) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) *
  Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const layoutNebbiaSong = (lines, opts) => {
  const { W, H, jitter, layouts, fontScale, visibleUntil, fogAt, lingerUntil } = opts;
  const mx = W * 0.05,
    my = H * 0.07;
  const Smin = Math.max(26, H * 0.065) * fontScale,
    Smax = H * 0.14 * fontScale;
  const placed = [];
  const recent = [];
  let prev = null;
  let titleBox = null;
  const creditsCandidate = (ctx, kind) => {
    var _a;
    const res =
      (_a = kind === 'title' ? null : COMPOSITIONS.ribbon(ctx)) != null ? _a : pickWide(ctx);
    const bb = bboxOf(res.items);
    const cap = kind === 'title' ? Smax * 1.15 : Smax * 0.55;
    const S = Math.min(cap, ((W - mx * 2) * 0.8) / bb.w, (H * 0.32) / bb.h);
    const bw = bb.w * S,
      bh = bb.h * S;
    const cy = kind === 'title' || !titleBox ? H * 0.42 : titleBox.y1 + bh / 2 + S * 0.6;
    const box = { x0: W / 2 - bw / 2, x1: W / 2 + bw / 2, y0: cy - bh / 2, y1: cy + bh / 2 };
    if (kind === 'title') titleBox = box;
    return { score: 0, name: 'ribbon', items: res.items, bb, S, cx: W / 2, cy, box };
  };
  const pickWide = (ctx) => {
    var _a;
    const one = COMPOSITIONS.ribbon(ctx),
      bb = bboxOf(one.items);
    const fits = Math.min(Smax * 1.15, ((W - mx * 2) * 0.8) / bb.w) >= Smin;
    return (_a = fits ? null : COMPOSITIONS.lines2(ctx)) != null ? _a : one;
  };
  return lines.map((line, li) => {
    var _a, _b, _c;
    const { chars } = line;
    const rnd = createVisualizerRng(
      (hashVisualizerSeed(chars.map((c) => c.ch).join('')) + li * 7919) >>> 0,
    );
    const visible = chars.filter((c) => c.ch.trim());
    const fast = visible.length > 0 && (line.end - line.t) / visible.length < 0.22;
    const words = mergeWords(chars, line.words);
    if (!words.length) return chars.map(() => ({ x: W / 2, y: H / 2, s: Smin, rot: 0 }));
    const roles = assignRoles(chars, words);
    const RS = fast ? ROLE_SCALE_FAST : ROLE_SCALE;
    const busy = placed
      .filter((p) => p.linger > line.t - 0.3)
      .map((p) => ({
        box: p.box,
        w:
          p.until <= line.t - 0.3
            ? LINGER_WEIGHT
            : line.t <= p.fogAt
              ? 1
              : 0.6 + 0.4 * clamp((p.until - line.t) / Math.max(1e-3, p.until - p.fogAt)),
      }));
    let best = line.credits
      ? creditsCandidate(
          {
            blocks: makeBlocks(
              chars,
              words,
              words.map(() => 'support'),
              ROLE_SCALE,
              9,
            ),
            h: 0,
            chars,
          },
          line.credits,
        )
      : null;
    if (!best)
      for (const maxBlocks of [5, 7]) {
        const blocks = makeBlocks(chars, words, roles, RS, maxBlocks);
        const ctx = {
          blocks,
          h: Math.max(
            0,
            blocks.findIndex((b) => b.role === 'hero'),
          ),
          chars,
        };
        for (const name of Object.keys(COMPOSITIONS)) {
          if (!layouts.includes(name)) continue;
          const res = COMPOSITIONS[name](ctx);
          if (!res || !res.items.length) continue;
          const bb2 = bboxOf(res.items);
          const maxH = H * (name === 'ribbon' ? 0.28 : 0.5),
            maxW = (W - mx * 2) * (SIMPLE_COMPOSITIONS.has(name) ? 0.94 : 0.68);
          const Sfit = Math.min(maxW / bb2.w, maxH / bb2.h, Smax);
          if (Sfit < Smin * 0.75) continue;
          for (const S2 of [Sfit, Sfit * 0.8, Sfit * 0.64, Sfit * 0.5].filter(
            (v, i) => i === 0 || v >= Smin * 0.75,
          )) {
            const bw = bb2.w * S2,
              bh = bb2.h * S2;
            for (const fx of [0.5, 0.3, 0.7])
              for (const fy of [0.25, 0.42, 0.58, 0.75]) {
                const cx2 = clamp(fx * W, mx + bw / 2, W - mx - bw / 2),
                  cy2 = clamp(fy * H, my + bh / 2, H - my - bh / 2);
                const box = {
                  x0: cx2 - bw / 2,
                  x1: cx2 + bw / 2,
                  y0: cy2 - bh / 2,
                  y1: cy2 + bh / 2,
                };
                const pad = S2 * 0.3,
                  padBox = {
                    x0: box.x0 - pad,
                    x1: box.x1 + pad,
                    y0: box.y0 - pad,
                    y1: box.y1 + pad,
                  };
                let score = 0;
                for (const b of busy) score += (overlapArea(padBox, b.box) / (bw * bh)) * 1e3 * b.w;
                score -= (S2 / H) * 100;
                if (S2 < Smin) score += 40 + ((Smin - S2) / Smin) * 200;
                score += COMPOSITION_BIAS[name];
                score += res.vRot * (fast ? 10 : 4);
                if (fast && !SIMPLE_COMPOSITIONS.has(name)) score += 6;
                if (maxBlocks === 7 && blocks.length <= 5) score += 100;
                const rep = recent.lastIndexOf(name);
                if (rep >= 0) score += [18, 9, 4][recent.length - 1 - rep];
                if (
                  prev &&
                  Math.abs(prev.cx - cx2) < W * 0.08 &&
                  Math.abs(prev.cy - cy2) < H * 0.08
                )
                  score += 8;
                score += (Math.abs(cy2 - H * 0.5) / H) * 8;
                score += rnd() * 8;
                if (!best || score < best.score)
                  best = { score, name, items: res.items, bb: bb2, S: S2, cx: cx2, cy: cy2, box };
              }
          }
        }
      }
    if (!best) {
      const blocks = makeBlocks(chars, words, roles, ROLE_SCALE_FAST, 9);
      const ctx = { blocks, h: 0, chars };
      const res =
        (_b = (_a = COMPOSITIONS.lines3(ctx)) != null ? _a : COMPOSITIONS.lines2(ctx)) != null
          ? _b
          : COMPOSITIONS.ribbon(ctx);
      const bb2 = bboxOf(res.items);
      const S2 = Math.min(Smax, (W - mx * 2) / bb2.w, (H - my * 2) / bb2.h);
      best = {
        score: 0,
        name: 'lines3',
        items: res.items,
        bb: bb2,
        S: S2,
        cx: W / 2,
        cy: H / 2,
        box: {
          x0: W / 2 - (bb2.w * S2) / 2,
          x1: W / 2 + (bb2.w * S2) / 2,
          y0: H / 2 - (bb2.h * S2) / 2,
          y1: H / 2 + (bb2.h * S2) / 2,
        },
      };
    }
    const chosen = best;
    placed.push({
      box: chosen.box,
      until: visibleUntil(li),
      fogAt: fogAt(li),
      linger: Math.max(
        visibleUntil(li),
        (_c = lingerUntil == null ? void 0 : lingerUntil(li)) != null ? _c : 0,
      ),
    });
    recent.push(chosen.name);
    if (recent.length > 3) recent.shift();
    prev = chosen;
    const { bb, S, cx, cy } = chosen;
    const tilt = (rnd() - 0.5) * 0.04 * jitter;
    const byK = new Map(chosen.items.map((it) => [it.k, it]));
    let lastPos = { x: cx, y: cy, s: S, rot: 0 };
    return chars.map((_, k) => {
      const it = byK.get(k);
      if (!it) return __spreadProps(__spreadValues({}, lastPos), { rot: 0 });
      const x = cx + (it.x - (bb.x0 + bb.x1) / 2) * S,
        y0 = cy + (it.y - (bb.y0 + bb.y1) / 2) * S;
      const s = it.s * S * (1 + (rnd() - 0.5) * 0.08 * jitter);
      lastPos = {
        x: x + (rnd() - 0.5) * S * 0.04 * jitter,
        y: y0 + (x - cx) * tilt + (rnd() - 0.5) * S * 0.05 * jitter,
        s,
        rot: it.rot + (rnd() - 0.5) * 0.08 * jitter + tilt,
      };
      return lastPos;
    });
  });
};
export { layoutNebbiaSong };
