// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaWeedSway.ts
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
const OMEGA = 2 * Math.PI * 2;
const DAMP = 2 * 0.3 * OMEGA;
const KICK_V = OMEGA * 1.25;
const STEP = 1 / 120;
const SPACING = 6;
const HISTORY = SPACING * 3 + 1;
class NebbiaWeedSway {
  constructor() {
    __publicField(this, 'x', 0);
    __publicField(this, 'v', 0);
    __publicField(this, 'side', 1);
    __publicField(this, 'carry', 0);
    __publicField(this, 'history', new Float32Array(HISTORY));
    __publicField(this, 'head', 0);
  }
  /** 推一下：amount 是这一拍的力度乘强度（0..2）。 */
  kick(amount) {
    this.side = -this.side;
    this.v = this.side * amount * KICK_V;
  }
  /** 走 dt 秒（暂停时 0），把现在、0.05、0.1、0.15 秒前的位置写进 out。 */
  step(dt, out) {
    this.carry += Math.min(dt, 0.1);
    while (this.carry >= STEP) {
      this.carry -= STEP;
      this.v += (-OMEGA * OMEGA * this.x - DAMP * this.v) * STEP;
      this.x += this.v * STEP;
      this.head = (this.head + 1) % HISTORY;
      this.history[this.head] = this.x;
    }
    for (let k = 0; k < 4; k += 1)
      out[k] = this.history[(this.head - k * SPACING + HISTORY * 2) % HISTORY];
  }
}
export { NebbiaWeedSway };
