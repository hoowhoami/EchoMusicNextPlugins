// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSnowDraw.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../environment.mjs';
import { FLAKE_STAGES } from './nebbiaSnowFlakes.mjs';
import { FLAKE_FLOATS } from './nebbiaSnowGl.mjs';
import { ICE_FLOATS } from './nebbiaInkIce.mjs';
const APPROACH_Z = 5;
const packFlake = (f, out, o) => {
  let x = f.x,
    y = f.y,
    r = f.r,
    scx = 1,
    scy = 1,
    alpha = 0.92,
    focus = 1;
  const p = Math.min(1, f.age / f.app);
  if (p < 1) {
    const q = (1 - p) ** 1.2,
      bend = Math.sin(Math.PI * p) * f.curl,
      fl = f.fa * q;
    x += f.ox * q - f.oy * bend + Math.sin(f.age * f.ff + f.fp) * fl;
    y += f.oy * q + f.ox * bend + Math.cos(f.age * f.ff * 0.7 + f.fp) * fl;
    const s = 1 / (1 + (APPROACH_Z - 1) * (1 - p));
    r *= s;
    focus = (s - 1 / APPROACH_Z) / (1 - 1 / APPROACH_Z);
    alpha *= Math.min(1, p / 0.15) * (0.35 + 0.65 * focus);
  } else {
    const e = Math.exp(-(f.age - f.app) * 14);
    scx = 1 + 0.07 * e;
    scy = 1 - 0.08 * e;
    y -= f.r * 0.1 * f.melt;
  }
  out[o] = x;
  out[o + 1] = y;
  out[o + 2] = r;
  out[o + 3] = f.rot;
  out[o + 4] = Math.min(f.melt * (FLAKE_STAGES - 1), FLAKE_STAGES - 1.001);
  out[o + 5] = f.kind.row;
  out[o + 6] = alpha;
  out[o + 7] = focus;
  out[o + 8] = scx;
  out[o + 9] = scy;
};
const packFlakes = (flakes, buf, start = 0) => {
  const n = start + flakes.length;
  if (buf.length < n * FLAKE_FLOATS) buf = new Float32Array(Math.ceil(n * 1.5) * FLAKE_FLOATS);
  for (let i = 0; i < flakes.length; i += 1) packFlake(flakes[i], buf, (start + i) * FLAKE_FLOATS);
  return buf;
};
const packIce = (drops, radius, beads, buf, start) => {
  let n = 0;
  for (const d of drops) if (d.ice > 0 && !d.dead) n += 1;
  if (buf.length < (start + n) * FLAKE_FLOATS) {
    const next = new Float32Array(Math.ceil((start + n) * 1.5) * FLAKE_FLOATS);
    next.set(buf.subarray(0, start * FLAKE_FLOATS));
    buf = next;
  }
  let o = start * FLAKE_FLOATS;
  for (const d of drops) {
    if (!(d.ice > 0) || d.dead) continue;
    const kind = beads[Math.floor(d.rot * 10) % beads.length];
    const r = radius(d);
    buf[o] = d.x;
    buf[o + 1] = d.y + r * (0.42 + 0.2 * d.sy);
    buf[o + 2] = r * 1.05;
    buf[o + 3] = d.rot + d.tilt;
    buf[o + 4] = Math.min((1 - d.ice) * (FLAKE_STAGES - 1), FLAKE_STAGES - 1.001);
    buf[o + 5] = kind.row;
    buf[o + 6] = 0.9 * Math.min(1, d.ice * 5);
    buf[o + 7] = 1;
    buf[o + 8] = 1 + d.sx * 0.5;
    buf[o + 9] = 1 + d.sy * 0.5;
    o += FLAKE_FLOATS;
  }
  return [buf, n];
};
const packInkIce = (ice, beads, buf, start) => {
  const n = ice.length / ICE_FLOATS;
  if (buf.length < (start + n) * FLAKE_FLOATS) {
    const next = new Float32Array(Math.ceil((start + n) * 1.5) * FLAKE_FLOATS);
    next.set(buf.subarray(0, start * FLAKE_FLOATS));
    buf = next;
  }
  for (let i = 0; i < n; i += 1) {
    const q = i * ICE_FLOATS,
      o = (start + i) * FLAKE_FLOATS,
      frozen = ice[q + 3];
    buf[o] = ice[q];
    buf[o + 1] = ice[q + 1];
    buf[o + 2] = ice[q + 2];
    buf[o + 3] = ice[q + 4];
    buf[o + 4] = Math.min((1 - frozen) * (FLAKE_STAGES - 1), FLAKE_STAGES - 1.001);
    buf[o + 5] = beads[Math.floor(Math.abs(ice[q + 4]) * 10) % beads.length].row;
    buf[o + 6] = 0.9 * Math.min(1, frozen * 5) * ice[q + 5];
    buf[o + 7] = 1;
    buf[o + 8] = 1;
    buf[o + 9] = 1;
  }
  return [buf, n];
};
export { packFlakes, packIce, packInkIce };
