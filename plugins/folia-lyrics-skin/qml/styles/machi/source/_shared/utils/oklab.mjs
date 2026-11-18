// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/utils/oklab.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../../environment.mjs';
const GAMUT_EPSILON = 1e-4;
const toLinear = (channel) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
};
const fromLinear = (value) =>
  255 * (value <= 31308e-7 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055);
const linearFromOklab = ({ L, a, b }) => {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
};
const srgbToOklab = ({ r, g, b }) => {
  const red = toLinear(r);
  const green = toLinear(g);
  const blue = toLinear(b);
  const l = Math.cbrt(0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue);
  const m = Math.cbrt(0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue);
  const s = Math.cbrt(0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
};
const oklabToSrgb = (lab) => {
  const [red, green, blue] = linearFromOklab(lab).map((value) =>
    fromLinear(Math.max(0, Math.min(1, value))),
  );
  return { r: red, g: green, b: blue };
};
const oklabToOklch = ({ L, a, b }) => {
  const hue = (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C: Math.hypot(a, b), h: hue < 0 ? hue + 360 : hue };
};
const oklchToOklab = ({ L, C, h }) => {
  const radians = (h * Math.PI) / 180;
  return { L, a: C * Math.cos(radians), b: C * Math.sin(radians) };
};
const srgbToOklch = (channels) => oklabToOklch(srgbToOklab(channels));
const isInGamut = (lab) =>
  linearFromOklab(lab).every((value) => value >= -GAMUT_EPSILON && value <= 1 + GAMUT_EPSILON);
const fitOklchToSrgb = (color) => {
  const L = Math.max(0, Math.min(1, color.L));
  const target = { L, C: Math.max(0, color.C), h: color.h };
  if (isInGamut(oklchToOklab(target))) return target;
  let low = 0;
  let high = target.C;
  for (let step = 0; step < 16; step += 1) {
    const middle = (low + high) / 2;
    if (isInGamut(oklchToOklab({ L, C: middle, h: color.h }))) {
      low = middle;
    } else {
      high = middle;
    }
  }
  return { L, C: low, h: color.h };
};
const oklabDistance = (from, to) => Math.hypot(from.L - to.L, from.a - to.a, from.b - to.b);
export {
  fitOklchToSrgb,
  oklabDistance,
  oklabToOklch,
  oklabToSrgb,
  oklchToOklab,
  srgbToOklab,
  srgbToOklch,
};
