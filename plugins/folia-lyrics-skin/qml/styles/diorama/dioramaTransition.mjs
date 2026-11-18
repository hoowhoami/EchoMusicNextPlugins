// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import { hashSeed, seededUnit } from './cameraPath.mjs';
const TRANSITION_DURATION = 3.2,
  TRANSITION_DISTANCE = 46,
  TRANSITION_BANK = 0.14,
  TRANSITION_AIM_SWEEP = 0.14,
  flightPerp = (from, to) => {
    const perp = { x: to.z - from.z, y: 0, z: -(to.x - from.x) },
      l = Math.hypot(perp.x, perp.y, perp.z);
    return l < 1e-3 ? { x: 1, y: 0, z: 0 } : { x: perp.x / l, y: perp.y / l, z: perp.z / l };
  },
  flightSide = (seed, epoch) => (seededUnit(hashSeed(seed) + epoch * 17) < 0.5 ? -1 : 1),
  len = (a) => Math.hypot(a.x, a.y, a.z),
  scaleTo = (a, target) => {
    const l = len(a) || 1;
    return { x: (a.x / l) * target, y: (a.y / l) * target, z: (a.z / l) * target };
  },
  pickTransitionOffset = (seed, epoch) => {
    const base = hashSeed(seed) + epoch * 131,
      azimuth = seededUnit(base + 1) * Math.PI * 2,
      elevation = (seededUnit(base + 2) - 0.35) * 1.3,
      ce = Math.cos(elevation),
      dir = {
        x: Math.sin(azimuth) * ce,
        y: Math.sin(elevation),
        z: -Math.abs(Math.cos(azimuth) * ce) - 0.35,
      };
    return scaleTo(dir, TRANSITION_DISTANCE);
  },
  transitionEase = (t) => {
    const c = Math.min(1, Math.max(0, t));
    return c * c * c * (c * (c * 6 - 15) + 10);
  },
  bezierControl = (from, to, seed, epoch) => {
    const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, z: (from.z + to.z) / 2 },
      flightLen = len({ x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }) || 1,
      perp = flightPerp(from, to),
      side = flightSide(seed, epoch),
      bow = flightLen * 0.32;
    return {
      x: mid.x + perp.x * bow * side,
      y: mid.y + bow * 0.55,
      z: mid.z + perp.z * bow * side,
    };
  },
  bezierArc = (from, control, to, t) => {
    const mt = 1 - t,
      a = mt * mt,
      b = 2 * mt * t,
      c = t * t;
    return {
      x: a * from.x + b * control.x + c * to.x,
      y: a * from.y + b * control.y + c * to.y,
      z: a * from.z + b * control.z + c * to.z,
    };
  };
export {
  TRANSITION_AIM_SWEEP,
  TRANSITION_BANK,
  TRANSITION_DISTANCE,
  TRANSITION_DURATION,
  bezierArc,
  bezierControl,
  flightPerp,
  flightSide,
  pickTransitionOffset,
  transitionEase,
};
