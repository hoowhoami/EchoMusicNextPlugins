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
import { curtains, lampHead, mergeDiagrams, projector } from '../lineart/diagrams.mjs';
import { scatteredSparks } from '../lineart/recipes.mjs';
import { FOG, familyOf, MOTES, shaft } from './base.mjs';
const stage = familyOf('stage', {
  motes: __spreadProps(__spreadValues({}, MOTES), { count: 200 }),
});
const HAZE = __spreadProps(__spreadValues({}, FOG), {
  density: 1.25,
  tyndallBase: 0.08,
  scale: 2,
  driftX: 0.01,
  driftY: -0.015,
  warp: 1.1,
  ambient: 0.035,
});
const lamp = (aspect, a, b, overrides = {}) =>
  shaft(
    __spreadValues(
      {
        x: a[0],
        y: a[1],
        angle: Math.atan2(b[1] - a[1], (b[0] - a[0]) * aspect),
        spread: 0.08,
        width: 0.03,
        length: 1.3,
        softness: 0.55,
        intensity: 1,
        streaks: 0.4,
        streakFreq: 6,
        core: 0.6,
        sway: void 0,
      },
      overrides
    )
  );
const stageRig = (beams, glare = null, fog = {}) => ({
  beams,
  fog: __spreadValues(__spreadValues({}, HAZE), fog),
  glare,
});
const lampsArt = (context, beams) =>
  mergeDiagrams(
    ...beams.map((beam, i) =>
      lampHead(beam.x * context.aspect, beam.y, beam.angle, 0.035, { delay: i * 0.05 })
    ),
    scatteredSparks({ aspect: context.aspect, count: 10, random: context.random, delay: 0.3 })
  );
const withLamps = (build) => ({
  light: build,
  lineArt: (context) => lampsArt(context, build(context).beams),
});
const CENTER = [0.5, 0.56];
const stageSpot = stage(
  __spreadProps(
    __spreadValues(
      {
        kind: 'stage-spot',
        label: '\u72EC\u5149',
        mood: 'neutral',
      },
      withLamps(({ aspect }) =>
        stageRig(
          [lamp(aspect, [0.14, 0.02], CENTER, { sway: { amplitude: 0.02, period: 12, phase: 0 } })],
          { x: 0.14, y: 0.02, radius: 0.08, intensity: 0.9, streak: 0.5 }
        )
      )
    ),
    {
      typography: 'horizontal',
      decay: { strength: 1, delay: 1 },
    }
  )
);
const stageCross = stage(
  __spreadProps(
    __spreadValues(
      {
        kind: 'stage-cross',
        label: '\u4EA4\u53C9',
        mood: 'loud',
      },
      withLamps(({ aspect }) =>
        stageRig(
          [
            lamp(aspect, [0.06, 0.02], CENTER, { sway: { amplitude: 0.03, period: 9, phase: 0 } }),
            lamp(aspect, [0.94, 0.02], CENTER, {
              sway: { amplitude: 0.03, period: 9, phase: 0.5 },
            }),
          ],
          { x: 0.5, y: 0.56, radius: 0.06, intensity: 0.6, streak: 0.6 }
        )
      )
    ),
    {
      typography: 'crossed',
      burst: { mode: 'sung', density: 0.3, every: 2, offset: 1, size: 3.4, tint: [1, 0.75, 0.5] },
      decay: { strength: 1.3, delay: 0.7 },
    }
  )
);
const stageSearch = stage(
  __spreadProps(
    __spreadValues(
      {
        kind: 'stage-search',
        label: '\u63A2\u7167',
        mood: 'loud',
      },
      withLamps(() =>
        stageRig(
          [0.15, 0.38, 0.62, 0.85].map((x, i) =>
            shaft({
              x,
              y: 1.02,
              angle: -Math.PI / 2,
              spread: 0.035,
              width: 0.03,
              length: 1.4,
              softness: 0.5,
              intensity: 0.8,
              streaks: 0.3,
              streakFreq: 5,
              core: 0.6,
              sway: { amplitude: 0.45, period: 7 + i * 1.3, phase: i * 0.27 },
            })
          )
        )
      )
    ),
    {
      region: { cx: 0.5, cy: 0.44, w: 0.72, h: 0.46 },
      typography: 'horizontal',
      decay: { strength: 1.3, delay: 0.7 },
    }
  )
);
const stageFootlight = stage(
  __spreadProps(
    __spreadValues(
      {
        kind: 'stage-footlight',
        label: '\u811A\u5149',
        mood: 'quiet',
      },
      withLamps(() =>
        stageRig(
          [0.25, 0.5, 0.75].map((x) =>
            shaft({
              x,
              y: 1.03,
              angle: -Math.PI / 2,
              spread: 0.22,
              width: 0.08,
              length: 0.7,
              softness: 0.9,
              intensity: 0.6,
              streaks: 0.4,
              streakFreq: 10,
              core: 0.3,
              tint: [1, 0.8, 0.6],
              sway: void 0,
            })
          ),
          null,
          { driftY: -0.03 }
        )
      )
    ),
    {
      region: { cx: 0.5, cy: 0.46, w: 0.5, h: 0.62 },
      typography: 'vertical',
      decay: { strength: 0.6, delay: 1.6 },
    }
  )
);
const stageBacklight = stage({
  kind: 'stage-backlight',
  label: '\u9006\u5149',
  mood: 'neutral',
  light: () =>
    stageRig(
      Array.from({ length: 6 }, (_, k) =>
        shaft({
          x: 0.5,
          y: 0.5,
          angle: (k / 6) * Math.PI * 2 + 0.5,
          spread: 0.12,
          width: 0.02,
          length: 0.8,
          softness: 0.7,
          intensity: 0.6,
          streaks: 0.6,
          streakFreq: 10,
          core: 0.4,
          sway: { amplitude: 0.05, period: 11, phase: k / 6 },
        })
      ),
      { x: 0.5, y: 0.5, radius: 0.22, intensity: 1.2, streak: 0.8 }
    ),
  lineArt: ({ aspect, random }) => scatteredSparks({ aspect, count: 18, random, delay: 0.3 }),
  region: { cx: 0.5, cy: 0.5, w: 0.72, h: 0.5 },
  typography: 'crossed',
  decay: { strength: 1, delay: 1 },
});
const stagePinspot = stage(
  __spreadProps(
    __spreadValues(
      {
        kind: 'stage-pinspot',
        label: '\u9488\u5149',
        mood: 'quiet',
      },
      withLamps(({ aspect }) =>
        stageRig(
          [
            lamp(aspect, [0.5, 0.02], CENTER, {
              spread: 0.03,
              width: 0.01,
              intensity: 0.9,
              core: 0.9,
            }),
          ],
          null,
          { ambient: 0.015 }
        )
      )
    ),
    {
      typography: 'horizontal',
      decay: { strength: 0.6, delay: 1.6 },
    }
  )
);
const stageStrobe = stage(
  __spreadProps(
    __spreadValues(
      {
        kind: 'stage-strobe',
        label: '\u9891\u95EA',
        mood: 'loud',
      },
      withLamps(({ aspect }) =>
        stageRig(
          [0.1, 0.36, 0.64, 0.9].map((x, i) =>
            lamp(aspect, [x, 0.02], [0.5, 0.6], {
              spread: 0.08,
              intensity: 0.55,
              pulse: { amplitude: 0.95, period: 0.5, phase: i * 0.25 },
            })
          ),
          { x: 0.5, y: 0.02, radius: 0.2, intensity: 0.6, streak: 0.4 }
        )
      )
    ),
    {
      typography: 'crossed',
      burst: { mode: 'sweep', density: 0.5, every: 2, offset: 0, size: 3, tint: [1, 0.9, 0.8] },
      decay: { strength: 1.4, delay: 0.6 },
    }
  )
);
const stageCurtain = stage({
  kind: 'stage-curtain',
  label: '\u5E55\u7F1D',
  mood: 'quiet',
  light: () =>
    stageRig(
      [
        shaft({
          spread: 0.01,
          width: 0.04,
          length: 1.6,
          softness: 0.5,
          intensity: 0.9,
          streaks: 0.3,
          core: 0.7,
          sway: void 0,
        }),
      ],
      { x: 0.5, y: -0.02, radius: 0.08, intensity: 0.8, streak: 0.5 },
      { ambient: 0.02 }
    ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      curtains(aspect, 0.06),
      scatteredSparks({ aspect, count: 8, random, delay: 0.3, region: [0.3, 0.2, 0.7, 0.9] })
    ),
  region: { cx: 0.5, cy: 0.5, w: 0.3, h: 0.66 },
  typography: 'vertical',
  decay: { strength: 0.6, delay: 1.6 },
});
const stageLaser = stage(
  __spreadProps(
    __spreadValues(
      {
        kind: 'stage-laser',
        label: '\u6FC0\u5149',
        mood: 'loud',
      },
      withLamps(() =>
        stageRig(
          Array.from({ length: 6 }, (_, k) =>
            shaft({
              x: 0.5,
              y: 1.02,
              angle: -Math.PI / 2 + (k - 2.5) * 0.22,
              spread: 2e-3,
              width: 4e-3,
              length: 2,
              softness: 0.3,
              intensity: 1.2,
              streaks: 0,
              core: 0.9,
              sway: { amplitude: 0.25, period: 4.5, phase: k * 0.08 },
            })
          ),
          { x: 0.5, y: 1, radius: 0.06, intensity: 1, streak: 0.6 },
          { density: 1.4 }
        )
      )
    ),
    {
      region: { cx: 0.5, cy: 0.4, w: 0.72, h: 0.46 },
      typography: 'horizontal',
      decay: { strength: 1.3, delay: 0.7 },
    }
  )
);
const stageProjector = stage({
  kind: 'stage-projector',
  label: '\u653E\u6620',
  mood: 'neutral',
  light: () =>
    stageRig(
      [
        shaft({
          x: 0.12,
          y: 0.4,
          angle: 0.05,
          spread: 0.2,
          width: 0.02,
          length: 1.8,
          softness: 0.4,
          intensity: 1,
          streaks: 0.5,
          streakFreq: 9,
          core: 0.4,
          sway: void 0,
          pulse: { amplitude: 0.05, period: 0.12, phase: 0 },
        }),
      ],
      { x: 0.12, y: 0.4, radius: 0.05, intensity: 1, streak: 0.4 }
    ),
  lineArt: ({ aspect, random }) =>
    mergeDiagrams(
      projector(aspect * 0.12, 0.4, 0.1),
      scatteredSparks({ aspect, count: 10, random, delay: 0.3 })
    ),
  motes: __spreadProps(__spreadValues({}, MOTES), {
    count: 380,
    driftX: 4e-3,
    swirl: 0.03,
    gain: 1.8,
  }),
  region: { cx: 0.62, cy: 0.5, w: 0.44, h: 0.58 },
  typography: 'vertical',
  decay: { strength: 1, delay: 1 },
});
const STAGE_PROFILES = [
  stageSpot,
  stageCross,
  stageSearch,
  stageFootlight,
  stageBacklight,
  stagePinspot,
  stageStrobe,
  stageCurtain,
  stageLaser,
  stageProjector,
];
export {
  STAGE_PROFILES,
  stageBacklight,
  stageCross,
  stageCurtain,
  stageFootlight,
  stageLaser,
  stagePinspot,
  stageProjector,
  stageSearch,
  stageSpot,
  stageStrobe,
};
