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
  bigLeaf,
  bloom,
  canopy,
  cells,
  fernCurl,
  mergeDiagrams,
  molecule,
  seedRoots,
  vine,
} from '../lineart/diagrams.mjs';
import {
  mergeSpecs,
  protractorHalo,
  scatteredSparks,
  sprout,
  viewfinderFrame,
} from '../lineart/recipes.mjs';
import { fan, familyOf, GLARE, MOTES, rig, shaft, STARFALL } from './base.mjs';
const botanySprout = {
  kind: 'botany-sprout',
  label: '\u840C\u82BD',
  family: 'botany',
  mood: 'quiet',
  light: () => ({
    beams: [
      {
        x: 0.5,
        y: -0.05,
        angle: Math.PI / 2,
        spread: 0.075,
        width: 0.07,
        length: 1.2,
        softness: 0.7,
        intensity: 0.95,
        streaks: 0.5,
        streakFreq: 6,
        streakSpeed: 0.06,
        core: 0.7,
        sway: { amplitude: 8e-3, period: 15, phase: 0.2 },
      },
      {
        x: 0.5,
        y: -0.05,
        angle: Math.PI / 2,
        spread: 0.26,
        length: 0.75,
        softness: 0.95,
        intensity: 0.42,
        streaks: 0.85,
        streakFreq: 30,
        streakSpeed: 0.04,
        core: 0.3,
      },
    ],
    fog: {
      density: 0.9,
      tyndallBase: 0.14,
      scale: 2,
      driftX: -6e-3,
      driftY: -0.03,
      warp: 1.1,
      ambient: 0.025,
    },
    glare: { x: 0.5, y: -0.01, radius: 0.1, intensity: 0.9, streak: 0.35 },
  }),
  motes: {
    count: 200,
    sizeMin: 4e-3,
    sizeMax: 0.011,
    driftX: -3e-3,
    driftY: -0.012,
    swirl: 0.018,
    swirlPeriod: 11,
    twinkle: 0.55,
    ambient: 0.012,
    gain: 1.2,
  },
  front: {
    count: 6,
    sizeMin: 0.05,
    sizeMax: 0.12,
    driftX: -4e-3,
    driftY: -2e-3,
    swirl: 0.01,
    swirlPeriod: 16,
    twinkle: 0.2,
    ambient: 0.015,
    gain: 0.25,
  },
  lineArt: ({ aspect, random }) =>
    mergeSpecs(
      sprout({ cx: aspect * 0.5, baseY: 0.78, size: 0.22, alpha: 1 }),
      protractorHalo({ cx: aspect * 0.5, cy: 0.02, radius: 0.22, alpha: 0.35, delay: 0.2 }),
      viewfinderFrame({
        aspect,
        left: 0.07,
        top: 0.22,
        right: 0.93,
        bottom: 0.8,
        delay: 0.25,
        alpha: 0.22,
      }),
      scatteredSparks({ aspect, count: 12, random, delay: 0.35, region: [0.2, 0.3, 0.8, 0.9] })
    ),
  // 竖排为主：当前行竖在光柱里，像茎一样从叶上长出来。
  region: { cx: 0.5, cy: 0.44, w: 0.72, h: 0.6 },
  heroSize: 0.08,
  // 光柱窄，背景碎片小一点。
  echo: { size: 0.28 },
  typography: 'vertical',
  decay: { strength: 0.75, delay: 1.2 },
  starfall: {
    stars: 300,
    opening: 3.6,
    rain: 50,
    rainSpeed: 0.16,
    rainSpread: 0.25,
    brightness: 0.85,
  },
  camera: { push: 0.03, driftX: 0, driftY: 4e-3 },
};
const botany = familyOf('botany', {
  motes: __spreadProps(__spreadValues({}, MOTES), { count: 220, driftY: -0.012 }),
  // 叶、蕨、花、藤的线稿是这一族的主角。
  artGain: 1.7,
  starfall: __spreadProps(__spreadValues({}, STARFALL), { rain: 40 }),
});
const sparks = ({ aspect, random }) => scatteredSparks({ aspect, count: 12, random, delay: 0.3 });
const botanyVeins = botany({
  kind: 'botany-veins',
  label: '\u53F6\u8109',
  mood: 'neutral',
  light: rig(
    [
      shaft({
        x: 0.15,
        y: -0.05,
        angle: 1.1,
        spread: 0.12,
        width: 0.12,
        length: 1.4,
        intensity: 0.9,
        streaks: 0.5,
        streakFreq: 6,
      }),
    ],
    { density: 0.9 },
    __spreadProps(__spreadValues({}, GLARE), { x: 0.15, y: -0.02, radius: 0.14, intensity: 0.8 })
  ),
  lineArt: (context) =>
    mergeDiagrams(bigLeaf(context.aspect * 0.52, 0.42, 0.62, -0.45), sparks(context)),
  region: { cx: 0.5, cy: 0.72, w: 0.72, h: 0.36 },
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const botanyCanopy = botany({
  kind: 'botany-canopy',
  label: '\u6797\u51A0',
  mood: 'loud',
  light: rig(
    [0.25, 0.48, 0.7].map((x, i) =>
      shaft({
        x,
        y: -0.05,
        angle: 1.45 + i * 0.1,
        spread: 0.08,
        width: 0.08,
        length: 1.3,
        softness: 0.6,
        intensity: 0.85,
        streaks: 0.5,
        streakFreq: 6,
        gobo: { pattern: 'leaves', frequency: 9, duty: 0.5, drift: 0.14 },
        sway: { amplitude: 0.03, period: 6 + i, phase: i * 0.3 },
      })
    ),
    { density: 1.1, driftX: 8e-3 },
    null
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      canopy(aspect, random),
      scatteredSparks({ aspect, count: 16, random, delay: 0.3 })
    ),
  motes: __spreadProps(__spreadValues({}, MOTES), {
    count: 300,
    driftX: 8e-3,
    driftY: 6e-3,
    swirl: 0.03,
  }),
  typography: 'crossed',
  decay: { strength: 1.2, delay: 0.8 },
  starfall: __spreadProps(__spreadValues({}, STARFALL), { rain: 90, rainSpread: 1.2 }),
});
const botanyFern = botany({
  kind: 'botany-fern',
  label: '\u8568\u5377',
  mood: 'neutral',
  light: rig([shaft({ x: 0.3, spread: 0.08, intensity: 0.85 }), fan({ x: 0.3, intensity: 0.2 })]),
  lineArt: (context) => mergeDiagrams(fernCurl(context.aspect * 0.28, 0.42, 0.16), sparks(context)),
  region: { cx: 0.62, cy: 0.5, w: 0.5, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 0.8, delay: 1.2 },
});
const botanySeed = botany({
  kind: 'botany-seed',
  label: '\u79CD\u5B50',
  mood: 'quiet',
  light: rig(
    [shaft({ spread: 0.04, width: 0.02, length: 1.2, intensity: 0.8, core: 0.9 })],
    { density: 0.7, ambient: 0.02 },
    __spreadProps(__spreadValues({}, GLARE), { intensity: 0.6 })
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      seedRoots(aspect * 0.5, 0.7, random),
      scatteredSparks({ aspect, count: 10, random, delay: 0.3 })
    ),
  region: { cx: 0.5, cy: 0.38, w: 0.72, h: 0.4 },
  typography: 'horizontal',
  decay: { strength: 0.6, delay: 1.6 },
});
const botanyBloom = botany({
  kind: 'botany-bloom',
  label: '\u7EFD\u653E',
  mood: 'loud',
  light: rig(
    Array.from({ length: 6 }, (_, k) =>
      shaft({
        x: 0.5,
        y: 0.42,
        angle: (k / 6) * Math.PI * 2 + 0.26,
        spread: 0.12,
        width: 0.01,
        length: 0.6,
        softness: 0.7,
        intensity: 0.55,
        streaks: 0.5,
        streakFreq: 7,
        core: 0.4,
        reach: 0.45,
        sway: { amplitude: 0.05, period: 10, phase: k / 6 },
      })
    ),
    { density: 0.9 },
    { x: 0.5, y: 0.42, radius: 0.1, intensity: 1.2, streak: 0.4 }
  ),
  lineArt: (context) => mergeDiagrams(bloom(context.aspect * 0.5, 0.42, 0.2, 8), sparks(context)),
  typography: 'crossed',
  burst: { mode: 'sweep', density: 0.5, every: 3, offset: 1, size: 3, tint: [1, 0.8, 0.7] },
  decay: { strength: 1.2, delay: 0.8 },
});
const botanyVine = botany({
  kind: 'botany-vine',
  label: '\u85E4\u65CB',
  mood: 'neutral',
  light: rig(
    [shaft({ x: 0.72, spread: 0.07, intensity: 0.9 }), fan({ x: 0.72, intensity: 0.2 })],
    {},
    __spreadProps(__spreadValues({}, GLARE), { x: 0.72 })
  ),
  lineArt: (context) =>
    mergeDiagrams(vine(context.aspect * 0.72, 1.02, 0.08, 0.05, 4), sparks(context)),
  region: { cx: 0.36, cy: 0.5, w: 0.5, h: 0.62 },
  typography: 'vertical',
  decay: { strength: 1, delay: 1 },
});
const botanyChloro = botany({
  kind: 'botany-chloro',
  label: '\u53F6\u7EFF',
  mood: 'quiet',
  light: rig(
    [shaft({ spread: 0.2, width: 0.3, softness: 0.9, intensity: 0.6, core: 0.3 })],
    { density: 0.7 },
    null,
    {
      caustic: {
        scale: 6,
        speed: 0.12,
        inBeam: 0.3,
        floor: { cx: 0.5, cy: 0.45, rx: 0.2, ry: 0.36, strength: 0.35 },
      },
    }
  ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      cells(aspect * 0.5, 0.45, 0.36, random, 22),
      scatteredSparks({ aspect, count: 8, random, delay: 0.3 })
    ),
  region: { cx: 0.5, cy: 0.5, w: 0.5, h: 0.5 },
  typography: 'crossed',
  decay: { strength: 0.6, delay: 1.6 },
});
const botanyFormula = botany({
  kind: 'botany-formula',
  label: '\u5149\u5408\u5F0F',
  mood: 'neutral',
  light: rig([shaft(), fan()]),
  lineArt: (context) =>
    mergeDiagrams(
      molecule(context.aspect * 0.24, 0.3, 0.06),
      molecule(context.aspect * 0.78, 0.74, 0.05, { delay: 0.2 }),
      protractorHalo({ cx: context.aspect * 0.5, cy: 0.03, radius: 0.28, alpha: 0.5 }),
      sparks(context)
    ),
  typography: 'horizontal',
  decay: { strength: 1, delay: 1 },
});
const botanyPollen = botany({
  kind: 'botany-pollen',
  label: '\u82B1\u7C89',
  mood: 'loud',
  light: rig(
    [
      shaft({
        x: 0.2,
        y: -0.05,
        angle: 1.15,
        spread: 0.14,
        width: 0.16,
        length: 1.5,
        intensity: 1,
        streaks: 0.5,
      }),
      fan({ x: 0.2, angle: 1.15, intensity: 0.3 }),
    ],
    { density: 1, driftX: 0.012, driftY: -0.01 },
    __spreadProps(__spreadValues({}, GLARE), { x: 0.2, y: 0 })
  ),
  lineArt: sparks,
  motes: {
    count: 360,
    sizeMin: 6e-3,
    sizeMax: 0.022,
    driftX: 0.012,
    driftY: -6e-3,
    swirl: 0.04,
    swirlPeriod: 10,
    twinkle: 0.4,
    ambient: 0.02,
    gain: 1.6,
  },
  typography: 'horizontal',
  decay: { strength: 1.2, delay: 0.8 },
});
const BOTANY_PROFILES = [
  botanySprout,
  botanyVeins,
  botanyCanopy,
  botanyFern,
  botanySeed,
  botanyBloom,
  botanyVine,
  botanyChloro,
  botanyFormula,
  botanyPollen,
];
export {
  BOTANY_PROFILES,
  botanyBloom,
  botanyCanopy,
  botanyChloro,
  botanyFern,
  botanyFormula,
  botanyPollen,
  botanySeed,
  botanySprout,
  botanyVeins,
  botanyVine,
};
