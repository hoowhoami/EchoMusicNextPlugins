// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/clock.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../environment.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
const MAX_STEP_SECONDS = 0.1;
class MachiClock {
  constructor() {
    /** 氛围时间（秒），只在没暂停时前进。 */
    __publicField(this, 'elapsed', 0);
    /** 这一帧氛围时间走了多少（暂停时是 0）。 */
    __publicField(this, 'delta', 0);
    /** 这一帧的真实时间（镜头回正这类界面动画用，不随暂停停住）。 */
    __publicField(this, 'realDelta', 0);
    __publicField(this, 'paused', false);
    /** 动效强度（主题的 animationIntensity）乘在速度上。 */
    __publicField(this, 'timeScale', 1);
    __publicField(this, 'last', -1);
  }
  /** 每帧调一次，now 是 requestAnimationFrame 给的毫秒时间戳。 */
  tick(now) {
    const real =
      this.last < 0 ? 0 : Math.min(MAX_STEP_SECONDS, Math.max(0, (now - this.last) / 1e3));
    this.last = now;
    this.realDelta = real;
    this.delta = this.paused ? 0 : real * this.timeScale;
    this.elapsed += this.delta;
  }
  /** 循环停过一阵后重新开始：不把停着的这段算进下一帧。 */
  resync() {
    this.last = -1;
  }
}
export { MachiClock };
