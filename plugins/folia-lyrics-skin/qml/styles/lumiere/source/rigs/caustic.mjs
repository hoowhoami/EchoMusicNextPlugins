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
  circle,
  crystal,
  glassCup,
  magnifier,
  mergeDiagrams,
  ripples,
  waterline,
} from '../lineart/diagrams.mjs';
import { scatteredSparks } from '../lineart/recipes.mjs';
import { ellipse, familyOf, GLARE, MOTES, rig, shaft } from './base.mjs';
const caustic = familyOf('caustic', {
  motes: __spreadProps(__spreadValues({}, MOTES), { driftY: -4e-3, swirl: 0.03, swirlPeriod: 12 }),
  region: { cx: 0.5, cy: 0.46, w: 0.72, h: 0.46 },
});
const sparks =
  (count = 10) =>
  ({ aspect, random }) =>
    scatteredSparks({ aspect, count, random, delay: 0.3 });
const softTop = (overrides = {}) =>
  shaft(
    __spreadValues(
      {
        spread: 0.22,
        width: 0.2,
        length: 1.4,
        softness: 0.8,
        intensity: 0.8,
        streaks: 0.3,
        core: 0.3,
      },
      overrides
    )
  );
const water = (spec = {}) => ({
  caustic: __spreadValues({ scale: 2.2, speed: 0.35, inBeam: 0.8 }, spec),
});
const causticPool = caustic({
  kind: 'caustic-pool',
  label: '\u6C60\u5E95',
  mood: 'quiet',
  light: rig(
    [softTop()],
    { density: 0.8, driftY: -0.015, ambient: 0.02 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.6 }),
    water({ floor: { cx: 0.5, cy: 0.82, rx: 0.42, ry: 0.14, strength: 0.7 } })
  ),
  lineArt: ({ aspect, random }) => ({
    paths: [
      {
        points: ellipse(aspect * 0.5, 0.82, aspect * 0.42, 0.14),
        width: 14e-4,
        alpha: 0.4,
        delay: 0.1,
        span: 0.6,
      },
    ],
    nodes: sparks()({ aspect, random }).nodes,
  }),
  typography: 'horizontal',
  decay: { strength: 0.7, delay: 1.4 },
});
const causticCup = caustic({
  kind: 'caustic-cup',
  label: '\u676F\u5F71',
  mood: 'neutral',
  light: rig(
    [
      shaft({
        x: -0.05,
        y: 0.3,
        angle: 0.35,
        spread: 0.08,
        width: 0.18,
        length: 1.6,
        softness: 0.5,
        intensity: 0.9,
        streaks: 0.3,
        core: 0.4,
        sway: void 0,
      }),
    ],
    { density: 0.8 },
    null,
    water({
      scale: 3.2,
      speed: 0.25,
      inBeam: 0.3,
      floor: { cx: 0.36, cy: 0.8, rx: 0.14, ry: 0.07, strength: 1.1 },
    })
  ),
  lineArt: (context) =>
    mergeDiagrams(glassCup(context.aspect * 0.24, 0.52, 0.1, 0.2), sparks()(context)),
  region: { cx: 0.62, cy: 0.48, w: 0.56, h: 0.64 },
  typography: 'vertical',
  decay: { strength: 1, delay: 1 },
});
const causticRipple = caustic({
  kind: 'caustic-ripple',
  label: '\u6D9F\u6F2A',
  mood: 'neutral',
  light: rig(
    [softTop({ intensity: 0.75 })],
    { density: 0.8 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.5 }),
    water({
      scale: 3,
      speed: 0.5,
      inBeam: 0.6,
      floor: { cx: 0.5, cy: 0.8, rx: 0.34, ry: 0.1, strength: 0.5 },
    })
  ),
  lineArt: (context) =>
    mergeDiagrams(ripples(context.aspect * 0.5, 0.8, 0.34, 5), sparks()(context)),
  typography: 'crossed',
  decay: { strength: 1, delay: 1 },
});
const causticSurface = caustic({
  kind: 'caustic-surface',
  label: '\u6C34\u9762',
  mood: 'loud',
  light: rig(
    [0.2, 0.42, 0.6, 0.8].map((x, i) =>
      shaft({
        x,
        y: 0.1,
        angle: 1.35 + i * 0.06,
        spread: 0.04,
        width: 0.05,
        length: 1.2,
        softness: 0.6,
        intensity: 0.7,
        streaks: 0.5,
        streakFreq: 6,
        core: 0.5,
        sway: { amplitude: 0.05, period: 6 + i, phase: i * 0.2 },
      })
    ),
    { density: 1.1, driftY: -0.02 },
    null,
    water({
      scale: 2.6,
      speed: 0.6,
      inBeam: 0.9,
      floor: { cx: 0.5, cy: 0.06, rx: 0.6, ry: 0.07, strength: 0.9 },
    })
  ),
  lineArt: (context) =>
    mergeDiagrams(waterline(context.aspect, 0.1, 0.012, 7), sparks(14)(context)),
  motes: __spreadProps(__spreadValues({}, MOTES), { count: 300, driftY: -0.02, swirl: 0.03 }),
  region: { cx: 0.5, cy: 0.58, w: 0.72, h: 0.46 },
  typography: 'horizontal',
  decay: { strength: 1.2, delay: 0.8 },
});
const causticRing = caustic({
  kind: 'caustic-ring',
  label: '\u6212\u5149',
  mood: 'quiet',
  light: rig(
    [softTop({ spread: 0.14, width: 0.1, intensity: 0.7 })],
    { density: 0.7 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.5 }),
    water({
      scale: 4,
      speed: 0.2,
      inBeam: 0.2,
      floor: { cx: 0.5, cy: 0.5, rx: 0.2, ry: 0.36, strength: 0.6 },
    })
  ),
  lineArt: (context) =>
    mergeDiagrams(
      {
        paths: [
          circle(context.aspect * 0.5, 0.5, 0.36, { width: 24e-4, alpha: 0.6 }),
          circle(context.aspect * 0.5, 0.5, 0.32, { width: 9e-4, alpha: 0.3, delay: 0.1 }),
        ],
        nodes: [],
      },
      sparks()(context)
    ),
  region: { cx: 0.5, cy: 0.5, w: 0.4, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 0.6, delay: 1.6 },
});
const causticBurn = caustic({
  kind: 'caustic-burn',
  label: '\u805A\u70B9',
  mood: 'loud',
  light: rig(
    [
      shaft({
        x: 0.5,
        y: 0.2,
        angle: Math.PI / 2,
        spread: -0.22,
        width: 0.2,
        length: 1.4,
        softness: 0.5,
        intensity: 1.2,
        streaks: 0.3,
        streakFreq: 5,
        core: 0.6,
        sway: { amplitude: 0.02, period: 9, phase: 0 },
      }),
      shaft({
        x: 0.5,
        y: -0.1,
        angle: Math.PI / 2,
        spread: 0.03,
        width: 0.22,
        length: 1,
        intensity: 0.4,
        streaks: 0.4,
        reach: 0.3,
        sway: void 0,
      }),
    ],
    { density: 1 },
    { x: 0.5, y: 0.65, radius: 0.05, intensity: 1.1, streak: 0.8 }
  ),
  lineArt: (context) =>
    mergeDiagrams(magnifier(context.aspect * 0.5, 0.2, 0.1), sparks(12)(context)),
  region: { cx: 0.5, cy: 0.66, w: 0.72, h: 0.4 },
  typography: 'crossed',
  burst: { mode: 'sung', density: 0.35, every: 1, offset: 0, size: 3.6, tint: [1, 0.7, 0.45] },
  decay: { strength: 1.3, delay: 0.7 },
});
const causticShimmer = caustic({
  kind: 'caustic-shimmer',
  label: '\u7CBC\u7CBC',
  mood: 'neutral',
  light: rig(
    [
      shaft({
        x: -0.05,
        y: 0.5,
        angle: 0.02,
        spread: 0.06,
        width: 0.5,
        length: 2.4,
        softness: 0.4,
        intensity: 0.8,
        streaks: 0.2,
        core: 0.2,
        gobo: { pattern: 'blinds', frequency: 18, duty: 0.35, drift: 0.3 },
        sway: void 0,
      }),
    ],
    { density: 0.8 },
    null,
    water({ scale: 1.4, speed: 0.8, inBeam: 0.6 })
  ),
  lineArt: (context) => mergeDiagrams(waterline(context.aspect, 0.86, 8e-3, 9), sparks()(context)),
  region: { cx: 0.5, cy: 0.5, w: 0.72, h: 0.5 },
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const causticCrystal = caustic({
  kind: 'caustic-crystal',
  label: '\u6676\u5F71',
  mood: 'neutral',
  light: rig(
    [0, 1, 2, 3, 4].map((k) =>
      shaft({
        x: 0.5,
        y: 0.26,
        angle: Math.PI / 2 + (k - 2) * 0.45,
        spread: 0.05,
        width: 0.01,
        length: 0.8,
        softness: 0.5,
        intensity: 0.6,
        streaks: 0.3,
        core: 0.4,
        spectrum: 0.7,
        sway: { amplitude: 0.05, period: 12, phase: k * 0.15 },
      })
    ),
    { density: 0.9 },
    __spreadProps(__spreadValues({}, GLARE), {
      x: 0.5,
      y: 0.26,
      radius: 0.07,
      intensity: 1,
      streak: 0.5,
    }),
    water({
      scale: 3.4,
      speed: 0.2,
      inBeam: 0.4,
      floor: { cx: 0.5, cy: 0.8, rx: 0.3, ry: 0.09, strength: 0.5 },
    })
  ),
  lineArt: (context) =>
    mergeDiagrams(crystal(context.aspect * 0.5, 0.26, 0.05), sparks(14)(context)),
  region: { cx: 0.5, cy: 0.58, w: 0.72, h: 0.44 },
  typography: 'crossed',
  decay: { strength: 1, delay: 1 },
});
const causticDrift = caustic({
  kind: 'caustic-drift',
  label: '\u6F02\u6D41',
  mood: 'quiet',
  light: rig(
    [softTop({ spread: 0.4, width: 0.4, intensity: 1, softness: 0.95 })],
    { density: 0.8, driftX: 4e-3, driftY: 0, ambient: 0.03 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.5 }),
    water({
      scale: 1,
      speed: 0.08,
      inBeam: 0.8,
      floor: { cx: 0.5, cy: 0.5, rx: 0.5, ry: 0.4, strength: 0.4 },
    })
  ),
  lineArt: sparks(8),
  region: { cx: 0.5, cy: 0.5, w: 0.72, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 0.5, delay: 1.8 },
});
const causticStorm = caustic({
  kind: 'caustic-storm',
  label: '\u9AA4\u5149',
  mood: 'loud',
  light: rig(
    [softTop({ intensity: 1, pulse: { amplitude: 0.35, period: 0.9, phase: 0 } })],
    { density: 1.1 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.8 }),
    water({
      scale: 3,
      speed: 1.3,
      inBeam: 1,
      floor: { cx: 0.5, cy: 0.82, rx: 0.5, ry: 0.14, strength: 0.8 },
    })
  ),
  lineArt: (context) =>
    mergeDiagrams(ripples(context.aspect * 0.5, 0.82, 0.5, 4), sparks(14)(context)),
  typography: 'horizontal',
  decay: { strength: 1.3, delay: 0.7 },
});
const CAUSTIC_PROFILES = [
  causticPool,
  causticCup,
  causticRipple,
  causticSurface,
  causticRing,
  causticBurn,
  causticShimmer,
  causticCrystal,
  causticDrift,
  causticStorm,
];
export {
  CAUSTIC_PROFILES,
  causticBurn,
  causticCrystal,
  causticCup,
  causticDrift,
  causticPool,
  causticRing,
  causticRipple,
  causticShimmer,
  causticStorm,
  causticSurface,
};
