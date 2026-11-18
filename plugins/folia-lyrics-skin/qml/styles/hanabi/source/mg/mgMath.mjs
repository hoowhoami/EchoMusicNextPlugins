// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/mg/mgMath.ts
const TAU = Math.PI * 2;
const clamp01 = (value) => (value <= 0 ? 0 : value >= 1 ? 1 : value);
const clamp = (value, low, high) => (value < low ? low : value > high ? high : value);
const lerp = (a, b, t) => a + (b - a) * t;
const fract = (value) => value - Math.floor(value);
const wrap = (value, span) => value - span * Math.floor(value / span);
const easeOutQuad = (t) => 1 - (1 - clamp01(t)) ** 2;
const easeOutCubic = (t) => 1 - (1 - clamp01(t)) ** 3;
const easeInCubic = (t) => clamp01(t) ** 3;
const easeInQuad = (t) => clamp01(t) ** 2;
const easeInOutCubic = (t) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
};
const easeOutExpo = (t) => {
  const x = clamp01(t);
  return x >= 1 ? 1 : 1 - 2 ** (-10 * x);
};
const easeOutBack = (t, overshoot = 1.70158) => {
  const x = clamp01(t) - 1;
  return 1 + x * x * ((overshoot + 1) * x + overshoot);
};
const easeInBack = (t, overshoot = 1.70158) => {
  const x = clamp01(t);
  return x * x * ((overshoot + 1) * x - overshoot);
};
const spring = (seconds, freq = 2.6, decay = 7) =>
  seconds <= 0 ? 0 : 1 - Math.exp(-decay * seconds) * Math.cos(TAU * freq * seconds);
const stepped = (t, steps) => Math.min(1, Math.floor(clamp01(t) * steps) / steps);
const beatSteps = (beats, snap = 0.35) => {
  const whole = Math.floor(beats);
  return whole + easeOutBack(fract(beats) / snap, 2.2);
};
const hash01 = (n, salt = 0) => fract(Math.sin(n * 127.1 + salt * 311.7) * 43758.5453123);
const hashString = (key) => {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
const mixColor = (a, b, t) => {
  const k = clamp01(t);
  if (k <= 0) return a;
  if (k >= 1) return b;
  const r = Math.round(((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * k);
  return (r << 16) | (g << 8) | bl;
};
const WHITE = 16777215;
const GOLD = 16762720;
const EMBER = 16751164;
export {
  EMBER,
  GOLD,
  TAU,
  WHITE,
  beatSteps,
  clamp,
  clamp01,
  easeInBack,
  easeInCubic,
  easeInOutCubic,
  easeInQuad,
  easeOutBack,
  easeOutCubic,
  easeOutExpo,
  easeOutQuad,
  fract,
  hash01,
  hashString,
  lerp,
  mixColor,
  spring,
  stepped,
  wrap,
};
