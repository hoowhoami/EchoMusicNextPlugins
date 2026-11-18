// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSnowTrails.ts
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
import { clamp, MASK_SCALE, smooth } from './nebbiaConstants.mjs';
const MOVE_MIN = 3;
const WIPE_CLEAR = 0.5;
class NebbiaSnowTrails {
  constructor() {
    __publicField(this, 'list', []);
  }
  clear() {
    this.list.length = 0;
  }
  /** 水珠走到 (x, y)，擦痕宽 w：接着它正在擦的那一道往下记，没有就开一道新的。 */
  track(wipe, x, y, w) {
    if (!wipe) {
      const n = { pts: [x, y], w, end: null };
      this.list.push(n);
      return n;
    }
    const p = wipe.pts;
    wipe.w = Math.max(wipe.w * 0.98, w);
    if (Math.hypot(x - p[p.length - 2], y - p[p.length - 1]) > MOVE_MIN) p.push(x, y);
    return wipe;
  }
  /** 画进擦痕遮罩：time 是水的时钟。 */
  draw(ctx, time, hold, refog) {
    ctx.setTransform(MASK_SCALE, 0, 0, MASK_SCALE, 0, 0);
    for (let i = this.list.length - 1; i >= 0; i -= 1) {
      const wp = this.list[i];
      const v =
        wp.end === null ? 1 : 1 - smooth(clamp((time - wp.end - hold * 0.5) / (refog * 0.6)));
      if (v <= 2e-3) {
        this.list.splice(i, 1);
        continue;
      }
      const p = wp.pts;
      if (p.length < 4) continue;
      ctx.moveTo(p[0], p[1]);
      for (let j = 2; j < p.length; j += 2) ctx.lineTo(p[j], p[j + 1]);
      ctx.stroke(wp.w, v * WIPE_CLEAR);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}
export { NebbiaSnowTrails };
