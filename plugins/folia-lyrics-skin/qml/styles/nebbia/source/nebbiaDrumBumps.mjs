// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaDrumBumps.ts
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
import { DRUM_KICK } from '../excluded-analysis.mjs';
const MIN_STRENGTH = 0.35;
const MIN_GAP = 0.3;
const MAX_STEP = 0.5;
class NebbiaDrumBumps {
  constructor() {
    __publicField(this, 'list', null);
    __publicField(this, 'key', null);
    __publicField(this, 'next', 0);
    __publicField(this, 'lastT', -Infinity);
    __publicField(this, 'lastBump', -Infinity);
  }
  /**
   * 走到 `T`（歌里的秒），返回这一段里要颠的幅度（0 = 不颠，取这一段里最响的一下）。
   * `hits` 是这首歌的鼓点（还在分离时带 `until`）。
   */
  step(hits, key, T) {
    if (hits !== this.list || key !== this.key) {
      this.list = hits;
      this.key = key;
      this.seek(T);
      return 0;
    }
    if (T < this.lastT || T - this.lastT > MAX_STEP) {
      this.seek(T);
      return 0;
    }
    let amount = 0;
    const { times, strengths, kinds } = hits;
    for (; this.next < times.length && times[this.next] <= T; this.next += 1) {
      const at = times[this.next];
      if (
        kinds[this.next] !== DRUM_KICK ||
        strengths[this.next] < MIN_STRENGTH ||
        at - this.lastBump < MIN_GAP
      )
        continue;
      this.lastBump = at;
      amount = Math.max(amount, 0.3 + 0.7 * strengths[this.next]);
    }
    this.lastT = T;
    return amount;
  }
  /** 不在跟鼓点（没开、没鼓点）：下次有了从那时起算。 */
  reset() {
    this.list = null;
    this.key = null;
  }
  seek(T) {
    var _a, _b;
    const times = (_a = this.list) == null ? void 0 : _a.times;
    let lo = 0,
      hi = (_b = times == null ? void 0 : times.length) != null ? _b : 0;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (times[m] <= T) lo = m + 1;
      else hi = m;
    }
    this.next = lo;
    this.lastT = T;
    this.lastBump = -Infinity;
  }
}
export { NebbiaDrumBumps };
