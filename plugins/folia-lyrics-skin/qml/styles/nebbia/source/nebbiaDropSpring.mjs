// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaDropSpring.ts
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
import { clamp } from './nebbiaConstants.mjs';
const RADII = [1.5, 3, 5, 8];
const FREQ = [11, 8, 5.5, 3.6];
const ZETA = 0.18;
const GLASS = 0.35;
const GAIN = 3;
const PIN_R = 2.5,
  FREE_R = 6;
const STEP = 1 / 480;
class NebbiaDropSpring {
  constructor() {
    __publicField(
      this,
      'u',
      RADII.map(() => [0, 0]),
    );
    __publicField(
      this,
      'v',
      RADII.map(() => [0, 0]),
    );
    __publicField(this, 'last', -1);
  }
  /** 推进到 now：`shakeAt(t)` 是车身在 t 时刻的位移。frozen 时只记下时刻。 */
  step(now, frozen, shakeAt) {
    const from = this.last;
    this.last = now;
    if (frozen || from < 0 || now <= from) return;
    let t = Math.max(from, now - 0.1);
    while (t < now) {
      const h = Math.min(STEP, now - t);
      const g0 = shakeAt(t - STEP),
        g1 = shakeAt(t),
        g2 = shakeAt(t + STEP);
      for (let axis = 0; axis < 2; axis += 1) {
        const acc = (-GAIN * GLASS * (g2[axis] - 2 * g1[axis] + g0[axis])) / (STEP * STEP);
        RADII.forEach((_, i) => {
          const w = FREQ[i] * Math.PI * 2;
          const a = acc - 2 * ZETA * w * this.v[i][axis] - w * w * this.u[i][axis];
          this.v[i][axis] += a * h;
          this.u[i][axis] += this.v[i][axis] * h;
        });
      }
      t += h;
    }
  }
  /** 半径 r 的水珠这一帧相对玻璃的偏移 [dx, dy]，和顺着甩动方向的拉长量（正 = 竖着拉长）。 */
  offset(r) {
    let i = 0;
    while (i < RADII.length - 2 && r > RADII[i + 1]) i += 1;
    const f = clamp((r - RADII[i]) / (RADII[i + 1] - RADII[i]));
    const free = clamp((r - PIN_R) / (FREE_R - PIN_R));
    const dx = (this.u[i][0] + (this.u[i + 1][0] - this.u[i][0]) * f) * free;
    const dy = (this.u[i][1] + (this.u[i + 1][1] - this.u[i][1]) * f) * free;
    const stretch = clamp(
      ((Math.abs(dy) - Math.abs(dx) * 0.5) / Math.max(r, 1)) * 0.12,
      -0.25,
      0.35,
    );
    return [dx, dy, stretch];
  }
}
export { NebbiaDropSpring };
