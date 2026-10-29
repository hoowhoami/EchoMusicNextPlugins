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
  mergeSpecs,
  protractorHalo,
  scatteredSparks,
  viewfinderFrame,
} from '../lineart/recipes.mjs';
import { ellipse, fan, familyOf, GLARE, MOTES, rig, shaft, STARFALL, DOWN } from './base.mjs';
const zenith = familyOf('zenith');
const zenithShaft = zenith({
  kind: 'zenith-shaft',
  label: '\u5929\u4E95',
  mood: 'neutral',
  light: rig([
    shaft(),
    fan(),
    fan({
      spread: 0.55,
      length: 0.42,
      softness: 1,
      intensity: 0.16,
      streaks: 0.9,
      streakFreq: 40,
      streakSpeed: -0.03,
      core: 0.2,
      sway: void 0,
    }),
  ]),
  typography: 'crossed',
  decay: { strength: 1, delay: 1 },
  starfall: STARFALL,
});
const zenithFan = zenith({
  kind: 'zenith-fan',
  label: '\u6247\u5149',
  mood: 'loud',
  light: rig(
    [-2, -1, 0, 1, 2].map((k) =>
      shaft({
        angle: DOWN + k * 0.24,
        spread: 0.035,
        width: 0.012,
        length: 0.9,
        intensity: 0.7 - Math.abs(k) * 0.08,
        streaks: 0.4,
        streakFreq: 5,
        sway: { amplitude: 0.05, period: 11, phase: k * 0.1 },
      })
    )
  ),
  typography: 'horizontal',
  decay: { strength: 1.2, delay: 0.8 },
  starfall: __spreadProps(__spreadValues({}, STARFALL), { rain: 110, rainSpread: 0.6 }),
});
const zenithHalo = zenith({
  kind: 'zenith-halo',
  label: '\u5723\u73AF',
  mood: 'neutral',
  light: rig(
    [shaft({ spread: 0.07 }), fan({ spread: 0.42, intensity: 0.24 })],
    {},
    __spreadProps(__spreadValues({}, GLARE), { radius: 0.2, intensity: 1.2, streak: 0.7 })
  ),
  lineArt: (context) =>
    mergeSpecs(
      protractorHalo({
        cx: context.aspect * 0.5,
        cy: 0.03,
        radius: 0.42,
        alpha: 0.7,
        spokeStep: Math.PI / 18,
      }),
      protractorHalo({ cx: context.aspect * 0.5, cy: 0.03, radius: 0.24, alpha: 0.4, delay: 0.2 }),
      scatteredSparks({ aspect: context.aspect, count: 20, random: context.random, delay: 0.3 })
    ),
  region: { cx: 0.5, cy: 0.5, w: 0.72, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 0.8, delay: 1.2 },
  starfall: STARFALL,
});
const zenithDrift = zenith({
  kind: 'zenith-drift',
  label: '\u6E38\u5149',
  mood: 'quiet',
  light: rig(
    [
      shaft({ sway: { amplitude: 0.2, period: 9, phase: 0 }, intensity: 0.85 }),
      fan({ intensity: 0.2, sway: { amplitude: 0.2, period: 9, phase: 0 } }),
    ],
    { density: 0.9 }
  ),
  typography: 'horizontal',
  decay: { strength: 0.7, delay: 1.4 },
  camera: { push: 0.02, driftX: 0.01, driftY: 0 },
});
const zenithTwin = zenith({
  kind: 'zenith-twin',
  label: '\u53CC\u67F1',
  mood: 'neutral',
  light: rig(
    [
      shaft({ x: 0.33, spread: 0.06, sway: { amplitude: 0.06, period: 12, phase: 0 } }),
      shaft({ x: 0.67, spread: 0.06, sway: { amplitude: 0.06, period: 12, phase: 0.5 } }),
    ],
    {},
    null
  ),
  lineArt: (context) =>
    mergeSpecs(
      viewfinderFrame({
        aspect: context.aspect,
        left: 0.07,
        top: 0.21,
        right: 0.93,
        bottom: 0.8,
        alpha: 0.32,
      }),
      scatteredSparks({ aspect: context.aspect, count: 18, random: context.random, delay: 0.2 })
    ),
  typography: 'crossed',
  decay: { strength: 1, delay: 1 },
});
const zenithRain = zenith({
  kind: 'zenith-rain',
  label: '\u5149\u96E8',
  mood: 'loud',
  light: rig(
    [0.18, 0.34, 0.5, 0.66, 0.82, 0.42].map((x, i) =>
      shaft({
        x,
        spread: 0.012,
        width: 0.01,
        length: 1.1,
        intensity: 0.45,
        streaks: 0.7,
        streakFreq: 3,
        pulse: { amplitude: 0.35, period: 1.7 + i * 0.37, phase: i * 0.21 },
        sway: void 0,
      })
    ),
    { driftY: 0.05 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.5 })
  ),
  typography: 'vertical',
  decay: { strength: 1.3, delay: 0.6 },
  starfall: __spreadProps(__spreadValues({}, STARFALL), {
    rain: 220,
    rainSpeed: 0.45,
    rainSpread: 1.4,
    brightness: 1.1,
  }),
});
const zenithWell = zenith({
  kind: 'zenith-well',
  label: '\u5149\u4E95',
  mood: 'quiet',
  light: rig(
    [shaft({ spread: 0.05, width: 0.02, length: 1.4, intensity: 0.8, core: 0.9 })],
    { density: 0.7, ambient: 0.015 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.6 })
  ),
  lineArt: (context) => ({
    paths: [
      {
        points: ellipse(context.aspect * 0.5, 0.8, 0.26, 0.05),
        width: 18e-4,
        alpha: 0.7,
        delay: 0.1,
        span: 0.5,
      },
      {
        points: ellipse(context.aspect * 0.5, 0.8, 0.17, 0.032),
        width: 12e-4,
        alpha: 0.45,
        delay: 0.2,
        span: 0.4,
        dash: [4e-3, 8e-3],
      },
    ],
    nodes: [{ at: [context.aspect * 0.5, 0.8], size: 0.03, delay: 0.3, twinklePhase: 0 }],
  }),
  motes: __spreadProps(__spreadValues({}, MOTES), { count: 160 }),
  typography: 'horizontal',
  decay: { strength: 0.6, delay: 1.6 },
});
const zenithCrown = zenith({
  kind: 'zenith-crown',
  label: '\u51A0\u5195',
  mood: 'loud',
  light: (context) =>
    __spreadProps(__spreadValues({}, zenithShaft.light(context)), {
      glare: { x: 0.5, y: 0, radius: 0.18, intensity: 1.3, streak: 0.8 },
    }),
  burst: { mode: 'sung', density: 0.4, every: 1, offset: 0, size: 4, tint: [1, 0.6, 0.4] },
  typography: 'horizontal',
  decay: { strength: 1.25, delay: 0.7 },
  // 更密更快的光雨。
  starfall: {
    stars: 520,
    opening: 2.6,
    rain: 120,
    rainSpeed: 0.32,
    rainSpread: 0.5,
    brightness: 1.1,
  },
  camera: { push: 0.05, driftX: 0, driftY: -0.01 },
});
const zenithDescent = zenith({
  kind: 'zenith-descent',
  label: '\u5782\u964D',
  mood: 'neutral',
  light: rig([shaft({ reveal: 3 }), fan({ reveal: 3.5 })]),
  typography: 'crossed',
  decay: { strength: 1, delay: 1 },
  starfall: __spreadProps(__spreadValues({}, STARFALL), { rain: 40 }),
});
const zenithEmber = zenith({
  kind: 'zenith-ember',
  label: '\u4F59\u70EC',
  mood: 'quiet',
  light: rig(
    [
      shaft({
        intensity: 0.45,
        tint: [1, 0.7, 0.5],
        pulse: { amplitude: 0.2, period: 5, phase: 0 },
      }),
      fan({ intensity: 0.12, tint: [1, 0.6, 0.4] }),
    ],
    { density: 1.2, ambient: 0.04, driftY: -0.05 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.4 })
  ),
  motes: __spreadProps(__spreadValues({}, MOTES), {
    count: 320,
    driftY: -0.035,
    swirl: 0.03,
    gain: 1.6,
    ambient: 0.04,
  }),
  region: { cx: 0.5, cy: 0.5, w: 0.72, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 1.4, delay: 0.8 },
  camera: { push: 0.02, driftX: 0, driftY: -0.012 },
});
const ZENITH_PROFILES = [
  zenithShaft,
  zenithFan,
  zenithHalo,
  zenithDrift,
  zenithTwin,
  zenithRain,
  zenithWell,
  zenithCrown,
  zenithDescent,
  zenithEmber,
];
export {
  ZENITH_PROFILES,
  zenithCrown,
  zenithDescent,
  zenithDrift,
  zenithEmber,
  zenithFan,
  zenithHalo,
  zenithRain,
  zenithShaft,
  zenithTwin,
  zenithWell,
};
