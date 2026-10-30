// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
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
import {
  arcPoints,
  mergeSpecs,
  protractorHalo,
  scatteredSparks,
  viewfinderFrame,
} from '../lineart/recipes.mjs';
const TOP = { x: 0.5, y: -0.04 };
const DOWN = Math.PI / 2;
const shaft = (overrides = {}) =>
  __spreadValues(
    __spreadProps(__spreadValues({}, TOP), {
      angle: DOWN,
      spread: 0.09,
      width: 0.05,
      length: 0.8,
      softness: 0.6,
      intensity: 0.95,
      streaks: 0.6,
      streakFreq: 7,
      streakSpeed: 0.08,
      core: 0.75,
      sway: { amplitude: 0.012, period: 13, phase: 0 },
    }),
    overrides
  );
const fan = (overrides = {}) =>
  __spreadValues(
    __spreadProps(__spreadValues({}, TOP), {
      angle: DOWN,
      spread: 0.3,
      length: 0.6,
      softness: 0.9,
      intensity: 0.32,
      streaks: 0.85,
      streakFreq: 26,
      streakSpeed: 0.05,
      core: 0.4,
      sway: { amplitude: 0.02, period: 17, phase: 0.3 },
    }),
    overrides
  );
const FOG = {
  density: 1,
  tyndallBase: 0.12,
  scale: 2.4,
  driftX: 8e-3,
  driftY: -0.04,
  warp: 0.9,
  ambient: 0.03,
};
const GLARE = { x: 0.5, y: 0, radius: 0.12, intensity: 0.9, streak: 0.45 };
const MOTES = {
  count: 260,
  sizeMin: 4e-3,
  sizeMax: 0.013,
  driftX: 4e-3,
  driftY: -0.01,
  swirl: 0.02,
  swirlPeriod: 9,
  twinkle: 0.5,
  ambient: 0.015,
  gain: 1.3,
};
const FRONT = {
  count: 9,
  sizeMin: 0.05,
  sizeMax: 0.15,
  driftX: 6e-3,
  driftY: -2e-3,
  swirl: 0.012,
  swirlPeriod: 14,
  twinkle: 0.2,
  ambient: 0.02,
  gain: 0.3,
};
const STARFALL = {
  stars: 420,
  opening: 3.2,
  rain: 70,
  rainSpeed: 0.22,
  rainSpread: 0.35,
  brightness: 1,
};
const standardArt = ({ aspect, random }, haloRadius = 0.3) =>
  mergeSpecs(
    protractorHalo({ cx: aspect * 0.5, cy: 0.03, radius: haloRadius, alpha: 0.55 }),
    viewfinderFrame({
      aspect,
      left: 0.07,
      top: 0.21,
      right: 0.93,
      bottom: 0.8,
      delay: 0.1,
      alpha: 0.32,
    }),
    scatteredSparks({ aspect, count: 16, random, delay: 0.3 })
  );
const frameArt = ({ aspect, random }) =>
  mergeSpecs(
    viewfinderFrame({
      aspect,
      left: 0.07,
      top: 0.21,
      right: 0.93,
      bottom: 0.8,
      delay: 0.1,
      alpha: 0.28,
    }),
    scatteredSparks({ aspect, count: 14, random, delay: 0.3 })
  );
const ellipse = (cx, cy, rx, ry, steps = 96) =>
  arcPoints(0, 0, 1, 0, Math.PI * 2, steps).map(([x, y]) => [cx + x * rx, cy + y * ry]);
const rig =
  (beams, fog = {}, glare = GLARE, modules = {}) =>
  () =>
    __spreadValues(
      {
        beams,
        fog: __spreadValues(__spreadValues({}, FOG), fog),
        glare,
      },
      modules
    );
const familyOf =
  (family, defaults = {}) =>
  (profile) =>
    __spreadValues(
      __spreadValues(
        {
          family,
          motes: MOTES,
          front: FRONT,
          lineArt: (context) => standardArt(context),
          region: { cx: 0.5, cy: 0.54, w: 0.72, h: 0.5 },
          heroSize: 0.085,
          camera: { push: 0.035, driftX: 0, driftY: -6e-3 },
        },
        defaults
      ),
      profile
    );
export {
  DOWN,
  FOG,
  FRONT,
  GLARE,
  MOTES,
  STARFALL,
  TOP,
  ellipse,
  familyOf,
  fan,
  frameArt,
  rig,
  shaft,
  standardArt,
};
