// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSpot.ts
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
import { clamp, smooth } from './nebbiaConstants.mjs';
const startOf = (c) => (c.appearDur > 0 ? c.t : c.wt);
const doneOf = (c) => startOf(c) + (c.appearDur > 0 ? c.appearDur : c.wd);
const doneAt = /* @__PURE__ */ createObjectCache();
const lineDoneOf = (line) => {
  let end = doneAt.get(line);
  if (end === void 0) {
    end = line.end;
    for (const c of line.chars) if (c.glyph) end = Math.max(end, doneOf(c));
    doneAt.set(line, end);
  }
  return end;
};
const currentWritingChar = (laid, T) => {
  for (let li = laid.length - 1; li >= 0; li -= 1) {
    const line = laid[li];
    if (T < line.t - 0.05 || T > lineDoneOf(line) + 0.8) continue;
    let k = -1;
    line.chars.forEach((c, i) => {
      if (c.glyph && startOf(c) <= T && (k < 0 || startOf(c) >= startOf(line.chars[k]))) k = i;
    });
    if (k < 0) continue;
    let next = null;
    for (let i = k + 1; i < line.chars.length && !next; i += 1)
      if (line.chars[i].glyph) next = line.chars[i];
    return { c: line.chars[k], next };
  }
  return null;
};
class NebbiaSpot {
  constructor() {
    __publicField(this, 'x', 0);
    __publicField(this, 'y', 0);
    __publicField(this, 'r', 0);
    __publicField(this, 'i', 0);
    __publicField(this, 'vx', 0);
    __publicField(this, 'vy', 0);
    __publicField(this, 'vr', 0);
    __publicField(this, 't', 0);
    __publicField(this, 'init', false);
  }
  /** 一帧：T 是播放时间，dt 是真实流逝的秒数（暂停时 0）。 */
  update(laid, T, dt) {
    this.t += dt;
    if (Math.abs(T - this.t) > 0.25 || dt === 0) this.t = T;
    else this.t += (T - this.t) * (1 - Math.exp(-dt / 0.3));
    const cur = currentWritingChar(laid, this.t);
    if (cur) {
      const { c, next } = cur;
      const u = next
        ? smooth(clamp((this.t - startOf(c)) / Math.max(0.05, startOf(next) - startOf(c))))
        : 0;
      const gx = next ? c.x + (next.x - c.x) * u : c.x,
        gy = next ? c.y + (next.y - c.y) * u : c.y,
        gr = next ? c.s + (next.s - c.s) * u : c.s;
      if (!this.init || dt === 0) {
        this.x = gx;
        this.y = gy;
        this.r = gr;
        this.vx = this.vy = this.vr = 0;
        this.init = true;
      }
      const w = 1 / 0.1,
        n = Math.ceil(dt / 8e-3);
      for (let j = 0; j < n; j += 1) {
        const h = dt / n;
        this.vx += (w * w * (gx - this.x) - 2 * w * this.vx) * h;
        this.x += this.vx * h;
        this.vy += (w * w * (gy - this.y) - 2 * w * this.vy) * h;
        this.y += this.vy * h;
        this.vr += (w * w * (gr - this.r) - 2 * w * this.vr) * h;
        this.r += this.vr * h;
      }
    }
    if (dt === 0) this.i = cur ? 1 : 0;
    else this.i += ((cur ? 1 : 0) - this.i) * (1 - Math.exp(-dt / (cur ? 0.15 : 0.5)));
  }
  reset() {
    this.init = false;
    this.i = 0;
  }
}
export { NebbiaSpot };
