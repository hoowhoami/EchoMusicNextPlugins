// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaInkIce.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
import { iceParams, iceSizeScale } from './nebbiaSnowWater.mjs';
const ICE_FLOATS = 6;
const hash = (s) => {
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const pushCore = (out, x, y, r, ice, rot, alpha) => {
  out.push(x, y + r * 0.42, r * 1.05, ice, rot, alpha);
};
const putInkBead = (ink, x, y, r, alpha, age, seed, sx = 1, sy = 1) => {
  const ice = ink.ice,
    p = iceParams;
  if (!ice || p.off || age < 0 || r < p.minR * ice.k) {
    ink.motion.put(x, y, r, alpha, sx, sy);
    return;
  }
  const h = hash(seed),
    k = ice.k;
  const scale = iceSizeScale(r, k);
  const t = age - p.freezeAfter * scale * (0.7 + 0.6 * h);
  if (t <= 0) {
    ink.motion.put(x, y, r, alpha, sx, sy);
    return;
  }
  const dur = Math.max(1, p.freezeDur * scale),
    frozen = Math.min(1, t / dur);
  const R = r * Math.max(0.25, p.grow) ** frozen;
  const sag =
    Math.min(2 * k, 0.5 * k * Math.max(0, R / (p.minR * k) - 1)) *
    frozen *
    frozen *
    (3 - 2 * frozen);
  ink.motion.put(x, y + sag, R, alpha, sx, sy);
  pushCore(ice.out, x, y + sag, R, frozen, h * Math.PI * 2, alpha);
};
export { ICE_FLOATS, putInkBead };
