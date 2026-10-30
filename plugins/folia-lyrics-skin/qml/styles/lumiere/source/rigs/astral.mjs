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
  armillary,
  constellation,
  corona,
  crescent,
  meteors,
  mergeDiagrams,
  orbits,
  sextant,
  starTrails,
} from '../lineart/diagrams.mjs';
import { scatteredSparks } from '../lineart/recipes.mjs';
import { fan, familyOf, GLARE, MOTES, rig, shaft, STARFALL } from './base.mjs';
const astral = familyOf('astral', {
  starfall: __spreadProps(__spreadValues({}, STARFALL), { stars: 620, rain: 20, brightness: 1.1 }),
  motes: __spreadProps(__spreadValues({}, MOTES), { count: 160 }),
  // 轨道、星轨、星座、浑天仪的线稿是这一族的主角。
  artGain: 2,
});
const sparks = ({ aspect, random }) => scatteredSparks({ aspect, count: 20, random, delay: 0.3 });
const radial = (cx, cy, r, aspect, count, overrides = {}) =>
  Array.from({ length: count }, (_, k) => {
    const angle = (k / count) * Math.PI * 2 + 0.3;
    return shaft(
      __spreadValues(
        {
          x: cx + (Math.cos(angle) * r) / aspect,
          y: cy + Math.sin(angle) * r,
          angle,
          spread: 0.14,
          width: 0.04,
          length: 0.35,
          softness: 0.8,
          intensity: 0.7,
          streaks: 0.7,
          streakFreq: 12,
          core: 0.3,
          sway: { amplitude: 0.04, period: 9 + k, phase: k / count },
        },
        overrides
      )
    );
  });
const astralEclipse = astral({
  kind: 'astral-eclipse',
  label: '\u65E5\u98DF',
  mood: 'loud',
  light: ({ aspect }) => ({
    beams: radial(0.5, 0.34, 0.13, aspect, 6),
    fog: {
      density: 0.8,
      tyndallBase: 0.2,
      scale: 2.4,
      driftX: 4e-3,
      driftY: -0.01,
      warp: 0.9,
      ambient: 0.02,
    },
    glare: {
      x: 0.5 + (0.13 * Math.cos(-0.8)) / aspect,
      y: 0.34 + 0.13 * Math.sin(-0.8),
      radius: 0.05,
      intensity: 1.3,
      streak: 0.9,
    },
  }),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(corona(aspect * 0.5, 0.34, 0.13, random), sparks({ aspect, random })),
  region: { cx: 0.5, cy: 0.7, w: 0.72, h: 0.4 },
  typography: 'crossed',
  burst: { mode: 'sung', density: 0.35, every: 1, offset: 0, size: 3.6, tint: [1, 0.6, 0.45] },
  decay: { strength: 1.3, delay: 0.7 },
});
const astralOrbit = astral({
  kind: 'astral-orbit',
  label: '\u8F68\u9053',
  mood: 'quiet',
  light: rig(
    [shaft({ spread: 0.05, intensity: 0.45, reach: 0.4 })],
    { density: 0.6, ambient: 0.015 },
    { x: 0.5, y: 0.42, radius: 0.05, intensity: 1, streak: 0.5 }
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      orbits(aspect * 0.5, 0.42, [0.12, 0.2, 0.3, 0.42], -0.18, 0.34, random),
      sparks({ aspect, random })
    ),
  region: { cx: 0.5, cy: 0.74, w: 0.72, h: 0.32 },
  typography: 'horizontal',
  decay: { strength: 0.6, delay: 1.6 },
});
const astralTrail = astral({
  kind: 'astral-trail',
  label: '\u661F\u8F68',
  mood: 'quiet',
  light: rig(
    [shaft({ x: 0.72, spread: 0.04, intensity: 0.35 })],
    { density: 0.5, ambient: 0.01 },
    null
  ),
  lineArt: ({ aspect, random }) => mergeDiagrams(starTrails(aspect * 0.72, 0.12, random, 60, 0.9)),
  region: { cx: 0.36, cy: 0.54, w: 0.44, h: 0.6 },
  typography: 'vertical',
  decay: { strength: 0.5, delay: 1.8 },
});
const astralSextant = astral({
  kind: 'astral-sextant',
  label: '\u516D\u5206\u4EEA',
  mood: 'neutral',
  light: rig(
    [
      shaft({
        x: 0.85,
        y: -0.05,
        angle: 2.2,
        spread: 0.05,
        width: 0.03,
        length: 1.4,
        intensity: 0.9,
      }),
    ],
    { density: 0.8 },
    __spreadProps(__spreadValues({}, GLARE), { x: 0.85, y: -0.02 })
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(sextant(aspect * 0.4, 0.14, 0.32), sparks({ aspect, random })),
  region: { cx: 0.52, cy: 0.66, w: 0.72, h: 0.4 },
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const astralConstellation = astral({
  kind: 'astral-constellation',
  label: '\u661F\u5EA7',
  mood: 'neutral',
  light: rig(
    [shaft({ spread: 0.06, intensity: 0.4 })],
    { density: 0.6, ambient: 0.015 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.4 })
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      constellation(aspect, random, 8, [0.1, 0.1, 0.9, 0.42]),
      constellation(aspect, random, 5, [0.6, 0.62, 0.95, 0.9], { delay: 0.3 })
    ),
  region: { cx: 0.42, cy: 0.66, w: 0.6, h: 0.4 },
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const astralCorona = astral({
  kind: 'astral-corona',
  label: '\u65E5\u5195',
  mood: 'loud',
  light: ({ aspect }) => ({
    beams: radial(0.5, 0.12, 0.1, aspect, 6, { length: 0.6, intensity: 0.9 }),
    fog: {
      density: 1,
      tyndallBase: 0.15,
      scale: 2.4,
      driftX: 4e-3,
      driftY: -0.02,
      warp: 0.9,
      ambient: 0.03,
    },
    glare: { x: 0.5, y: 0.12, radius: 0.16, intensity: 1.3, streak: 0.7 },
  }),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(corona(aspect * 0.5, 0.12, 0.1, random), sparks({ aspect, random })),
  region: { cx: 0.5, cy: 0.62, w: 0.72, h: 0.46 },
  typography: 'crossed',
  burst: { mode: 'sung', density: 0.3, every: 2, offset: 0, size: 3.4, tint: [1, 0.65, 0.4] },
  decay: { strength: 1.3, delay: 0.7 },
});
const astralMoon = astral({
  kind: 'astral-moon',
  label: '\u6708\u5149',
  mood: 'quiet',
  light: rig(
    [
      shaft({
        x: 0.82,
        y: 0.12,
        angle: 2.1,
        spread: 0.12,
        width: 0.08,
        length: 1.4,
        softness: 0.8,
        intensity: 0.75,
        tint: [0.72, 0.82, 1],
      }),
    ],
    { density: 1.2, driftX: -0.01, driftY: 0, ambient: 0.035, warp: 1.3 },
    { x: 0.82, y: 0.12, radius: 0.1, intensity: 0.8, streak: 0.2 }
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(crescent(aspect * 0.82, 0.12, 0.07), sparks({ aspect, random })),
  region: { cx: 0.38, cy: 0.54, w: 0.5, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 0.6, delay: 1.6 },
});
const astralNebula = astral({
  kind: 'astral-nebula',
  label: '\u661F\u4E91',
  mood: 'neutral',
  light: rig(
    [
      shaft({
        x: 0.4,
        y: 0.45,
        angle: -0.6,
        spread: 0.6,
        width: 0.1,
        length: 0.8,
        softness: 1,
        intensity: 0.5,
        streaks: 0.6,
        streakFreq: 3,
        core: 0.2,
        spectrum: 0.7,
        sway: { amplitude: 0.2, period: 20, phase: 0 },
      }),
      shaft({
        x: 0.6,
        y: 0.45,
        angle: 2.4,
        spread: 0.6,
        width: 0.1,
        length: 0.8,
        softness: 1,
        intensity: 0.4,
        streaks: 0.6,
        streakFreq: 3,
        core: 0.2,
        spectrum: 0.7,
        sway: { amplitude: 0.2, period: 23, phase: 0.5 },
      }),
    ],
    { density: 1.4, ambient: 0.06, warp: 1.6, scale: 1.6, driftX: 6e-3, driftY: 2e-3 },
    { x: 0.5, y: 0.45, radius: 0.08, intensity: 0.7, streak: 0.2 }
  ),
  lineArt: sparks,
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const astralArmillary = astral({
  kind: 'astral-armillary',
  label: '\u6D51\u5929',
  mood: 'neutral',
  light: rig([shaft(), fan({ intensity: 0.2 })]),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(armillary(aspect * 0.5, 0.42, 0.26), sparks({ aspect, random })),
  region: { cx: 0.5, cy: 0.5, w: 0.5, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 1, delay: 1 },
});
const astralMeteor = astral({
  kind: 'astral-meteor',
  label: '\u6D41\u661F',
  mood: 'loud',
  light: rig(
    [0, 1, 2].map((i) =>
      shaft({
        x: 0.95 - i * 0.2,
        y: -0.02 + i * 0.05,
        angle: 2.5,
        spread: 0.01,
        width: 6e-3,
        length: 0.6,
        intensity: 0.9,
        streaks: 0.2,
        core: 0.8,
        reach: 0.5 + i * 0.1,
        pulse: { amplitude: 0.7, period: 2.2 + i * 0.7, phase: i * 0.3 },
        sway: void 0,
      })
    ),
    { density: 0.7, ambient: 0.015 },
    null
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(meteors(aspect, random, 6), sparks({ aspect, random })),
  typography: 'crossed',
  decay: { strength: 1.3, delay: 0.7 },
  starfall: __spreadProps(__spreadValues({}, STARFALL), {
    stars: 620,
    rain: 60,
    rainSpeed: 0.6,
    rainSpread: 1.8,
    brightness: 1.2,
  }),
});
const ASTRAL_PROFILES = [
  astralEclipse,
  astralOrbit,
  astralTrail,
  astralSextant,
  astralConstellation,
  astralCorona,
  astralMoon,
  astralNebula,
  astralArmillary,
  astralMeteor,
];
export {
  ASTRAL_PROFILES,
  astralArmillary,
  astralConstellation,
  astralCorona,
  astralEclipse,
  astralMeteor,
  astralMoon,
  astralNebula,
  astralOrbit,
  astralSextant,
  astralTrail,
};
