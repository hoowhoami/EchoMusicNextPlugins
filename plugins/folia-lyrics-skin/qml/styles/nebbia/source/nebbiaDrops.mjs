// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaDrops.ts
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
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { clamp, NEBBIA_FIXED } from './nebbiaConstants.mjs';
import { NebbiaDropSpring } from './nebbiaDropSpring.mjs';
import { createVisualizerRng } from './_shared/components/visualizer/visualizerSeedHash.mjs';
const SMEAR_MIN = 0.6;
const SMEAR_REST = 0.3;
const windDrift = (dy, busSpeed) => -dy * NEBBIA_FIXED.wind * busSpeed;
class NebbiaGlassMotion {
  constructor() {
    /** 这一帧要画进水珠纹理的实例（擦痕边、下淌、雨点）。 */
    __publicField(this, 'drops', []);
    __publicField(this, 'trails', []);
    __publicField(this, 'smears', []);
    __publicField(this, 'fieldDrops', []);
    __publicField(this, 'bumps', []);
    __publicField(this, 'nextBump', 0);
    __publicField(this, 'rng', createVisualizerRng(777));
    __publicField(this, 'now', 0);
    __publicField(this, 'H', 0);
    /** 上一次颠的时刻：颠得密（跟底鼓）时每一下震落的概率按间隔打折，不然几分钟里大水珠全掉光。 */
    __publicField(this, 'lastTrigger', -Infinity);
    __publicField(this, 'spring', new NebbiaDropSpring());
    __publicField(this, 'bump', 1);
  }
  /** 雾上的凝结水珠：下半部分略多略大。 */
  buildField(W, H) {
    const rnd = createVisualizerRng(4242),
      n = Math.round(((W * H) / 2200) * NEBBIA_FIXED.fieldDrops);
    this.fieldDrops = [];
    for (let i = 0; i < n; i += 1) {
      const big = rnd() < 0.12;
      const w = big ? 40 + rnd() * 34 : 14 + rnd() ** 1.4 * 22;
      const sp = rnd() * 0.25;
      const x = rnd() * W,
        y = H * (1 - rnd() ** 1.25);
      this.fieldDrops.push({
        x,
        y,
        hx: x,
        hy: y,
        w: w * (1 + sp * 0.5),
        h: w * (1 + sp),
        phase: rnd() * 6.28,
        fall: null,
        smear: null,
      });
    }
    this.trails.length = 0;
    this.smears.length = 0;
    this.H = H;
  }
  /** 每帧开头：清空实例，按时间偶尔颠一下（`randomBumps` 为 false 时颠簸跟鼓点，由外面 trigger）。paused 时不颠。 */
  beginFrame(now, paused, randomBumps = true) {
    this.now = now;
    this.drops.length = 0;
    this.spring.step(now, paused, (t) => this.shakeAt(t));
    if (paused || !randomBumps || this.bump <= 0 || NEBBIA_FIXED.bumpRate <= 0) return;
    if (now > this.nextBump) {
      if (this.nextBump > 0) this.trigger(now, 0.5 + this.rng() * 0.7);
      this.nextBump = now + (3 + this.rng() * 9) / NEBBIA_FIXED.bumpRate;
    }
  }
  /** 颠一下：越大的水珠越容易被震落。 */
  trigger(now, a) {
    this.bumps.push({ t: now, a });
    while (this.bumps.length && now - this.bumps[0].t > 3) this.bumps.shift();
    const fallShare = clamp((now - this.lastTrigger) / 7.5);
    this.lastTrigger = now;
    for (const d of this.fieldDrops) {
      if (d.fall || d.w < 26) continue;
      if (this.rng() < (NEBBIA_FIXED.bumpFall * a * fallShare * (d.w - 24)) / 45) {
        if (d.smear && d.smear.end === null) d.smear.end = now;
        d.smear = null;
        const trail = {
          x: d.x,
          y0: d.y - d.h * 0.05,
          y1: d.y,
          w: d.w,
          end: null,
          seed: this.rng() * 100,
        };
        d.fall = {
          t0: now + this.rng() * 0.12,
          y0: d.y,
          len: ((30 + this.rng() * 150) * d.w) / 50,
          dur: 1 + this.rng() * 2.2,
          trail,
        };
        this.trails.push(trail);
      }
    }
  }
  /** 这一帧的车身位移（CSS 像素）。 */
  shake() {
    return this.shakeAt(this.now);
  }
  /** t 时刻的车身位移：先往下一沉，再阻尼回弹，横向带一点。 */
  shakeAt(t) {
    let x = 0,
      y = 0;
    for (const b of this.bumps) {
      const dt = t - b.t;
      if (dt < 0) continue;
      const k = b.a * this.bump;
      y += k * 7 * Math.exp(-dt * 4.5) * Math.sin(dt * Math.PI * 2 * 3.8);
      x +=
        k *
        2 *
        Math.exp(-dt * 5.5) *
        Math.sin(dt * Math.PI * 2 * 2.7 + 1.2) *
        (1 - Math.exp(-dt * 60));
    }
    return [x, y];
  }
  /** 水珠表面的细颤：颠簸后自己来回压扁、拉长几下（被甩开的拉长另算，见 nebbiaDropSpring.ts）。 */
  wobble(phase) {
    let w = 0;
    for (const b of this.bumps) {
      const dt = this.now - b.t;
      if (dt >= 0)
        w += b.a * this.bump * 0.07 * Math.exp(-dt * 3.2) * Math.sin(dt * Math.PI * 2 * 7 + phase);
    }
    return w;
  }
  /** 放一颗水珠：r 是看得见的半径，sx / sy 压扁拉长。 */
  put(x, y, r, alpha, sx = 1, sy = 1) {
    if (r < 0.5 || alpha <= 0.01) return;
    const [dx, dy, st] = this.spring.offset(r);
    const wb = this.wobble(x * 0.05 + y * 0.03) - st;
    const w = r * 8 * sx * (1 + wb),
      h = r * 8 * sy * (1 - wb);
    this.drops.push(x + dx, y + dy, w, h, w / 100, Math.min(1, alpha));
  }
  /** 雾上水珠这一帧的实例：晃动，掉落中的往下走走停停并拉长。 */
  fieldInstances(out, busSpeed) {
    out.length = 0;
    for (const d of this.fieldDrops) {
      let x = d.x,
        y = d.y,
        stretch = 0;
      if (d.fall) {
        const f = d.fall,
          tr = f.trail,
          u = clamp((this.now - f.t0) / f.dur);
        y = f.y0 + f.len * (u - Math.sin(u * 6 * Math.PI) / (6 * Math.PI));
        x =
          tr.x +
          Math.sin(y * 0.07 + tr.seed) * 1.4 +
          Math.sin(y * 0.021 + tr.seed * 2) * 2.2 +
          windDrift(y - tr.y0, busSpeed);
        stretch = 0.4 * (1 - Math.cos(u * 6 * Math.PI)) * (u < 1 ? 1 : 0);
        tr.y1 = y;
        if (u >= 1) {
          tr.end = this.now;
          d.fall = null;
          if (y - d.h / 8 > this.H) {
            d.x = d.hx;
            d.y = d.hy;
          } else {
            d.x = x;
            d.y = y;
          }
        }
      }
      const [dx, dy, st] = this.spring.offset(d.w / 8);
      if (!d.fall) this.trackSmear(d, dx, dy);
      const wb = this.wobble(d.phase) - st;
      out.push(x + dx, y + dy, d.w * (1 + wb), d.h * (1 - wb + stretch), d.w / 100, 1);
    }
    return out;
  }
  /** 记下一颗水珠甩过的范围：沿着甩动方向的两头，甩得更远就往外扩；停下后由 nebbiaMask.ts 慢慢回雾。 */
  trackSmear(d, dx, dy) {
    const far = Math.hypot(dx, dy);
    let m = d.smear;
    if (far < SMEAR_REST) {
      if (m && m.end === null) m.end = this.now;
      return;
    }
    if (m == null ? void 0 : m.gone) m = null;
    if (!m) {
      if (far < SMEAR_MIN) return;
      m = { x: d.x, y: d.y, w: d.w, ax: 0, ay: 0, bx: 0, by: 0, end: null };
      d.smear = m;
      this.smears.push(m);
    }
    m.end = null;
    if (dy < m.ay) {
      m.ax = dx;
      m.ay = dy;
    }
    if (dy > m.by) {
      m.bx = dx;
      m.by = dy;
    }
  }
}
export { NebbiaGlassMotion, windDrift };
