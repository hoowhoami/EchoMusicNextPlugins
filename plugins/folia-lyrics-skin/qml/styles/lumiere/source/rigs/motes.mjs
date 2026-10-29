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
import { horizon, mergeDiagrams } from '../lineart/diagrams.mjs';
import { scatteredSparks } from '../lineart/recipes.mjs';
import { FRONT, familyOf, MOTES, rig, shaft, STARFALL } from './base.mjs';
const motesFamily = familyOf('motes', {
  starfall: __spreadProps(__spreadValues({}, STARFALL), { rain: 30 }),
  lineArt: ({ aspect, random }) => scatteredSparks({ aspect, count: 10, random, delay: 0.3 }),
});
const particles = (overrides) => __spreadValues(__spreadValues({}, MOTES), overrides);
const motesDust = motesFamily({
  kind: 'motes-dust',
  label: '\u6D6E\u5C18',
  mood: 'quiet',
  light: rig(
    [
      shaft({
        x: 0.15,
        y: -0.05,
        angle: 1.05,
        spread: 0.1,
        width: 0.1,
        length: 1.5,
        intensity: 0.8,
        streaks: 0.4,
      }),
    ],
    { density: 0.8, ambient: 0.015 },
    null
  ),
  motes: particles({
    count: 420,
    sizeMin: 3e-3,
    sizeMax: 0.012,
    driftX: 2e-3,
    driftY: -4e-3,
    swirl: 0.035,
    swirlPeriod: 14,
    gain: 1.6,
  }),
  typography: 'horizontal',
  decay: { strength: 0.7, delay: 1.4 },
});
const motesFirefly = motesFamily({
  kind: 'motes-firefly',
  label: '\u8424\u706B',
  mood: 'quiet',
  light: rig([shaft({ spread: 0.05, intensity: 0.15 })], { density: 0.6, ambient: 0.02 }, null),
  motes: particles({
    count: 90,
    sizeMin: 8e-3,
    sizeMax: 0.022,
    driftX: 3e-3,
    driftY: -3e-3,
    swirl: 0.06,
    swirlPeriod: 11,
    twinkle: 0.9,
    ambient: 0.55,
    gain: 0.8,
  }),
  front: __spreadProps(__spreadValues({}, FRONT), { count: 14, ambient: 0.12, twinkle: 0.7 }),
  region: { cx: 0.5, cy: 0.5, w: 0.5, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 0.6, delay: 1.6 },
});
const motesSmoke = motesFamily({
  kind: 'motes-smoke',
  label: '\u70DF\u7F15',
  mood: 'neutral',
  light: rig(
    [
      shaft({
        x: -0.05,
        y: 0.55,
        angle: -0.08,
        spread: 0.18,
        width: 0.3,
        length: 1.6,
        softness: 0.7,
        intensity: 0.42,
        streaks: 0.2,
        core: 0.3,
        sway: void 0,
      }),
    ],
    {
      density: 1.5,
      tyndallBase: 0.05,
      scale: 1.8,
      warp: 1.8,
      driftX: 4e-3,
      driftY: -0.06,
      ambient: 0.05,
    },
    null
  ),
  motes: particles({ count: 140 }),
  typography: 'crossed',
  decay: { strength: 1, delay: 1 },
});
const motesEmbers = motesFamily({
  kind: 'motes-embers',
  label: '\u98DE\u70EC',
  mood: 'loud',
  light: rig(
    [
      shaft({
        x: 0.5,
        y: 1.05,
        angle: -Math.PI / 2,
        spread: 0.35,
        width: 0.3,
        length: 0.6,
        softness: 0.9,
        intensity: 0.8,
        streaks: 0.6,
        streakFreq: 8,
        core: 0.3,
        tint: [1, 0.55, 0.3],
        pulse: { amplitude: 0.2, period: 1.3, phase: 0 },
        sway: void 0,
      }),
    ],
    { density: 1.1, driftY: -0.05 },
    null
  ),
  motes: particles({
    count: 380,
    sizeMin: 3e-3,
    sizeMax: 0.01,
    driftX: 4e-3,
    driftY: -0.07,
    swirl: 0.03,
    swirlPeriod: 5,
    twinkle: 0.8,
    ambient: 0.1,
    gain: 1.8,
  }),
  region: { cx: 0.5, cy: 0.44, w: 0.72, h: 0.46 },
  typography: 'horizontal',
  decay: { strength: 1.4, delay: 0.6 },
});
const motesSnow = motesFamily({
  kind: 'motes-snow',
  label: '\u5149\u96EA',
  mood: 'quiet',
  light: rig(
    [shaft({ spread: 0.2, width: 0.2, softness: 0.9, intensity: 0.5, core: 0.3 })],
    { density: 0.8, driftY: 0.01 },
    null
  ),
  motes: particles({
    count: 460,
    sizeMin: 3e-3,
    sizeMax: 0.012,
    driftX: 3e-3,
    driftY: 0.035,
    swirl: 0.02,
    swirlPeriod: 8,
    twinkle: 0.3,
    ambient: 0.15,
    gain: 1,
  }),
  region: { cx: 0.5, cy: 0.5, w: 0.5, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 0.6, delay: 1.6 },
  starfall: __spreadProps(__spreadValues({}, STARFALL), {
    rain: 60,
    rainSpeed: 0.12,
    rainSpread: 1.8,
    brightness: 0.7,
  }),
});
const motesBokeh = motesFamily({
  kind: 'motes-bokeh',
  label: '\u6563\u666F',
  mood: 'neutral',
  light: rig([shaft({ intensity: 0.6 })], { density: 0.8 }, null),
  motes: particles({ count: 120 }),
  front: __spreadProps(__spreadValues({}, FRONT), {
    count: 34,
    sizeMin: 0.06,
    sizeMax: 0.2,
    ambient: 0.1,
    gain: 0.5,
    twinkle: 0.3,
    driftX: 8e-3,
  }),
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const motesMist = motesFamily({
  kind: 'motes-mist',
  label: '\u6668\u96FE',
  mood: 'quiet',
  // 雾后的光：光束与眩光都压低，眩光不拉横丝（原来亮得发白，一条横线贯穿画面）。
  light: rig(
    [
      shaft({
        x: 0.7,
        y: 0.62,
        angle: -2.8,
        spread: 0.5,
        width: 0.3,
        length: 1.2,
        softness: 1,
        intensity: 0.55,
        streaks: 0.3,
        core: 0.2,
        sway: void 0,
      }),
    ],
    {
      density: 1.5,
      tyndallBase: 0.1,
      scale: 1.2,
      warp: 0.6,
      driftX: 0.02,
      driftY: 0,
      ambient: 0.05,
    },
    { x: 0.7, y: 0.62, radius: 0.16, intensity: 0.5, streak: 0.08 }
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      horizon(aspect, 0.64),
      scatteredSparks({ aspect, count: 8, random, delay: 0.3, region: [0.05, 0.05, 0.95, 0.55] })
    ),
  motes: particles({ count: 120, driftX: 0.01 }),
  region: { cx: 0.36, cy: 0.42, w: 0.44, h: 0.5 },
  typography: 'vertical',
  decay: { strength: 0.6, delay: 1.6 },
});
const motesSwarm = motesFamily({
  kind: 'motes-swarm',
  label: '\u5149\u7FA4',
  mood: 'loud',
  light: rig([
    shaft({ intensity: 0.8 }),
    shaft({
      spread: 0.3,
      length: 0.6,
      softness: 0.9,
      intensity: 0.25,
      streaks: 0.8,
      streakFreq: 24,
    }),
  ]),
  motes: particles({
    count: 460,
    sizeMin: 3e-3,
    sizeMax: 0.012,
    driftX: 0,
    driftY: 0,
    swirl: 0.14,
    swirlPeriod: 6,
    twinkle: 0.6,
    ambient: 0.08,
    gain: 1.6,
  }),
  typography: 'crossed',
  decay: { strength: 1.3, delay: 0.7 },
});
const motesDissolve = motesFamily({
  kind: 'motes-dissolve',
  label: '\u5316\u5C18',
  mood: 'neutral',
  light: rig([shaft({ intensity: 0.7 })]),
  motes: particles({ count: 380, driftY: -0.02, swirl: 0.04, gain: 1.5 }),
  typography: 'crossed',
  decay: { strength: 2.2, delay: 0.3 },
});
const motesAurora = motesFamily({
  kind: 'motes-aurora',
  label: '\u6781\u5149',
  mood: 'loud',
  light: rig(
    [0.2, 0.4, 0.6, 0.8].map((x, i) =>
      shaft({
        x,
        y: -0.1,
        angle: Math.PI / 2 + 0.1,
        spread: 0.06,
        width: 0.16,
        length: 0.7,
        softness: 0.8,
        intensity: 0.7,
        streaks: 0.9,
        streakFreq: 30,
        streakSpeed: 0.3,
        core: 0.2,
        spectrum: 0.5,
        tint: [0.6, 1, 0.8],
        sway: { amplitude: 0.12, period: 8 + i * 1.7, phase: i * 0.2 },
      })
    ),
    { density: 0.9, ambient: 0.03 },
    null
  ),
  region: { cx: 0.5, cy: 0.62, w: 0.72, h: 0.4 },
  typography: 'horizontal',
  decay: { strength: 1.2, delay: 0.8 },
  starfall: __spreadProps(__spreadValues({}, STARFALL), { stars: 560, rain: 20 }),
});
const MOTES_PROFILES = [
  motesDust,
  motesFirefly,
  motesSmoke,
  motesEmbers,
  motesSnow,
  motesBokeh,
  motesMist,
  motesSwarm,
  motesDissolve,
  motesAurora,
];
export {
  MOTES_PROFILES,
  motesAurora,
  motesBokeh,
  motesDissolve,
  motesDust,
  motesEmbers,
  motesFirefly,
  motesMist,
  motesSmoke,
  motesSnow,
  motesSwarm,
};
