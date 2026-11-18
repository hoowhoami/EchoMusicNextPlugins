// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaBeatCursor.ts
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
const MAX_STEP = 0.5;
class NebbiaBeatCursor {
  constructor() {
    __publicField(this, 'events', null);
    __publicField(this, 'cursor', 0);
    __publicField(this, 'lastT', -Infinity);
    /** 这一帧走过的拍（每帧清空重用）。 */
    __publicField(this, 'hits', []);
  }
  /** 走到歌里的 T 秒；events 为 null（不跟拍）时忘掉游标，返回空。 */
  step(events, T) {
    var _a;
    const { hits } = this;
    hits.length = 0;
    if (!events) {
      this.events = null;
      return hits;
    }
    const jumped = events !== this.events || T < this.lastT || T - this.lastT > MAX_STEP;
    this.lastT = T;
    if (jumped) {
      this.events = events;
      let lo = 0,
        hi = events.length;
      while (lo < hi) {
        const m = (lo + hi) >> 1;
        if (events[m].t <= T) lo = m + 1;
        else hi = m;
      }
      this.cursor = lo;
      return hits;
    }
    for (; this.cursor < events.length && events[this.cursor].t <= T; this.cursor += 1) {
      const e = events[this.cursor];
      if (e.rhythmic === false) continue;
      hits.push({
        index: this.cursor,
        gain: Math.max(0.35, (_a = e.impact) != null ? _a : 1),
        down: e.kind === 'downbeat',
      });
    }
    return hits;
  }
}
export { NebbiaBeatCursor };
