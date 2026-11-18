// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSegments.ts
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
const SEGMENT_FLOATS = 6;
const segDist = (x, y, segs, p) => {
  const ax = segs[p],
    ay = segs[p + 1],
    dx = segs[p + 2] - ax,
    dy = segs[p + 3] - ay,
    l2 = dx * dx + dy * dy;
  const u = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
  return Math.hypot(x - ax - dx * u, y - ay - dy * u);
};
class NebbiaSegments {
  constructor() {
    __publicField(this, 'data', new Float32Array(SEGMENT_FLOATS * 4096));
    /** 这一帧收了几段。 */
    __publicField(this, 'count', 0);
    __publicField(this, 'a', 1);
    __publicField(this, 'b', 0);
    __publicField(this, 'c', 0);
    __publicField(this, 'd', 1);
    __publicField(this, 'e', 0);
    __publicField(this, 'f', 0);
    /** 当前变换的缩放（矩阵都是旋转 × 等比缩放）。 */
    __publicField(this, 'k', 1);
    /** 当前路径的点（已变换），一个子路径一段，NaN 分开。 */
    __publicField(this, 'path', []);
  }
  /** 每帧开头清空。 */
  clear() {
    this.count = 0;
    this.path.length = 0;
  }
  setTransform(a, b, c, d, e, f) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    this.k = Math.hypot(a, b);
  }
  moveTo(x, y) {
    if (this.path.length) this.path.push(NaN, NaN);
    this.lineTo(x, y);
  }
  lineTo(x, y) {
    this.path.push(this.a * x + this.c * y + this.e, this.b * x + this.d * y + this.f);
  }
  /** 描当前路径（宽度在当前变换下），再清掉路径。只有一个点的子路径不画（和画布一样）。 */
  stroke(width, v) {
    const p = this.path,
      w = width * this.k;
    for (let i = 2; i < p.length; i += 2) {
      if (Number.isNaN(p[i]) || Number.isNaN(p[i - 2])) continue;
      this.push(p[i - 2], p[i - 1], p[i], p[i + 1], w, v);
    }
    p.length = 0;
  }
  push(x0, y0, x1, y1, w, v) {
    if ((this.count + 1) * SEGMENT_FLOATS > this.data.length) {
      const grown = new Float32Array(this.data.length * 2);
      grown.set(this.data);
      this.data = grown;
    }
    const o = this.count * SEGMENT_FLOATS,
      dt = this.data;
    dt[o] = x0;
    dt[o + 1] = y0;
    dt[o + 2] = x1;
    dt[o + 3] = y1;
    dt[o + 4] = w;
    dt[o + 5] = v;
    this.count += 1;
  }
}
export { NebbiaSegments, SEGMENT_FLOATS, segDist };
