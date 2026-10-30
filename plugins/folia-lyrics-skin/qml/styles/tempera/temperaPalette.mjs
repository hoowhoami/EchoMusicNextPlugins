// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
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
import { colorWithAlpha, mixColors, parseColorChannels } from '../cadenza/color.mjs';
const TEMPERA_TONE_STOPS = [0.12, 0.3, 0.52, 0.72];
const luminanceOf = (color) => {
  const channels = parseColorChannels(color);
  if (!channels) return 128;
  return channels.r * 0.2126 + channels.g * 0.7152 + channels.b * 0.0722;
};
const toGray = (color, fallback) => {
  const channels = parseColorChannels(color);
  if (!channels) return fallback;
  const luminance = Math.round(channels.r * 0.2126 + channels.g * 0.7152 + channels.b * 0.0722);
  return `rgb(${luminance}, ${luminance}, ${luminance})`;
};
const grayLevel = (color) => {
  var _a, _b;
  return (_b = (_a = parseColorChannels(color)) == null ? void 0 : _a.r) != null ? _b : 128;
};
const MIN_INK_CONTRAST = 96;
const ensureInkContrast = (paper, ink) => {
  if (Math.abs(luminanceOf(ink) - luminanceOf(paper)) >= MIN_INK_CONTRAST) return ink;
  const target = luminanceOf(paper) < 128 ? '#f4f4f2' : '#141414';
  const tinted = mixColors(target, ink, 0.14);
  return Math.abs(luminanceOf(tinted) - luminanceOf(paper)) >= MIN_INK_CONTRAST ? tinted : target;
};
const matchLuminance = (color, target) => {
  const channels = parseColorChannels(color);
  if (!channels) return target;
  const current = luminanceOf(color);
  const wanted = luminanceOf(target);
  if (current <= 0.5) return target;
  const gain = wanted / current;
  const scaled = {
    r: Math.round(Math.min(255, channels.r * gain)),
    g: Math.round(Math.min(255, channels.g * gain)),
    b: Math.round(Math.min(255, channels.b * gain)),
  };
  if (Math.abs(luminanceOf(`rgb(${scaled.r}, ${scaled.g}, ${scaled.b})`) - wanted) > 1.5)
    return target;
  return `rgb(${scaled.r}, ${scaled.g}, ${scaled.b})`;
};
const buildToneLadder = (paper, ink, tintA, tintB) => {
  const step = (index, tint) => {
    const base = mixColors(paper, ink, TEMPERA_TONE_STOPS[index]);
    return tint ? matchLuminance(mixColors(base, tint, 0.3), base) : base;
  };
  return {
    tone1: step(0, tintA),
    tone2: step(1, tintB),
    tone3: step(2, tintA),
    tone4: step(3),
  };
};
const buildGradientRamp = (paper, ink, sources) => {
  const usable = sources.map((color) => color.trim()).filter(Boolean);
  const ranked = [...usable].sort((a, b) => luminanceOf(a) - luminanceOf(b));
  const towardInk = luminanceOf(ink) < luminanceOf(paper);
  const ordered = towardInk ? ranked.reverse() : ranked;
  return TEMPERA_TONE_STOPS.map((stop, index) => {
    const rung = mixColors(paper, ink, stop);
    const hue = ordered[index % Math.max(ordered.length, 1)];
    return hue ? matchLuminance(mixColors(rung, hue, 0.78), rung) : rung;
  });
};
const enforceReadable = (paper, color) => {
  const paperLuminance = luminanceOf(paper);
  if (Math.abs(luminanceOf(color) - paperLuminance) >= 88) return color;
  const away = paperLuminance < 128 ? '#ffffff' : '#101010';
  for (let step = 1; step <= 5; step += 1) {
    const pushed = mixColors(color, away, step * 0.16);
    if (Math.abs(luminanceOf(pushed) - paperLuminance) >= 88) return pushed;
  }
  return mixColors(color, away, 0.8);
};
const THEME_HUE_MIX = 0.32;
const blendCoverWithTheme = (cover, themeHues) =>
  cover
    .slice(0, 4)
    .map((color, index) => mixColors(color, themeHues[index % themeHues.length], THEME_HUE_MIX));
const buildTextGradient = (paper, sources) => {
  const usable = sources.map((color) => color.trim()).filter(Boolean);
  if (usable.length === 0) return null;
  return Array.from({ length: 4 }, (_, index) =>
    enforceReadable(paper, usable[index % usable.length])
  );
};
const resolveTemperaPalette = (theme, tuning, coverColors = []) => {
  if (tuning.colorMode === 'mono') {
    const paper2 = toGray(theme.backgroundColor, '#111111');
    let ink2 = toGray(theme.primaryColor, '#f5f5f5');
    if (Math.abs(grayLevel(ink2) - grayLevel(paper2)) < 96) {
      ink2 = grayLevel(paper2) < 128 ? '#f2f2f2' : '#141414';
    }
    return __spreadProps(
      __spreadValues(
        {
          paper: paper2,
          ink: ink2,
          blockA: mixColors(paper2, ink2, 0.08),
          blockB: mixColors(paper2, ink2, 0.18),
          blockC: mixColors(paper2, ink2, 0.34),
          accent: mixColors(paper2, ink2, 0.85),
          line: colorWithAlpha(mixColors(paper2, ink2, 0.55), 0.55),
          shadow: colorWithAlpha(mixColors(paper2, ink2, 0.75), 0.35),
        },
        buildToneLadder(paper2, ink2)
      ),
      {
        gradient: null,
        textGradient: null,
      }
    );
  }
  const paper = theme.backgroundColor;
  const ink = ensureInkContrast(paper, theme.primaryColor);
  if (tuning.colorMode === 'gradient') {
    const themeHues = [theme.accentColor, theme.secondaryColor, theme.primaryColor, ink];
    const hues = coverColors.length >= 2 ? blendCoverWithTheme(coverColors, themeHues) : themeHues;
    const ramp = buildGradientRamp(paper, ink, hues);
    return {
      paper,
      ink,
      blockA: ramp[0],
      blockB: ramp[1],
      blockC: ramp[2],
      accent: theme.accentColor,
      line: colorWithAlpha(mixColors(paper, ink, 0.6), 0.5),
      shadow: colorWithAlpha(mixColors(paper, ink, 0.8), 0.32),
      tone1: ramp[0],
      tone2: ramp[1],
      tone3: ramp[2],
      tone4: ramp[3],
      gradient: ramp,
      textGradient: buildTextGradient(paper, hues),
    };
  }
  return __spreadProps(
    __spreadValues(
      {
        paper,
        ink,
        blockA: mixColors(paper, theme.accentColor, 0.55),
        blockB: mixColors(paper, theme.secondaryColor, 0.6),
        blockC: mixColors(paper, ink, 0.78),
        accent: theme.accentColor,
        line: colorWithAlpha(mixColors(paper, ink, 0.6), 0.5),
        shadow: colorWithAlpha(mixColors(paper, ink, 0.8), 0.32),
      },
      buildToneLadder(paper, ink, theme.accentColor, theme.secondaryColor)
    ),
    {
      gradient: null,
      textGradient: null,
    }
  );
};
export { TEMPERA_TONE_STOPS, resolveTemperaPalette };
