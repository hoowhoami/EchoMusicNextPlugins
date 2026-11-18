// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaGlyphs.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
import { iconPolys as nativeIconPolys } from '../icons.mjs';
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import { resolveLucideIconNode } from '../icons.mjs';
import { clamp } from './nebbiaConstants.mjs';
import { ICON_PREFIX } from './nebbiaChars.mjs';
import { skeletonPolys } from './nebbiaSkeleton.mjs';
import { getNebbiaStrokeMedians } from '../strokes.mjs';
const measureGlyph = (polys) => {
  let total = 0;
  const strokes = polys
    .filter((p) => p.length > 1)
    .map((pts) => {
      const cum = [0];
      for (let i = 1; i < pts.length; i += 1)
        cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      total += cum[cum.length - 1];
      return { pts, cum, len: cum[cum.length - 1] };
    })
    .filter((s) => s.len > 5e-3);
  return strokes.length ? { strokes, total } : null;
};
const catmull = (pts, n) => {
  if (pts.length < 3) return pts;
  const out = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k += 1) {
      const t = k / n,
        t2 = t * t,
        t3 = t2 * t;
      const at = (j) =>
        0.5 *
        (2 * p1[j] +
          (-p0[j] + p2[j]) * t +
          (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 +
          (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
let iconSvg = null;
const iconPolys = nativeIconPolys;
class NebbiaGlyphCache {
  constructor(fontFamily, fontWeight) {
    __publicField(this, 'fontFamily', fontFamily);
    __publicField(this, 'fontWeight', fontWeight);
    __publicField(this, 'cache', /* @__PURE__ */ new Map());
    __publicField(this, 'font', '');
    this.font = `${fontWeight} ${fontFamily}`;
  }
  /** 换字体时清空缓存；返回字体是否真的变了。 */
  setFont(fontFamily, fontWeight) {
    const font = `${fontWeight} ${fontFamily}`;
    if (font === this.font) return false;
    this.fontFamily = fontFamily;
    this.fontWeight = fontWeight;
    this.font = font;
    this.cache.clear();
    return true;
  }
  clear() {
    this.cache.clear();
  }
  /** 主题字体是否已经能用（没在等加载）；没有 FontFaceSet 时当作能用。 */
  fontReady() {
    var _a, _b;
    try {
      return (_b =
        (_a = document.fonts) == null
          ? void 0
          : _a.check(`${this.fontWeight} 16px ${this.fontFamily}`)) != null
        ? _b
        : true;
    } catch (e) {
      return true;
    }
  }
  get(ch) {
    const hit = this.cache.get(ch);
    if (hit !== void 0) return hit;
    let polys = null;
    const medians = getNebbiaStrokeMedians(ch);
    if (ch.startsWith(ICON_PREFIX)) polys = iconPolys(ch.slice(ICON_PREFIX.length));
    else if (medians)
      polys = medians.map((m) =>
        catmull(
          m.map(([x, y]) => [x / 1024, y / 1024]),
          6,
        ),
      );
    else if (ch.trim()) polys = skeletonPolys(ch, this.fontFamily, this.fontWeight);
    const glyph = polys ? measureGlyph(polys) : null;
    this.cache.set(ch, glyph);
    return glyph;
  }
}
const warpGlyph = (g, rnd, j) => {
  var _a;
  if (j <= 0) return g;
  const r = () => rnd() * 2 - 1;
  const shear = r() * 0.16 * j,
    sx = 1 + r() * 0.1 * j,
    sy = 1 + r() * 0.1 * j;
  const bx = r() * 0.035 * j,
    by = r() * 0.035 * j,
    px = rnd() * 6.28,
    py = rnd() * 6.28;
  const whole = ([x, y]) => {
    let u = (x - 0.5) * sx,
      v = (y - 0.5) * sy;
    u += v * shear;
    u += bx * Math.sin(v * Math.PI * 1.6 + px);
    v += by * Math.sin(u * Math.PI * 1.6 + py);
    return [u + 0.5, v + 0.5];
  };
  const sj = clamp(8 / g.strokes.length, 0.35, 1);
  const polys = g.strokes.map((st) => {
    const pts = st.pts,
      n = pts.length;
    const cx = pts.reduce((a, p) => a + p[0], 0) / n,
      cy = pts.reduce((a, p) => a + p[1], 0) / n;
    const rot = r() * 0.09 * j * sj,
      len = 1 + r() * 0.1 * j * sj,
      ox = r() * 0.022 * j * sj,
      oy = r() * 0.022 * j * sj;
    const cr = Math.cos(rot),
      sr = Math.sin(rot),
      [x0, y0] = pts[0];
    const tremor = 6e-3 * j,
      tf = 18 + rnd() * 14,
      tp = rnd() * 6.28;
    return pts.map(([x, y], i) => {
      let u = x0 + (x - x0) * len,
        v = y0 + (y - y0) * len;
      const du = u - cx,
        dv = v - cy;
      u = cx + du * cr - dv * sr + ox;
      v = cy + du * sr + dv * cr + oy;
      const a = pts[Math.max(0, i - 1)],
        b = pts[Math.min(n - 1, i + 1)];
      const tx = b[0] - a[0],
        ty = b[1] - a[1],
        tl = Math.hypot(tx, ty) || 1;
      const k = Math.sin(st.cum[i] * tf + tp) * tremor;
      return whole([u - (ty / tl) * k, v + (tx / tl) * k]);
    });
  });
  return (_a = measureGlyph(polys)) != null ? _a : g;
};
const pointAt = (st, s) => {
  const { pts, cum } = st;
  let i = 1;
  while (i < pts.length - 1 && cum[i] < s) i += 1;
  const a = pts[i - 1],
    b = pts[i],
    L = Math.max(1e-6, cum[i] - cum[i - 1]),
    k = clamp((s - cum[i - 1]) / L);
  const dx = (b[0] - a[0]) / L,
    dy = (b[1] - a[1]) / L;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, -dy, dx];
};
export { NebbiaGlyphCache, measureGlyph, pointAt, warpGlyph };
