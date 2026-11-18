// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/utils/themeColorMath.ts
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
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { parseColorChannels } from '../components/visualizer/colorMix.mjs';
import {
  fitOklchToSrgb,
  oklabDistance,
  oklabToSrgb,
  oklchToOklab,
  srgbToOklab,
  srgbToOklch,
} from './oklab.mjs';
const FALLBACK_THEME_COLOR = '#4f7cff';
const clamp01 = (value) => Math.max(0, Math.min(1, value));
const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));
const normalizeHue = (hue) => ((hue % 360) + 360) % 360;
const parseThemeColor = (value) => {
  const channels = typeof value === 'string' ? parseColorChannels(value) : null;
  if (!channels) {
    return null;
  }
  return {
    r: clampChannel(channels.r),
    g: clampChannel(channels.g),
    b: clampChannel(channels.b),
  };
};
const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`;
const rgbToHsl = ({ r, g, b }) => {
  const red = clampChannel(r) / 255;
  const green = clampChannel(g) / 255;
  const blue = clampChannel(b) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }
  return { h: normalizeHue(hue * 60), s: clamp01(saturation), l: clamp01(lightness) };
};
const hslToRgb = ({ h, s, l }) => {
  const hue = normalizeHue(h);
  const saturation = clamp01(s);
  const lightness = clamp01(l);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const offset = lightness - chroma / 2;
  const sector = Math.floor(hue / 60) % 6;
  const [r, g, b] =
    sector === 0
      ? [chroma, secondary, 0]
      : sector === 1
        ? [secondary, chroma, 0]
        : sector === 2
          ? [0, chroma, secondary]
          : sector === 3
            ? [0, secondary, chroma]
            : sector === 4
              ? [secondary, 0, chroma]
              : [chroma, 0, secondary];
  return {
    r: clampChannel((r + offset) * 255),
    g: clampChannel((g + offset) * 255),
    b: clampChannel((b + offset) * 255),
  };
};
const hexToHsl = (color) => {
  const parsed = parseThemeColor(color);
  return parsed ? rgbToHsl(parsed) : null;
};
const hslToHex = (hsl) => rgbToHex(hslToRgb(hsl));
const mixHexColors = (from, to, amount) => {
  const start = parseThemeColor(from);
  const end = parseThemeColor(to);
  if (!start || !end) {
    return rgbToHex(
      parseThemeColor(to) || parseThemeColor(from) || parseThemeColor(FALLBACK_THEME_COLOR),
    );
  }
  const ratio = clamp01(amount);
  return rgbToHex({
    r: start.r + (end.r - start.r) * ratio,
    g: start.g + (end.g - start.g) * ratio,
    b: start.b + (end.b - start.b) * ratio,
  });
};
const getRelativeLuminance = (color) => {
  const parsed = parseThemeColor(color);
  if (!parsed) return 0;
  const transform = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(parsed.r) + 0.7152 * transform(parsed.g) + 0.0722 * transform(parsed.b);
};
const getContrastRatio = (foreground, background) => {
  const luminanceA = getRelativeLuminance(foreground);
  const luminanceB = getRelativeLuminance(background);
  const [lighter, darker] =
    luminanceA > luminanceB ? [luminanceA, luminanceB] : [luminanceB, luminanceA];
  return (lighter + 0.05) / (darker + 0.05);
};
const getHueDistance = (a, b) => {
  const distance = Math.abs(normalizeHue(a) - normalizeHue(b));
  return Math.min(distance, 360 - distance);
};
const adjustLightnessForContrast = (color, background, minRatio, step = 0.02, maxSteps = 50) => {
  const hsl = hexToHsl(color);
  if (!hsl) {
    return color;
  }
  const goDarker = getRelativeLuminance(background) > 0.35;
  const direction = goDarker ? -1 : 1;
  let bestColor = hslToHex(hsl);
  let bestRatio = getContrastRatio(bestColor, background);
  for (let index = 0; index <= maxSteps; index += 1) {
    const lightness = clamp01(hsl.l + direction * step * index);
    const candidate = hslToHex(__spreadProps(__spreadValues({}, hsl), { l: lightness }));
    const ratio = getContrastRatio(candidate, background);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = candidate;
    }
    if (ratio >= minRatio) {
      return candidate;
    }
    if (index > 0 && (lightness === 0 || lightness === 1)) {
      break;
    }
  }
  return bestColor;
};
const hexToOklch = (color) => {
  const parsed = parseThemeColor(color);
  return parsed ? srgbToOklch(parsed) : null;
};
const getOklabDistance = (from, to) => {
  const start = parseThemeColor(from);
  const end = parseThemeColor(to);
  return start && end ? oklabDistance(srgbToOklab(start), srgbToOklab(end)) : Infinity;
};
const oklchToHex = (color) => rgbToHex(oklabToSrgb(oklchToOklab(fitOklchToSrgb(color))));
const adjustOklchLightnessForContrast = (
  color,
  background,
  minRatio,
  step = 0.01,
  maxSteps = 100,
) => {
  const direction = getRelativeLuminance(background) > 0.35 ? -1 : 1;
  let bestColor = oklchToHex(color);
  let bestRatio = getContrastRatio(bestColor, background);
  for (let index = 0; index <= maxSteps; index += 1) {
    const lightness = clamp01(color.L + direction * step * index);
    const candidate = oklchToHex(__spreadProps(__spreadValues({}, color), { L: lightness }));
    const ratio = getContrastRatio(candidate, background);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = candidate;
    }
    if (ratio >= minRatio) {
      return candidate;
    }
    if (index > 0 && (lightness === 0 || lightness === 1)) {
      break;
    }
  }
  return bestColor;
};
export {
  adjustLightnessForContrast,
  adjustOklchLightnessForContrast,
  clamp01,
  getContrastRatio,
  getHueDistance,
  getOklabDistance,
  getRelativeLuminance,
  hexToHsl,
  hexToOklch,
  hslToHex,
  hslToRgb,
  mixHexColors,
  normalizeHue,
  oklchToHex,
  parseThemeColor,
  rgbToHex,
  rgbToHsl,
};
