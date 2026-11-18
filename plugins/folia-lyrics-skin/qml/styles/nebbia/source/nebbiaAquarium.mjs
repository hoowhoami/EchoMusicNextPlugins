// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaAquarium.ts
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
import { NebbiaBeatCursor } from './nebbiaBeatCursor.mjs';
import { NebbiaJellies } from './nebbiaJellies.mjs';
import { NEBBIA_MAX_BURSTS, NEBBIA_MAX_JELLIES } from './types.mjs';
import { NebbiaWeedSway } from './nebbiaWeedSway.mjs';
const BURST_LIFE = 6;
const SPOT_GROW = 0.45,
  SPOT_ATTACK = 0.06,
  SPOT_DECAY = 0.25;
const rand = (n) => {
  const x = Math.sin(n * 91.7 + 47.3) * 43758.5453;
  return x - Math.floor(x);
};
class NebbiaAquarium {
  constructor() {
    __publicField(this, 'jellies', new NebbiaJellies());
    __publicField(this, 'cursor', new NebbiaBeatCursor());
    __publicField(this, 'out', {
      jelly: new Float32Array(NEBBIA_MAX_JELLIES * 4),
      jellyColor: new Float32Array(NEBBIA_MAX_JELLIES * 4),
      count: 0,
      bubbles: 0,
      sway: new Float32Array(4),
      weedIdle: 1,
      bursts: new Float32Array(NEBBIA_MAX_BURSTS * 4),
      burstCount: 0,
      beatRows: 0,
      spotScale: 1,
    });
    /** 聚光灯跟拍：这一下放大到多少、从多少开始放大、过了几秒。 */
    __publicField(this, 'spotKick', 0);
    __publicField(this, 'spotFrom', 0);
    __publicField(this, 'spotAge', 10);
    __publicField(this, 'weed', new NebbiaWeedSway());
    /** 下一排泡写进哪一格（环形）。 */
    __publicField(this, 'nextBurst', 0);
  }
  setPalette(la, lb, lc) {
    this.jellies.setPalette(la, lb, lc);
  }
  /**
   * 走一帧：dt 是窗外时钟走的秒数（暂停时 0），time 是窗外时钟，aspect 是画面宽高比；
   * beats 为 null 时不跟拍。返回这一帧给着色器的水族箱 uniform（同一个对象，每帧改写）。
   */
  step(dt, time, aspect, tuning, beats) {
    var _a, _b, _c, _d, _e, _f;
    const { out } = this;
    const hits = this.cursor.step(
      (_a = beats == null ? void 0 : beats.events) != null ? _a : null,
      (_b = beats == null ? void 0 : beats.heard) != null ? _b : 0,
    );
    this.jellies.step(
      out,
      dt,
      time,
      aspect,
      tuning,
      hits,
      (_c = beats == null ? void 0 : beats.jelly) != null ? _c : 0,
    );
    out.bubbles = tuning.bubbles;
    const { sway, bursts } = out;
    for (const hit of hits) {
      const weed = (_d = beats == null ? void 0 : beats.weed) != null ? _d : 0,
        bubble = (_e = beats == null ? void 0 : beats.bubble) != null ? _e : 0;
      if (weed > 0) this.weed.kick(hit.gain * weed * (hit.down ? 1 : 0.7));
      const spot = (_f = beats == null ? void 0 : beats.spot) != null ? _f : 0;
      if (spot > 0) {
        this.spotFrom = this.spotLevel();
        this.spotKick = Math.max(
          this.spotFrom,
          Math.min(1.5, hit.gain * spot * (hit.down ? 1 : 0.7)),
        );
        this.spotAge = 0;
      }
      if (bubble > 0) {
        const o = this.nextBurst * 4;
        bursts[o] = 0.17 + rand(hit.index) * Math.max(0, aspect - 0.34);
        bursts[o + 1] = time;
        bursts[o + 2] = Math.min(1, hit.gain * bubble * (hit.down ? 1 : 0.75));
        bursts[o + 3] = rand(hit.index * 3.3 + 1) * 100;
        this.nextBurst = (this.nextBurst + 1) % NEBBIA_MAX_BURSTS;
      }
    }
    out.beatRows = beats && beats.bubble > 0 ? 1 : 0;
    this.spotAge += dt;
    out.spotScale = 1 + SPOT_GROW * this.spotLevel();
    this.weed.step(dt, sway);
    const idle = beats && beats.weed > 0 ? 0 : 1;
    out.weedIdle += (idle - out.weedIdle) * (1 - Math.exp(-dt / 0.6));
    let n = 0;
    for (let i = 0; i < NEBBIA_MAX_BURSTS; i += 1) {
      const age = time - bursts[i * 4 + 1];
      if (bursts[i * 4 + 2] > 0 && age >= 0 && age < BURST_LIFE) n = i + 1;
      else bursts[i * 4 + 2] = 0;
    }
    out.burstCount = n;
    return out;
  }
  spotLevel() {
    const a = this.spotAge;
    return a < SPOT_ATTACK
      ? this.spotFrom + ((this.spotKick - this.spotFrom) * a) / SPOT_ATTACK
      : this.spotKick * Math.exp(-(a - SPOT_ATTACK) / SPOT_DECAY);
  }
}
export { NebbiaAquarium };
