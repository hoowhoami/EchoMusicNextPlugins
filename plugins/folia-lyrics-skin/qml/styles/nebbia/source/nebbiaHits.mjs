// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaHits.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
import { createObjectCache } from '../../../shared/objectCache.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { clamp, MASK_SCALE, smooth } from './nebbiaConstants.mjs';
import { lineRect } from './nebbiaScene.mjs';
import {
  createVisualizerRng,
  mixVisualizerSeed,
} from './_shared/components/visualizer/visualizerSeedHash.mjs';
import { VOCAL_FPS } from '../excluded-analysis.mjs';
const BUCKET = 1 / VOCAL_FPS;
const lowerBound = (sorted, v) => {
  let lo = 0,
    hi = sorted.length;
  while (lo < hi) {
    const m = (lo + hi) >> 1;
    if (sorted[m] < v) lo = m + 1;
    else hi = m;
  }
  return lo;
};
const energies = /* @__PURE__ */ createObjectCache();
const vocalEnvelopeEnergy = (env) => {
  const known = energies.get(env);
  if (known) return known;
  const { db, top, fps } = env;
  const n = db.length,
    reach = Math.round(1.5 * fps),
    floor = top - 28;
  const e = new Float32Array(n);
  const win = [];
  for (let j = 0; j < Math.min(n, reach); j += 1)
    if (db[j] > floor) win.splice(lowerBound(win, db[j]), 0, db[j]);
  for (let i = 0; i < n; i += 1) {
    if (i > 0) {
      const enter = i + reach - 1,
        leave = i - reach - 1;
      if (enter < n && db[enter] > floor) win.splice(lowerBound(win, db[enter]), 0, db[enter]);
      if (leave >= 0 && db[leave] > floor) win.splice(lowerBound(win, db[leave]), 1);
    }
    if (db[i] <= floor) continue;
    const a = win[Math.floor(win.length * 0.1)],
      b = Math.max(a + 3, win[Math.floor(win.length * 0.95)]);
    e[i] = clamp((db[i] - a) / (b - a)) ** 1.2;
  }
  energies.set(env, e);
  return e;
};
const songLoudness = (top) => clamp(2 ** ((top + 17.4) / 8), 0.5, 3);
const activeLine = (laid, t) => {
  var _a;
  return (_a = laid.find((line) => t >= line.t - 0.3 && t <= line.end + 1)) != null ? _a : null;
};
class VocalEnergy {
  constructor() {
    __publicField(this, 'floor', 0);
    __publicField(this, 'peak', 1);
    __publicField(this, 'value', 0);
  }
  update(raw, dt) {
    const k = 1 - Math.exp(-dt / 3);
    this.peak = Math.max(raw, this.peak + (raw - this.peak) * k * 0.5);
    this.floor = Math.min(raw, this.floor + (raw - this.floor) * k * 0.3);
    this.value = clamp((raw - this.floor) / Math.max(this.peak - this.floor, 8)) ** 1.2;
    return this.value;
  }
}
class NebbiaHits {
  constructor(seed) {
    __publicField(this, 'seed', seed);
    __publicField(this, 'big', []);
    __publicField(this, 'small', []);
    __publicField(this, 'lastBucket', -1);
    /** 人声轨的逐帧能量（帧 = 20 毫秒 = 一格），没有人声轨时 null。 */
    __publicField(this, 'vocal', null);
    /** 人声轨从哪一格起有（包络的 `from`），之前的格子走频段。 */
    __publicField(this, 'vocalFrom', 0);
    /** 整首的响度倍数（songLoudness），只乘人声轨的格子。 */
    __publicField(this, 'loud', 1);
  }
  /**
   * 排好整首的大雨点，W、H 是 CSS 像素，大小按 1 倍排、画的时候再乘（`draw` 的 size），拖强度滑杆不用重排。
   * 有人声轨（`env`）时砸在起音上，否则砸在词开唱处；小雨点也改用人声轨逐格的能量。
   */
  buildBig(laid, words, W, H, env = null) {
    var _a;
    this.big = [];
    this.small = [];
    this.lastBucket = -1;
    this.vocal = env && env.fps === VOCAL_FPS ? vocalEnvelopeEnergy(env) : null;
    this.vocalFrom = this.vocal ? ((_a = env == null ? void 0 : env.from) != null ? _a : 0) : 0;
    this.loud = env && this.vocal ? songLoudness(env.top) : 1;
    const rnd = createVisualizerRng(mixVisualizerSeed(this.seed, 911));
    const k = Math.min(W, H) / 720;
    const add = (t, line) => {
      const rect = line ? lineRect(line) : null;
      let x = 0,
        y = 0;
      for (let tries = 0; tries < 8; tries += 1) {
        x = W * (0.03 + 0.94 * rnd());
        y = H * (0.03 + 0.94 * rnd());
        if (!rect || x < rect.x0 - 20 || x > rect.x1 + 20 || y < rect.y0 - 20 || y > rect.y1 + 20)
          break;
      }
      const R = (7 + rnd() * 6) * k;
      const sat = Array.from({ length: 4 + Math.floor(rnd() * 5) }, () => {
        const a = rnd() * 6.28,
          d = R * (1.5 + rnd() * 1.4);
        return [Math.cos(a) * d, Math.sin(a) * d * 0.85 + R * 0.2, (1 + rnd() * 1.6) * k];
      });
      this.big.push({ t, x, y, R, big: true, sat, seed: rnd() * 100 });
    };
    const vocalStart = env && this.vocal ? this.vocalFrom / env.fps : Infinity;
    laid.forEach((line, li) => {
      var _a2;
      for (const w of (_a2 = words[li]) != null ? _a2 : []) {
        const t = line.chars[w[0]].t;
        if (t < vocalStart && rnd() < 0.6) add(t, line);
      }
    });
    if (env && this.vocal) {
      const e = this.vocal;
      for (const o of env.onsets)
        if (e[o] > 0.15 || rnd() < 0.3) add(o / env.fps, activeLine(laid, o / env.fps));
    }
    this.big.sort((a, b) => a.t - b.t);
  }
  /**
   * 补上新到的格子里的小雨点；拖进度时只补最近 life 秒。有人声轨时每格用那一格的能量，
   * 否则用这一帧播放器频段的 `energy`。
   */
  advance(T, energy, density, life, W, H) {
    const bucket = Math.floor(T / BUCKET);
    if (bucket < this.lastBucket || bucket - this.lastBucket > life / BUCKET) {
      this.small = [];
      this.lastBucket = bucket - Math.ceil(life / BUCKET);
    }
    if (density > 0) {
      const k = Math.min(W, H) / 720,
        vocal = this.vocal;
      const rateOf = (e) => (0.15 + 7 * e * e) * density * BUCKET;
      const live = rateOf(energy);
      for (let b = this.lastBucket + 1; b <= bucket; b += 1) {
        const rnd = createVisualizerRng(mixVisualizerSeed(this.seed + b, 23249));
        if (
          rnd() >=
          (vocal && (b < 0 || b >= this.vocalFrom)
            ? rateOf(b >= 0 && b < vocal.length ? vocal[b] : 0) * this.loud
            : live)
        )
          continue;
        this.small.push({
          t: (b + rnd()) * BUCKET,
          x: W * (0.03 + 0.94 * rnd()),
          y: H * (0.03 + 0.94 * rnd()),
          R: (2 + rnd() * 3.5) * k,
          big: false,
          sat: null,
          seed: rnd() * 100,
        });
      }
    }
    this.lastBucket = bucket;
    while (this.small.length && this.small[0].t < T - life) this.small.shift();
  }
  /** 画还活着的雨点：清点进遮罩，水珠进 motion。`size` 乘大雨点的半径和溅开的距离，半径不到 1 像素的不画。 */
  draw(ctx, motion, T, refog, beadHold, size) {
    const fogT = refog * 0.3,
      life = 0.4 + fogT + beadHold * 0.5 + refog;
    let lo = 0,
      hi = this.big.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (this.big[m].t < T - life) lo = m + 1;
      else hi = m;
    }
    ctx.setTransform(MASK_SCALE, 0, 0, MASK_SCALE, 0, 0);
    const one = (h, s) => {
      const R = h.R * s;
      const age = T - h.t;
      const v = 1 - smooth(clamp((age - 0.4) / fogT));
      const bv = 1 - smooth(clamp((age - 0.4 - beadHold * 0.5) / refog));
      if (h.big && v > 2e-3) {
        for (let j = 0; j < 7; j += 1) {
          const a = h.seed + j * 0.9,
            d = R * 0.3;
          const x = h.x + Math.cos(a) * d,
            y = h.y + Math.sin(a * 1.3) * d;
          ctx.moveTo(x, y);
          ctx.lineTo(x + 0.1, y);
        }
        ctx.stroke(R * 1.3, v);
      }
      if (bv > 0.01) {
        const sq = Math.exp(-age / 0.05);
        motion.put(h.x, h.y + R * 0.1, R * 0.9 * (0.6 + 0.4 * bv), bv, 1 + 0.5 * sq, 1 - 0.35 * sq);
        if (h.sat)
          for (const [dx0, dy0, r] of h.sat) {
            const out = clamp(age / 0.08),
              dx = dx0 * s,
              dy = dy0 * s;
            motion.put(h.x + dx * out, h.y + dy * out, r * (0.55 + 0.45 * bv), bv * out);
          }
      }
    };
    if (size > 0) {
      for (let i = lo; i < this.big.length && this.big[i].t <= T; i += 1)
        if (this.big[i].R * size >= 1) one(this.big[i], size);
    }
    for (const h of this.small) if (h.t <= T) one(h, 1);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  /** 排好的大雨点和还留着的小雨点（单测读）。 */
  scheduled() {
    return { big: this.big, small: this.small };
  }
  /** 一颗雨点从落下到完全消失要几秒。 */
  static lifeOf(refog, beadHold) {
    return 0.4 + refog * 0.3 + beadHold * 0.5 + refog;
  }
}
export { NebbiaHits, VocalEnergy, songLoudness, vocalEnvelopeEnergy };
