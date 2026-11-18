// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaJellies.ts
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
import { NEBBIA_MAX_JELLIES } from './types.mjs';
const VIVID = [
  [1, 0.35, 0.72],
  [0.35, 0.8, 1],
  [0.72, 0.5, 1],
  [1, 0.72, 0.35],
];
const TOP = -0.35,
  BOTTOM = 1.35;
const OWN_WITH_BEATS = 0.4;
const WEAK_BEAT = 0.6;
const rand = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const kickLevel = (j) =>
  j.kickAge < 0.07
    ? j.kickFrom + ((j.kick - j.kickFrom) * j.kickAge) / 0.07
    : j.kick * Math.exp(-(j.kickAge - 0.07) / 0.3);
const OWN_EASE = 1.5;
const spawn = (i, seed, y) => ({
  xf: rand(seed * 3.1 + i),
  y,
  depth: rand(seed * 5.7 + i * 1.3),
  rate: 1.6 + 0.9 * rand(seed * 2.3 + i),
  phase: rand(seed + i * 7.3) * Math.PI * 2,
  rise: 0.012 + 0.012 * rand(seed * 9.1 + i),
  hue: rand(seed * 4.4 + i * 11),
  kick: 0,
  kickFrom: 0,
  kickAge: 10,
  seed,
});
class NebbiaJellies {
  constructor() {
    __publicField(
      this,
      'list',
      Array.from({ length: NEBBIA_MAX_JELLIES }, (_, i) =>
        spawn(i, i + 1, TOP + rand(i * 13.7) * (BOTTOM - TOP)),
      ),
    );
    __publicField(this, 'palette', [
      [1, 0.81, 0.54],
      [0.54, 0.8, 1],
      [0.8, 0.54, 1],
    ]);
    /** 自己那份节奏留多少：不跟拍 1，跟拍 OWN_WITH_BEATS，切换时慢慢过渡。 */
    __publicField(this, 'own', 1);
  }
  /** 主题的三个灯光色（nebbiaPalette.ts 的 la、lb、lc）。 */
  setPalette(la, lb, lc) {
    this.palette = [la, lb, lc];
  }
  /**
   * 走一帧：dt 是窗外时钟走的秒数（暂停时 0），time 是窗外时钟，aspect 是画面宽高比；fired 是这一帧走过的拍，
   * strength 是水母这一项的强度（0 就是不跟拍）。写进 out 的水母几项（jelly、jellyColor、count）。
   */
  step(out, dt, time, aspect, tuning, fired, strength) {
    const count = Math.round(tuning.jellies);
    const target = strength > 0 ? OWN_WITH_BEATS : 1;
    this.own +=
      Math.sign(target - this.own) *
      Math.min(Math.abs(target - this.own), (dt * (1 - OWN_WITH_BEATS)) / OWN_EASE);
    const { own } = this;
    const { jelly, jellyColor } = out;
    for (let i = 0; i < count; i += 1) {
      let j = this.list[i];
      j.phase += dt * j.rate;
      const swim = Math.max(Math.sin(j.phase), 0);
      for (const beat of fired) {
        if (strength <= 0) break;
        j.kickFrom = kickLevel(j);
        j.kick = Math.max(j.kickFrom, beat.gain * strength * (beat.down ? 1 : WEAK_BEAT));
        j.kickAge = 0;
      }
      j.kickAge += dt;
      const kick = kickLevel(j);
      j.y -= dt * (j.rise * (1 + 0.9 * swim * own) + 0.06 * kick);
      if (j.y < TOP) j = this.list[i] = spawn(i, j.seed + NEBBIA_MAX_JELLIES, BOTTOM);
      const x = (j.xf + 0.02 * Math.sin(time * 0.15 + j.hue * 10)) * (aspect + 0.2) - 0.1;
      const o = i * 4;
      jelly[o] = x;
      jelly[o + 1] = j.y;
      jelly[o + 2] = (0.03 + 0.055 * j.depth) * tuning.jellySize;
      jelly[o + 3] = Math.min(1.3, Math.max(swim ** 3 * own, kick));
      const vivid = VIVID[Math.floor(j.hue * 4) % 4],
        theme = this.palette[Math.floor(((j.hue * 3.7) % 1) * 3)];
      const shade = 0.45 + 0.55 * j.depth;
      for (let c = 0; c < 3; c += 1)
        jellyColor[o + c] = (vivid[c] * 0.65 + theme[c] * 0.35) * shade;
      jellyColor[o + 3] = j.phase;
    }
    out.count = count;
  }
}
export { NebbiaJellies };
