// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSnowGrid.ts
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
import { segDist } from './nebbiaSegments.mjs';
class NebbiaSnowGrid {
  constructor() {
    __publicField(this, 'cells', []);
    __publicField(this, 'gw', 1);
    __publicField(this, 'gh', 1);
    __publicField(this, 'size', 30);
  }
  reset(W, H, size) {
    this.size = size;
    this.gw = Math.ceil(W / size) + 1;
    this.gh = Math.ceil(H / size) + 1;
    this.cells = Array.from({ length: this.gw * this.gh }, () => []);
  }
  gx(x) {
    return Math.min(this.gw - 1, Math.max(0, Math.floor(x / this.size)));
  }
  gy(y) {
    return Math.min(this.gh - 1, Math.max(0, Math.floor(y / this.size)));
  }
  place(d) {
    if (!this.cells.length) return;
    const c = this.gx(d.x) + this.gy(d.y) * this.gw;
    if (c === d.cell) return;
    this.unplace(d);
    this.cells[c].push(d);
    d.cell = c;
  }
  unplace(d) {
    if (d.cell < 0) return;
    const a = this.cells[d.cell],
      j = a.indexOf(d);
    if (j >= 0) {
      a[j] = a[a.length - 1];
      a.pop();
    }
    d.cell = -1;
  }
  /** 挨着线段（每段 5 个数：x0、y0、x1、y1、宽）的：边（半径 radius）进到线段两边 pad 以内就 hit；reach 是最大的半径。 */
  alongSegments(segs, pad, reach, radius, hit) {
    for (let p = 0; p < segs.length; p += 5) {
      const hw = segs[p + 4] / 2,
        m = hw + pad + reach;
      const x0 = this.gx(Math.min(segs[p], segs[p + 2]) - m),
        x1 = this.gx(Math.max(segs[p], segs[p + 2]) + m);
      const y0 = this.gy(Math.min(segs[p + 1], segs[p + 3]) - m),
        y1 = this.gy(Math.max(segs[p + 1], segs[p + 3]) + m);
      for (let gy = y0; gy <= y1; gy += 1)
        for (let gx = x0; gx <= x1; gx += 1)
          for (const d of this.cells[gx + gy * this.gw]) {
            if (!d.dead && segDist(d.x, d.y, segs, p) < hw + pad + radius(d)) hit(d);
          }
    }
  }
  /** (x, y) 落在谁上：半径再加 extra 以内的第一个（只查周围一圈格子），没有返回 null。 */
  at(x, y, extra, radius) {
    if (!this.cells.length) return null;
    const cx = this.gx(x),
      cy = this.gy(y);
    for (let gy = Math.max(0, cy - 1); gy <= Math.min(this.gh - 1, cy + 1); gy += 1)
      for (let gx = Math.max(0, cx - 1); gx <= Math.min(this.gw - 1, cx + 1); gx += 1) {
        for (const d of this.cells[gx + gy * this.gw])
          if (!d.dead && Math.hypot(d.x - x, d.y - y) < radius(d) + extra) return d;
      }
    return null;
  }
}
export { NebbiaSnowGrid };
