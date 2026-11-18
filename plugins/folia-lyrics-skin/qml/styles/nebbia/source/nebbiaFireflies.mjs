// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaFireflies.ts
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
const FIREFLY_FLOATS = 12;
const fireflyParams = { count: 100, size: 1, halo: 2, speed: 1, glow: 1 };
const TAU = Math.PI * 2;
const GLOW_END = 0.4;
const HOLD_AVG = 4.5 * (7.5 - 1 + GLOW_END + 0.05);
const rand = (a, b) => a + Math.random() * (b - a);
const smooth = (t) => t * t * (3 - 2 * t);
const turn = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
class NebbiaFireflies {
  constructor() {
    __publicField(this, 'flies', []);
    __publicField(this, 'out', new Float32Array(0));
    __publicField(this, 'W', 0);
    __publicField(this, 'H', 0);
    __publicField(this, 'k', 1);
    __publicField(this, 'spawnAcc', 0);
    /** 尾巴光挑的颜色：主题的三个灯光色（nebbiaPalette.ts 的 la、lb、lc），提亮到最亮的通道是 1；后两个固定，是窗外路灯的钠黄（SODIUM）和车灯的白 */
    __publicField(this, 'palette', [
      [1, 0.81, 0.54],
      [0.54, 0.8, 1],
      [0.8, 0.54, 1],
      [1, 0.68, 0.32],
      [1, 0.95, 0.85],
    ]);
  }
  setPalette(la, lb, lc) {
    const theme = [la, lb, lc].map((c) => {
      const m = Math.max(c[0], c[1], c[2], 0.05);
      return c.map((v) => v / m);
    });
    this.palette = [...theme, ...this.palette.slice(3)];
  }
  resize(W, H) {
    if (W === this.W && H === this.H) return;
    const first = !this.W;
    const sx = W / (this.W || W),
      sy = H / (this.H || H);
    this.W = W;
    this.H = H;
    this.k = H / 1e3;
    if (first) {
      const p = fireflyParams,
        want = Math.round((p.count * W * H) / (1280 * 720));
      this.flies = Array.from({ length: want }, () => {
        const f = this.spawn();
        f.age = Math.random() * (f.app + f.hold + f.leave);
        f.px = f.py = NaN;
        return f;
      });
      return;
    }
    for (const f of this.flies) {
      f.x *= sx;
      f.y *= sy;
      f.px *= sx;
      f.py *= sy;
    }
  }
  spawn() {
    const { k } = this,
      s = fireflyParams.speed || 1;
    const a = Math.random() * TAU,
      D = rand(80, 220) * k;
    const x = Math.random() * this.W,
      y = Math.random() * this.H,
      ox = Math.cos(a) * D,
      oy = Math.sin(a) * D - rand(0, 50) * k;
    const app = rand(1.5, 3) / s,
      blink = rand(3, 6),
      flashes = 5 + Math.floor(Math.random() * 6);
    return {
      x,
      y,
      r: (Math.random() < 0.3 ? rand(4.5, 6) : rand(2.5, 4.5)) * k * fireflyParams.size,
      app,
      ox,
      oy,
      zig: rand(12, 30) * k,
      zf: rand(1.2, 2.2),
      fp: Math.random() * TAU,
      hold: blink * (flashes - 1 + GLOW_END + 0.05),
      leave: rand(0.8, 1.4) / s,
      dir: Math.random() * TAU,
      far: rand(120, 260) * k,
      age: 0,
      crawl: Math.random() * TAU,
      blink,
      bp: (1 - ((app / blink) % 1)) % 1,
      tint: Math.floor(Math.random() * 5),
      px: x + ox,
      py: y + oy,
      head: Math.atan2(-oy, -ox),
    };
  }
  /** 往前走 dt 秒，排好实例：返回 [数据, 只数]。 */
  step(dt) {
    const p = fireflyParams,
      { W, H } = this;
    if (!W || !H) return [this.out, 0];
    const want = (p.count * W * H) / (1280 * 720);
    const life = 3.35 / (p.speed || 1) + HOLD_AVG;
    this.spawnAcc += (dt * want) / life;
    for (; this.spawnAcc >= 1; this.spawnAcc -= 1) this.flies.push(this.spawn());
    const flies = this.flies;
    let n = 0;
    for (const f of flies) if ((f.age += dt) < f.app + f.hold + f.leave) flies[n++] = f;
    flies.length = n;
    if (this.out.length < n * FIREFLY_FLOATS)
      this.out = new Float32Array(Math.ceil(n * 1.5) * FIREFLY_FLOATS);
    for (let i = 0; i < n; i += 1) this.pack(flies[i], i * FIREFLY_FLOATS, dt);
    return [this.out, n];
  }
  /** 排一只：飞过来 → 停在玻璃上一阵一阵地爬 → 飞走。 */
  pack(f, o, dt) {
    const { k } = this;
    let x = f.x,
      y = f.y,
      sc = 1,
      alpha = 0.92,
      focus = 1,
      flap = 0;
    const p = Math.min(1, f.age / f.app),
      lt = (f.age - f.app - f.hold) / f.leave;
    if (p < 1) {
      const c2 = TAU * 2.5,
        pe = clamp(
          p +
            (0.85 *
              (Math.sin(c2 * p + f.fp) - Math.sin(f.fp) * (1 - p) - Math.sin(c2 + f.fp) * p)) /
              c2,
        ),
        q = (1 - pe) ** 2;
      const L = Math.hypot(f.ox, f.oy) || 1,
        nx = -f.oy / L,
        ny = f.ox / L;
      const z =
        f.zig *
        (1 - pe) *
        (Math.sin(f.age * f.zf * TAU + f.fp) + 0.5 * Math.sin(f.age * f.zf * 2.7 * TAU + f.fp * 2));
      x += f.ox * q + nx * z;
      y += f.oy * q + ny * z;
      sc = 0.7 + 0.3 * p;
      alpha *= 0.45 + 0.55 * p;
      focus = p;
      flap = (0.6 + 0.4 * Math.abs(Math.sin(f.age * 47 + f.fp))) * (1 - p ** 4);
    } else if (lt < 0) {
      const st = f.age - f.app,
        go = smooth(clamp((Math.sin(st * 0.9 + f.fp) - 0.2) / 0.4));
      f.crawl += (Math.random() - 0.5) * 0.78 * Math.sqrt(dt);
      f.x += Math.cos(f.crawl) * 7 * k * go * dt;
      f.y += Math.sin(f.crawl) * 7 * k * go * dt;
      x = f.x;
      y = f.y;
      flap =
        ((0.35 * Math.max(0, Math.sin(st * 1.7 + f.fp * 3) - 0.94)) / 0.06) *
        Math.abs(Math.sin(st * 40));
    } else {
      const d = lt * lt * f.far,
        w = f.zig * 0.6 * lt * Math.sin(f.age * f.zf * TAU + f.fp);
      x += Math.cos(f.dir) * d - Math.sin(f.dir) * w;
      y += Math.sin(f.dir) * d + Math.cos(f.dir) * w;
      sc = 1 - 0.3 * lt;
      focus = 1 - lt;
      alpha *= 1 - lt ** 1.5;
      flap = 0.6 + 0.4 * Math.abs(Math.sin(f.age * 47 + f.fp));
    }
    const mx = x - f.px,
      my = y - f.py;
    if (mx * mx + my * my > 25e-4 * k * k)
      f.head = turn(f.head, Math.atan2(my, mx), Math.min(1, dt * 10));
    f.px = x;
    f.py = y;
    const u = (f.age / f.blink + f.bp) % 1;
    const glow =
      u < 0.15 ? smooth(u / 0.15) : u < GLOW_END ? 1 - smooth((u - 0.15) / (GLOW_END - 0.15)) : 0;
    const out = this.out;
    out[o] = x;
    out[o + 1] = y;
    out[o + 2] = f.r * sc;
    out[o + 3] = alpha;
    out[o + 4] = focus;
    out[o + 5] = lt < 0 ? 1 : 1 - lt;
    out[o + 6] = f.head;
    out[o + 7] = flap;
    out[o + 8] = glow * fireflyParams.glow * (lt < 0 ? 1 : 1 - lt);
    const c = this.palette[f.tint];
    out[o + 9] = c[0];
    out[o + 10] = c[1];
    out[o + 11] = c[2];
  }
}
export { FIREFLY_FLOATS, NebbiaFireflies, fireflyParams };
