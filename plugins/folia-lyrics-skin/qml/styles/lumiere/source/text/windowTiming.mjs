// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { glyphProgress } from './reveal.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (1192 ^ lumiereScaleMask) +
  Math.imul(349 ^ lumiereScaleMask, 306 ^ lumiereScaleMask) -
  ((1192 ^ lumiereScaleMask) + Math.imul(349 ^ lumiereScaleMask, 306 ^ lumiereScaleMask));
const flightProgress = (flight, phase, lag = 0) => {
  const t = Math.min(1, Math.max(0, (phase - flight.delay - lag) / flight.duration));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
const flightPoint = (flight, from, to, s) => {
  const u = 1 - s;
  const a = u * u * u,
    b = 3 * u * u * s,
    c = 3 * u * s * s,
    d = s * s * s;
  return {
    x: a * from.x + b * (from.x + flight.c1.x) + c * (to.x + flight.c2.x) + d * to.x,
    y: a * from.y + b * (from.y + flight.c1.y) + c * (to.y + flight.c2.y) + d * to.y,
  };
};
const TRACK_TIME = 0.45 + LUMIERE_NEUTRAL_OFFSET;
const TRACK_SAMPLES = 20;
const LEAD = 1.2;
const SLIDE = 1.5;
const SLIDE_LAG = { [-2]: 0, [-1]: 0.15, 0: 0.3, 1: 0.5, 2: 0.6 };
const MAX_LAG = 0.6;
const DRIFT_SPEED = [0.013, 0.022];
const ORBIT = 0.03;
const LIGHT_UP = 0.3;
const SPOT_WINDOW = 0.3;
const SPOT_SAMPLES = 8;
const GATHER_LEAD = 1.6;
const GATHER = 1.8;
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
};
const easeInOutSine = (value) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, value)))) / 2;
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const lerp = (a, b, k) => a + (b - a) * k;
const lerpPoint = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
const resolveWindowCursor = (lines, time) => {
  let current = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startTime - LEAD <= time) current = i;
    else break;
  }
  const phase = current < 0 ? 1 : clamp01((time - (lines[current].startTime - LEAD)) / SLIDE);
  return { current, phase, slide: easeInOutSine(phase) };
};
const resolveLinePhase = (lines, current, relative, time) => {
  var _a;
  if (current < 0) return { phase: 1, start: Number.NEGATIVE_INFINITY };
  const start =
    lines[current].startTime -
    LEAD +
    ((_a = SLIDE_LAG[Math.max(-2, Math.min(2, relative))]) != null ? _a : 0);
  return { phase: clamp01((time - start) / SLIDE), start };
};
const singingPosition = (glyphs, time) => {
  let position = 0;
  for (const glyph of glyphs) position += glyphProgress(glyph.timing, time);
  return position;
};
const positionToX = (glyphs, position) => {
  const n = glyphs.length;
  if (n === 0) return 0;
  const index = Math.min(n - 1, Math.max(0, position - 0.5));
  const lower = Math.floor(index);
  const upper = Math.min(n - 1, lower + 1);
  return glyphs[lower].center + (glyphs[upper].center - glyphs[lower].center) * (index - lower);
};
const resolveSpotX = (glyphs, time, window = SPOT_WINDOW) => {
  if (window <= 0) return positionToX(glyphs, singingPosition(glyphs, time));
  let x = 0;
  for (let s = 0; s < SPOT_SAMPLES; s += 1) {
    x += positionToX(glyphs, singingPosition(glyphs, time - (window * s) / (SPOT_SAMPLES - 1)));
  }
  return x / SPOT_SAMPLES;
};
const decayAmount = (decay, litAt, time) => {
  const age = time - litAt - decay.delay;
  return age > 0 ? decay.strength * 0.08 * age ** 1.5 : 0;
};
const DISSOLVE_FROM = 1;
const DISSOLVE_SPAN = 2;
export {
  DISSOLVE_FROM,
  DISSOLVE_SPAN,
  DRIFT_SPEED,
  GATHER,
  GATHER_LEAD,
  LEAD,
  LIGHT_UP,
  MAX_LAG,
  ORBIT,
  SLIDE,
  TRACK_SAMPLES,
  TRACK_TIME,
  clamp01,
  decayAmount,
  easeInOutCubic,
  easeInOutSine,
  flightPoint,
  flightProgress,
  lerp,
  lerpPoint,
  resolveLinePhase,
  resolveSpotX,
  resolveWindowCursor,
  smooth,
};
