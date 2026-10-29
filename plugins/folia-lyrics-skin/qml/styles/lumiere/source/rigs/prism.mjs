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
  cubeSplitter,
  mergeDiagrams,
  rainbowArcs,
  shards,
  spectrumLines,
} from '../lineart/diagrams.mjs';
import { mergeSpecs, prismTriangle, scatteredSparks } from '../lineart/recipes.mjs';
import { familyOf, GLARE, rig, shaft, standardArt, STARFALL } from './base.mjs';
const prism = familyOf('prism', {
  starfall: __spreadProps(__spreadValues({}, STARFALL), { rain: 50 }),
});
const sparks = ({ aspect, random }) => scatteredSparks({ aspect, count: 16, random, delay: 0.3 });
const tinted = (tint, overrides) =>
  shaft(
    __spreadValues(
      {
        spread: 0.012,
        width: 0.012,
        length: 1.4,
        intensity: 0.7,
        streaks: 0.2,
        streakFreq: 3,
        core: 0.7,
        sway: void 0,
        tint,
      },
      overrides
    )
  );
const prismSplit = prism({
  kind: 'prism-split',
  label: '\u5206\u5149',
  mood: 'loud',
  light: rig(
    [
      shaft({
        x: -0.02,
        y: 0.36,
        angle: 0.08,
        spread: 0.01,
        width: 0.02,
        length: 3,
        intensity: 0.9,
        streaks: 0.2,
        sway: void 0,
        reach: 0.78,
      }),
      shaft({
        x: 0.42,
        y: 0.4,
        angle: 0.3,
        spread: 0.2,
        width: 0.02,
        length: 1.1,
        softness: 0.4,
        intensity: 1.1,
        streaks: 0.35,
        streakFreq: 9,
        core: 0.2,
        spectrum: 1,
        sway: { amplitude: 0.03, period: 11, phase: 0 },
      }),
    ],
    { density: 0.9 },
    __spreadProps(__spreadValues({}, GLARE), {
      x: 0.42,
      y: 0.4,
      radius: 0.06,
      intensity: 1,
      streak: 0.3,
    })
  ),
  lineArt: (context) =>
    mergeSpecs(
      prismTriangle({ cx: context.aspect * 0.42, cy: 0.42, size: 0.2, alpha: 0.8 }),
      sparks(context)
    ),
  region: { cx: 0.62, cy: 0.66, w: 0.6, h: 0.44 },
  typography: 'horizontal',
  burst: { mode: 'sung', density: 0.3, every: 2, offset: 1, size: 3.4, tint: [0.8, 0.9, 1] },
  decay: { strength: 1.2, delay: 0.8 },
});
const prismBand = prism({
  kind: 'prism-band',
  label: '\u5149\u8C31\u5E26',
  mood: 'neutral',
  light: rig(
    [
      shaft({
        x: -0.05,
        y: 0.4,
        angle: 0.12,
        spread: 0.05,
        width: 0.16,
        length: 2.5,
        softness: 0.4,
        intensity: 0.9,
        streaks: 0.25,
        streakFreq: 6,
        core: 0.3,
        spectrum: 1,
        sway: { amplitude: 0.02, period: 14, phase: 0 },
      }),
    ],
    { density: 0.8 },
    null
  ),
  region: { cx: 0.5, cy: 0.56, w: 0.72, h: 0.46 },
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const prismFringe = prism({
  kind: 'prism-fringe',
  label: '\u8679\u8FB9',
  mood: 'quiet',
  light: rig([
    shaft({ spread: 0.1, softness: 0.3, spectrum: 0.35, intensity: 0.9 }),
    shaft({
      spread: 0.3,
      length: 0.6,
      softness: 0.9,
      intensity: 0.25,
      streaks: 0.8,
      streakFreq: 24,
      core: 0.4,
      spectrum: 0.5,
    }),
  ]),
  lineArt: (context) => standardArt(context),
  region: { cx: 0.5, cy: 0.5, w: 0.72, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 0.7, delay: 1.4 },
});
const prismShard = prism({
  kind: 'prism-shard',
  label: '\u788E\u6676',
  mood: 'loud',
  light: ({ random }) => ({
    beams: Array.from({ length: 5 }, (_, i) =>
      shaft({
        x: 0.15 + random() * 0.7,
        y: 0.15 + random() * 0.5,
        angle: random() * Math.PI * 2,
        spread: 0.12,
        width: 0.01,
        length: 0.5,
        softness: 0.5,
        intensity: 0.8,
        streaks: 0.3,
        streakFreq: 6,
        core: 0.3,
        spectrum: 1,
        reach: 0.5 + random() * 0.3,
        sway: { amplitude: 0.1, period: 9 + i, phase: random() },
      })
    ),
    fog: {
      density: 0.9,
      tyndallBase: 0.12,
      scale: 2.4,
      driftX: 8e-3,
      driftY: -0.03,
      warp: 0.9,
      ambient: 0.03,
    },
    glare: null,
  }),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      shards(aspect, random, 8),
      scatteredSparks({ aspect, count: 18, random, delay: 0.3 })
    ),
  typography: 'crossed',
  burst: { mode: 'sweep', density: 0.4, every: 3, offset: 0, size: 3, tint: [0.85, 0.9, 1] },
  decay: { strength: 1.3, delay: 0.7 },
});
const prismLines = prism({
  kind: 'prism-lines',
  label: '\u8C31\u7EBF',
  mood: 'quiet',
  light: rig(
    [
      tinted([1, 0.35, 0.3], { x: 0.22, y: -0.05, angle: Math.PI / 2 }),
      tinted([1, 0.8, 0.3], { x: 0.36, y: -0.05, angle: Math.PI / 2, intensity: 0.5 }),
      tinted([0.5, 1, 0.5], { x: 0.47, y: -0.05, angle: Math.PI / 2, intensity: 0.8 }),
      tinted([0.4, 0.8, 1], { x: 0.61, y: -0.05, angle: Math.PI / 2, intensity: 0.6 }),
      tinted([0.6, 0.45, 1], { x: 0.78, y: -0.05, angle: Math.PI / 2, intensity: 0.45 }),
    ],
    { density: 0.7, ambient: 0.015 },
    null
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      spectrumLines(aspect * 0.12, aspect * 0.88, 0.84, 0.16, random, 18),
      scatteredSparks({ aspect, count: 10, random, delay: 0.3 })
    ),
  region: { cx: 0.5, cy: 0.48, w: 0.72, h: 0.6 },
  typography: 'vertical',
  decay: { strength: 0.6, delay: 1.6 },
});
const prismMerge = prism({
  kind: 'prism-merge',
  label: '\u5408\u5149',
  mood: 'neutral',
  light: rig(
    [
      tinted([1, 0.35, 0.3], { x: -0.02, y: 0.18, angle: 0.47, reach: 0.72, intensity: 0.8 }),
      tinted([0.45, 1, 0.45], { x: -0.02, y: 0.4, angle: 0.1, reach: 0.62, intensity: 0.8 }),
      tinted([0.4, 0.6, 1], { x: -0.02, y: 0.66, angle: -0.29, reach: 0.68, intensity: 0.8 }),
      shaft({
        x: 0.36,
        y: 0.46,
        angle: 0.02,
        spread: 0.02,
        width: 0.02,
        length: 2,
        intensity: 1.1,
        streaks: 0.2,
        streakFreq: 3,
        core: 0.7,
        sway: void 0,
      }),
    ],
    { density: 0.9 },
    __spreadProps(__spreadValues({}, GLARE), {
      x: 0.36,
      y: 0.46,
      radius: 0.06,
      intensity: 1.1,
      streak: 0.5,
    })
  ),
  lineArt: (context) =>
    mergeSpecs(
      prismTriangle({ cx: context.aspect * 0.34, cy: 0.46, size: 0.12, alpha: 0.6 }),
      sparks(context)
    ),
  typography: 'crossed',
  decay: { strength: 1, delay: 1 },
});
const prismCube = prism({
  kind: 'prism-cube',
  label: '\u5206\u675F',
  mood: 'neutral',
  // 射程按高度单位算，光源 x 是画面宽度的比例：入射光要走到分光镜中心，得乘画幅比。
  light: ({ aspect }) =>
    rig(
      [
        shaft({
          x: -0.02,
          y: 0.34,
          angle: 0,
          spread: 0.01,
          width: 0.03,
          length: 3,
          intensity: 0.9,
          streaks: 0.2,
          sway: void 0,
          reach: (0.42 + 0.02) * aspect,
        }),
        shaft({
          x: 0.42,
          y: 0.34,
          angle: 0,
          spread: 0.01,
          width: 0.03,
          length: 3,
          intensity: 0.7,
          streaks: 0.2,
          sway: void 0,
          spectrum: 0.3,
        }),
        shaft({
          x: 0.42,
          y: 0.34,
          angle: Math.PI / 2,
          spread: 0.01,
          width: 0.03,
          length: 3,
          intensity: 0.6,
          streaks: 0.2,
          sway: void 0,
          spectrum: 0.3,
        }),
      ],
      { density: 0.9 },
      __spreadProps(__spreadValues({}, GLARE), {
        x: 0.42,
        y: 0.34,
        radius: 0.05,
        intensity: 0.9,
        streak: 0.4,
      })
    )(),
  lineArt: (context) =>
    mergeDiagrams(
      cubeSplitter(context.aspect * 0.42, 0.34, 0.08),
      scatteredSparks({ aspect: context.aspect, count: 12, random: context.random, delay: 0.3 })
    ),
  region: { cx: 0.6, cy: 0.62, w: 0.6, h: 0.44 },
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const prismWheel = prism({
  kind: 'prism-wheel',
  label: '\u8679\u6247',
  mood: 'loud',
  light: rig(
    [0, 1, 2].map((k) =>
      shaft({
        x: 0.5,
        y: 0.08,
        angle: Math.PI / 2 + (k - 1) * 0.7,
        spread: 0.18,
        width: 0.01,
        length: 1.1,
        softness: 0.4,
        intensity: 0.8,
        streaks: 0.3,
        streakFreq: 8,
        core: 0.2,
        spectrum: 1,
        sway: { amplitude: 0.5, period: 16, phase: k / 3 },
      })
    ),
    { density: 0.9 },
    __spreadProps(__spreadValues({}, GLARE), { y: 0.08, radius: 0.1, intensity: 1.1, streak: 0.4 })
  ),
  lineArt: (context) =>
    mergeSpecs(
      prismTriangle({ cx: context.aspect * 0.5, cy: 0.1, size: 0.1, alpha: 0.6 }),
      sparks(context)
    ),
  typography: 'crossed',
  decay: { strength: 1.2, delay: 0.8 },
});
const prismDroplet = prism({
  kind: 'prism-droplet',
  label: '\u8679\u9713',
  mood: 'quiet',
  light: rig(
    [
      shaft({
        x: 0.5,
        y: 1.2,
        angle: -Math.PI / 2,
        spread: 0.55,
        width: 0.1,
        length: 1.1,
        softness: 0.25,
        intensity: 0.55,
        streaks: 0.1,
        core: 0,
        spectrum: 1,
        sway: void 0,
      }),
    ],
    { density: 0.7, driftY: 0.02 },
    null
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      rainbowArcs(aspect * 0.5, 1.02, 0.62),
      scatteredSparks({ aspect, count: 12, random, delay: 0.3 })
    ),
  starfall: __spreadProps(__spreadValues({}, STARFALL), {
    rain: 160,
    rainSpeed: 0.5,
    rainSpread: 1.6,
    brightness: 0.8,
  }),
  region: { cx: 0.5, cy: 0.46, w: 0.72, h: 0.6 },
  typography: 'vertical',
  decay: { strength: 0.6, delay: 1.6 },
});
const prismSweep = prism({
  kind: 'prism-sweep',
  label: '\u626B\u8C31',
  mood: 'neutral',
  light: rig(
    [
      shaft({
        x: 0.5,
        y: -0.1,
        angle: Math.PI / 2,
        spread: 0.08,
        width: 0.1,
        length: 1.4,
        softness: 0.4,
        intensity: 0.95,
        streaks: 0.2,
        core: 0.3,
        spectrum: 1,
        sway: { amplitude: 0.35, period: 8, phase: 0 },
      }),
    ],
    { density: 0.9 },
    __spreadProps(__spreadValues({}, GLARE), { y: -0.05, intensity: 0.6 })
  ),
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const PRISM_PROFILES = [
  prismSplit,
  prismBand,
  prismFringe,
  prismShard,
  prismLines,
  prismMerge,
  prismCube,
  prismWheel,
  prismDroplet,
  prismSweep,
];
export {
  PRISM_PROFILES,
  prismBand,
  prismCube,
  prismDroplet,
  prismFringe,
  prismLines,
  prismMerge,
  prismShard,
  prismSplit,
  prismSweep,
  prismWheel,
};
