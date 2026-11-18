// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSceneClock.ts
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { clamp } from './nebbiaConstants.mjs';
const SCENE_RESET = 1e3;
const SCENE_WRAP = 3600;
class NebbiaSceneClock {
  constructor() {
    __publicField(this, 'time', 0);
    __publicField(this, 'last', 0);
  }
  /** 走一帧，返回这一帧的 dt（暂停时 0，最多 0.1 秒）。`now` 是秒。 */
  tick(now, paused) {
    const dt = paused ? 0 : clamp(now - this.last, 0, 0.1);
    this.time = (this.time + dt) % SCENE_WRAP;
    this.last = now;
    return dt;
  }
  songChanged() {
    if (this.time > SCENE_RESET) this.time = 0;
  }
}
export { NebbiaSceneClock };
