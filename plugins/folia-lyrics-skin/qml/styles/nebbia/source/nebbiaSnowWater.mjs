// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSnowWater.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
import { arrayAt, arrayFlatMap, fromEntries } from '../compat.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { NebbiaSnowGrid } from './nebbiaSnowGrid.mjs';
import { NebbiaSnowTrails } from './nebbiaSnowTrails.mjs';
const iceParams = {
  freezeAfter: 1.5,
  freezeDur: 3,
  slide: 3,
  minR: 2.5,
  grow: 0.75,
  spinR: 7.5,
  spin: 0.35,
  maxIce: 200,
  off: false,
};
const SLIDE_AT = 0.3;
const iceSizeScale = (r, k) => 1 + Math.log(Math.max(1, r / (Math.max(0.5, iceParams.minR) * k)));
const SPECKS_PER_ICE = 1.5;
const rand = (a, b) => a + Math.random() * (b - a);
const FIELD_EVERY = 0.05;
class NebbiaSnowWater {
  constructor() {
    __publicField(this, 'drops', []);
    __publicField(this, 'trails', new NebbiaSnowTrails());
    __publicField(this, 'woken', []);
    /** 水珠纹理：这回改没改；有没有要立刻重画的（走动、吸走、并掉）；上次重画的时刻；最大的水珠看得见的半径（吸水时查多远）。 */
    __publicField(this, 'changed', true);
    __publicField(this, 'urgent', true);
    __publicField(this, 'fieldAt', -Infinity);
    __publicField(this, 'maxR', 40);
    __publicField(this, 'grid', new NebbiaSnowGrid());
    __publicField(this, 'W', 1);
    __publicField(this, 'H', 1);
    /** 画面高 / 1000：库的像素参数按它缩放。 */
    __publicField(this, 'k', 1);
    __publicField(this, 'time', 0);
    /** 上一帧窗上的小冰点数（MAX_SPECKS 用）。 */
    __publicField(this, 'specks', 0);
    /** 上一帧在冻、在滑的冰珠数（不算小冰点）：到 iceParams.maxIce 了新的先不冻。冰珠蒸发得慢、滑得慢，不封顶会攒到上千颗，又碍眼又费 CPU。 */
    __publicField(this, 'frozen', 0);
    /** 打滑程度（库的 slipRate，0..1）。雪窗用 0：挂得最牢，化出的水多半留在原地，要并得很大才往下滑。 */
    __publicField(this, 'slip', 0);
    /** 能滑的最小质量（画面高 1000 时）：库里没有这个门槛，小水珠也会随机滑一小段，雪窗水珠多，满屏都是一道道水痕。 */
    __publicField(this, 'stick', 1600);
    /** 按面积蒸发的时间常数（秒）。 */
    __publicField(this, 'evapTau', 150);
    /**
     * 沿边蒸发（每秒质量，乘 k·√质量，画面高 1000 时）：水从边上蒸发，小水珠相对边长多、干得快。
     * 一片常见的雪化出的水十来秒干，雪一直下时玻璃上的水二十来秒就稳住（库里每秒固定蒸发一点，小水珠要挂四五十秒，满屏越攒越多）。
     */
    __publicField(this, 'evapEdge', 2.6);
    /**
     * 一颗水珠最多多大（画面高 1000 时，看得见的半径 18；按 size 算，质量上限是 (这个 × 密度)²）：滑下去的水珠一路并掉别的会越滚越大，滑得越宽并得越多，
     * 到这么大以后多出来的当作摊成一层薄水膜流走，不再长（不然雪大、水多时能滚出半径近百像素的水珠、擦出一道道宽痕）。
     */
    __publicField(this, 'maxSize', 72);
  }
  resize(W, H) {
    if (W === this.W && H === this.H) return;
    this.W = W;
    this.H = H;
    this.k = H / 1e3;
    this.grid.reset(W, H, 70 * this.k * 0.3);
    this.drops.length = 0;
    this.trails.clear();
    this.woken = [];
    this.urgent = true;
    this.maxR = 40 * this.k;
  }
  /** 放一颗水珠：size 是精灵边长（看得见的半径约 size/4）。 */
  spawn(x, y, size, density = 1, spread = 0.5) {
    const d = {
      x,
      y,
      vx: 0,
      vy: 0,
      mass: (size * density) ** 2,
      density,
      sx: spread,
      sy: spread,
      resist: 0,
      shift: 0,
      nextMotion: 0,
      lastTx: x,
      lastTy: y,
      nextTrail: rand(20, 30) * this.k,
      parent: null,
      dead: false,
      pin: null,
      wipe: null,
      awake: false,
      cell: -1,
      wokeMass: 0,
      wokeX: 0,
      wokeY: 0,
      still: 0,
      ice: 0,
      iceV: 1,
      iceDur: 1,
      rot: Math.random() * Math.PI * 2,
      speck: false,
      slid: 0,
      tilt: 0,
    };
    this.drops.push(d);
    this.grid.place(d);
    this.wake(d);
    return d;
  }
  /** 变大了（外面加了水）或刚放下：这一帧查合并。 */
  wake(d) {
    if (!d.awake && !d.dead) {
      d.awake = true;
      d.wokeMass = d.mass;
      d.wokeX = d.x;
      d.wokeY = d.y;
      this.woken.push(d);
    }
  }
  /**
   * 慢慢变大（还在化的雪往底下钉住的水珠里一点点加水）：比上次查合并时重了 5% 以上才再查。
   * 合并距离和半径成正比，每帧长那一点点碰不上新的水珠，不用每帧都查。
   */
  grew(d) {
    if (d.mass > d.wokeMass * 1.05) this.wake(d);
  }
  /** 外面直接拿走一颗（雪被抹掉时它底下的水珠）：水珠纹理立刻重画。 */
  kill(d) {
    d.dead = true;
    this.urgent = true;
  }
  /** 精灵边长（横、竖）。 */
  size(d) {
    return [this.sizeX(d), ((d.sy + 1) * Math.sqrt(Math.max(0, d.mass))) / d.density];
  }
  /** 精灵横向边长（热路径用，不分配数组）。 */
  sizeX(d) {
    return ((d.sx + 1) * Math.sqrt(Math.max(0, d.mass))) / d.density;
  }
  step(dt) {
    if (dt <= 0) return;
    this.time += dt;
    const spread = 0.01 ** dt;
    for (let i = 0; i < this.drops.length; i += 1)
      if (!this.drops[i].dead) this.move(this.drops[i], dt, spread);
    this.collide();
    let specks = 0,
      frozen = 0;
    for (const d of this.drops) {
      if (d.speck) specks += 1;
      else if (d.ice > 0) frozen += 1;
    }
    this.specks = specks;
    this.frozen = frozen;
    for (let i = this.drops.length - 1; i >= 0; i -= 1) {
      const d = this.drops[i];
      if (!d.dead) continue;
      this.endWipe(d);
      this.grid.unplace(d);
      this.drops[i] = this.drops[this.drops.length - 1];
      this.drops.pop();
    }
  }
  // 一颗水珠走 dt 秒（库的 updateRaindrop）
  move(d, dt, spread) {
    const k = this.k;
    d.mass = Math.min(d.mass, this.massCap(d));
    d.mass -=
      (this.evapEdge * k * Math.sqrt(Math.max(0, d.mass)) + d.mass / this.evapTau) *
      dt *
      (1 - 0.85 * d.ice);
    if (d.mass <= 0) {
      d.dead = true;
      return;
    }
    d.sx *= spread;
    d.sy *= spread;
    if (d.pin) {
      d.x = d.pin.x;
      d.y = d.pin.y;
      d.vx = d.vy = 0;
      d.still = 0;
      return;
    }
    if (this.freeze(d, dt)) return;
    if (d.vy === 0 && d.mass < this.stick * k * k) {
      if (d.wipe) this.endWipe(d);
      return;
    }
    if (this.time >= d.nextMotion) {
      d.nextMotion = this.time + rand(0.1, 0.4);
      const maxResist = (30 + 40 * (1 - this.slip)) ** 2 * k * k * 4;
      d.resist = Math.random() * 2400 * k * maxResist;
      d.shift = Math.random() * rand(0, 0.1);
      if (d.mass < this.stick * k * k) d.resist = Math.max(d.resist, 2 * 2400 * k * d.mass);
    }
    const acc = (2400 * k * d.mass - d.resist) / d.mass;
    d.vy = Math.max(0, d.vy + acc * dt);
    d.vx = d.vy * d.shift;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.sy = Math.max(d.sy, (0.3 * 2 * Math.atan(d.vy * 5e-3)) / Math.PI);
    if (d.y > this.H + 100) {
      d.dead = true;
      return;
    }
    this.grid.place(d);
    if (d.vy > 8 * k) {
      d.wipe = this.trails.track(d.wipe, d.x, d.y, this.sizeX(d) * 0.3);
      this.wake(d);
      this.urgent = true;
    } else this.endWipe(d);
    if (Math.hypot(d.x - d.lastTx, d.y - d.lastTy) > d.nextTrail) this.split(d);
  }
  /** 结冰：停够了开始冻、冻着的往下挪；挪动由这里管了返回 true（不再走库的受力）。 */
  freeze(d, dt) {
    const p = iceParams,
      k = this.k;
    if (d.speck) {
      d.ice = 1;
      return true;
    }
    if (d.ice === 0) {
      if (p.off || d.vy > 0 || this.sizeX(d) / 4 < p.minR * k) {
        d.still = 0;
        return false;
      }
      d.still += dt;
      const scale = iceSizeScale(this.sizeX(d) / 4, k);
      if (d.still < p.freezeAfter * scale || this.frozen >= p.maxIce) return false;
      this.frozen += 1;
      d.ice = 1e-3;
      d.iceV = rand(0.65, 1.35);
      d.iceDur = Math.max(1, p.freezeDur * scale);
    }
    if (d.ice < 1)
      d.mass = Math.min(this.massCap(d), d.mass * Math.max(0.25, p.grow) ** ((2 * dt) / d.iceDur));
    d.ice = Math.min(1, d.ice + dt / d.iceDur);
    if (d.ice < SLIDE_AT) {
      d.vx = d.vy = 0;
      return true;
    }
    const v = p.slide * k * d.iceV * Math.min(1, (d.ice - SLIDE_AT) / 0.15);
    d.vy += (v - d.vy) * Math.min(1, dt * 2);
    d.vx = Math.sin(this.time * 0.7 + d.rot * 5) * d.vy * 0.15;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.y > this.H + 100) {
      d.dead = true;
      return true;
    }
    d.slid += d.vy * dt;
    const over = this.sizeX(d) / 4 / k - p.spinR;
    const amp = over > 0 ? p.spin * Math.min(1, over / 6) : 0;
    d.tilt += (amp * Math.sin(d.slid / (14 * k) + d.rot * 3) - d.tilt) * Math.min(1, dt * 3);
    this.grid.place(d);
    if (Math.abs(d.x - d.wokeX) + Math.abs(d.y - d.wokeY) > k) this.wake(d);
    else this.grew(d);
    if (d.vy * FIELD_EVERY > 0.25 * k) this.urgent = true;
    if (
      Math.hypot(d.x - d.lastTx, d.y - d.lastTy) > d.nextTrail &&
      d.mass > 300 * k * k &&
      this.specks < p.maxIce * SPECKS_PER_ICE
    ) {
      const t = this.spawn(
        d.x + rand(-1.5, 1.5) * k,
        d.y - this.sizeX(d) / 4,
        this.sizeX(d) * rand(0.18, 0.3),
        1,
        0,
      );
      t.speck = true;
      t.ice = 1;
      t.parent = d;
      d.mass -= t.mass;
      d.lastTx = d.x;
      d.lastTy = d.y;
      d.nextTrail = rand(10, 18) * k;
      this.specks += 1;
    }
    return true;
  }
  // 走过一段，身后分出一颗小水珠（库的 split）
  split(d) {
    if (d.mass < 1e3 * this.k * this.k) return;
    const [w, h] = this.size(d);
    const t = this.spawn(d.x + rand(-5, 5) * this.k, d.y - h / 4, w * rand(0.3, 0.5), 0.2, 0);
    t.sx = 0.1;
    t.sy = d.vy * 0.01 * 0.6;
    t.parent = d;
    d.mass -= t.mass;
    d.lastTx = d.x;
    d.lastTy = d.y;
    d.nextTrail = rand(20, 30) * this.k;
  }
  // 停下来了：它擦的那一道记下停的时刻，开始回雾
  endWipe(d) {
    if (d.wipe && d.wipe.end === null) d.wipe.end = this.time;
    d.wipe = null;
  }
  // 碰到就合并：大的吃掉小的，动量守恒（库的 collisionUpdate）。只拿这一帧动过、变大过（或刚放下）的去查
  collide() {
    const { cells, gw, gh, size: cell } = this.grid,
      list = this.woken;
    this.woken = [];
    for (const d of list) {
      d.awake = false;
      if (d.dead) continue;
      const cx = Math.floor(d.x / cell),
        cy = Math.floor(d.y / cell),
        md = this.mergeDistance(d);
      for (let gy = cy - 1; gy <= cy + 1; gy += 1)
        for (let gx = cx - 1; gx <= cx + 1; gx += 1) {
          if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
          for (const o of cells[gx + gy * gw]) {
            if (
              o === d ||
              o.dead ||
              o.parent === d ||
              d.parent === o ||
              (d.parent && d.parent === o.parent)
            )
              continue;
            if (Math.hypot(d.x - o.x, d.y - o.y) >= md + this.mergeDistance(o)) continue;
            const [big, small] = d.mass >= o.mass ? [d, o] : [o, d];
            const m = big.mass + small.mass;
            big.vx = (big.vx * big.mass + small.vx * small.mass) / m;
            big.vy = (big.vy * big.mass + small.vy * small.mass) / m;
            big.density = (big.density * big.mass + small.density * small.mass) / m;
            big.mass = Math.min(m, this.massCap(big));
            big.ice = big.ice > 0 ? (big.ice * (m - small.mass) + small.ice * small.mass) / m : 0;
            if (big.ice < 1e-3) big.ice = 0;
            big.speck = big.speck && small.speck;
            small.dead = true;
            this.urgent = true;
            this.wake(big);
            if (small === d) break;
          }
          if (d.dead) break;
        }
    }
  }
  /**
   * 吸走挨着这些线段的水珠（每段 5 个数：x0、y0、x1、y1、宽）：水珠边碰到线段两边 pad 以内就算。
   * 只查线段附近几格；吸走的这一帧不再画，下一次 step 清掉。
   */
  absorb(segs, pad) {
    this.grid.alongSegments(
      segs,
      pad,
      this.maxR,
      (d) => this.sizeX(d) / 4,
      (d) => this.kill(d),
    );
  }
  /** (x, y) 落在哪颗水珠上：看得见的半径再加 extra 以内的第一颗，没有返回 null。 */
  near(x, y, extra) {
    return arrayAt(this.grid, x, y, extra, (d) => this.sizeX(d) / 4);
  }
  massCap(d) {
    return (this.maxSize * this.k * d.density) ** 2;
  }
  mergeDistance(d) {
    return this.sizeX(d) * (1 + d.sx) * 0.16;
  }
  /** 水珠走过的地方把雾擦薄（nebbiaSnowTrails.ts）。 */
  drawFog(ctx, hold, refog) {
    this.trails.draw(ctx, this.time, hold, refog);
  }
  /** 水珠实例（nebbiaDrops.ts 的格式：x、y、宽、高、折射强度、alpha）：看得见的半径 size/4，四边形是它的 8 倍。 */
  /** 没变到要重画时原样返回 out、changed 为 false。 */
  instances(out) {
    this.changed = this.urgent || this.time - this.fieldAt >= FIELD_EVERY;
    if (!this.changed) return out;
    this.urgent = false;
    this.fieldAt = this.time;
    out.length = 0;
    let maxR = 0;
    for (const d of this.drops) {
      const s = Math.sqrt(Math.max(0, d.mass)) / d.density,
        w = (d.sx + 1) * s,
        h = (d.sy + 1) * s;
      if (w < 2 || d.dead) continue;
      out.push(d.x, d.y, w * 2, h * 2, w / 50, 1);
      maxR = Math.max(maxR, w / 4);
    }
    this.maxR = maxR + 2 * this.k;
    return out;
  }
}
export { NebbiaSnowWater, iceParams, iceSizeScale };
