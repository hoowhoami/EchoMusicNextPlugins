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
import { temperaHash01 } from '../temperaRandom.mjs';
import {
  buildCrossRow,
  buildDotRow,
  buildHatchSpec,
  buildWavyPath,
  rectPolygon,
} from '../temperaHatch.mjs';
import {
  drawCrossMarks,
  drawHatchFill,
  drawLines,
  drawPolygonFill,
  drawPolyline,
  drawSquareMarks,
} from '../temperaShapes.mjs';
const bandStrip = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const bandY = height * 0.37;
  const bandHeight = height * 0.3;
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, bandY, width + bleed * 2, bandHeight),
      palette.tone3,
      0.96,
      ctx.gradient
    ),
    { span: 0.55, enterDX: -width * 0.5 }
  );
  ctx.add(
    drawLines(
      ctx.pixi,
      [
        { x1: -bleed, y1: bandY - 10, x2: width + bleed, y2: bandY - 22 },
        { x1: -bleed, y1: bandY + bandHeight + 22, x2: width + bleed, y2: bandY + bandHeight + 10 },
      ],
      palette.tone4,
      1.4,
      0.75
    ),
    { delay: 0.12, enterDX: width * 0.25 }
  );
  if (!ctx.showDecor) return;
  ctx.add(
    drawCrossMarks(
      ctx.pixi,
      buildCrossRow(ctx.seed, 17, width * 0.06, bandY - height * 0.16, 4, width * 0.055, 9),
      palette.ink,
      2,
      0.8
    ),
    { delay: 0.2, span: 0.5 }
  );
  ctx.add(
    drawSquareMarks(
      ctx.pixi,
      buildDotRow(
        ctx.seed,
        19,
        width * 0.94,
        bandY + bandHeight + height * 0.06,
        3,
        height * 0.05,
        6
      ),
      palette.ink,
      0.75
    ),
    { delay: 0.26, drift: true }
  );
};
const horizonBand = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const waterline = height * (0.5 + temperaHash01(ctx.seed, 1, 23) * 0.12);
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, -bleed, width + bleed * 2, waterline + bleed),
      palette.tone1,
      0.94,
      ctx.gradient
    ),
    { span: 0.55, enterDY: -height * 0.3 }
  );
  const water = rectPolygon(-bleed, waterline, width + bleed * 2, height - waterline + bleed);
  ctx.add(drawPolygonFill(ctx.pixi, water, palette.tone3, 0.95, ctx.gradient), {
    delay: 0.05,
    span: 0.55,
    enterDY: height * 0.3,
  });
  ctx.add(
    drawHatchFill(
      ctx.pixi,
      water,
      __spreadProps(__spreadValues({}, buildHatchSpec(ctx.seed, 29)), { angle: 0 }),
      palette.tone4,
      0.55
    ),
    { delay: 0.1, span: 0.55, grow: true }
  );
  ctx.add(
    drawPolyline(
      ctx.pixi,
      buildWavyPath(ctx.seed, 31, -bleed, width + bleed, waterline, height * 0.012, 30),
      palette.ink,
      2.2,
      0.85
    ),
    { delay: 0.16, span: 0.5 }
  );
};
const deepDive = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const tones = [palette.tone1, palette.tone2, palette.tone3, palette.tone4];
  const bandHeight = (height + bleed * 2) / tones.length;
  tones.forEach((tone, index) => {
    const top = -bleed + bandHeight * index;
    ctx.add(
      drawPolygonFill(
        ctx.pixi,
        rectPolygon(-bleed, top, width + bleed * 2, bandHeight + 1),
        tone,
        0.95,
        ctx.gradient
      ),
      { delay: index * 0.06, span: 0.55, enterDY: height * 0.3 }
    );
    if (index === 0) return;
    ctx.add(
      drawPolyline(
        ctx.pixi,
        buildWavyPath(ctx.seed, 37 + index, -bleed, width + bleed, top, height * 8e-3, 24),
        palette.paper,
        1.6,
        0.5
      ),
      { delay: index * 0.06 + 0.05, span: 0.5 }
    );
  });
};
const toneRamp = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const spec = buildHatchSpec(ctx.seed, 41);
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, -bleed, width + bleed * 2, height + bleed * 2),
      palette.tone1,
      0.92,
      ctx.gradient
    ),
    { span: 0.5 }
  );
  const steps = 4;
  for (let index = 0; index < steps; index += 1) {
    const columnWidth = (width + bleed * 2) / steps;
    const column = rectPolygon(
      -bleed + columnWidth * index,
      -bleed,
      columnWidth,
      height + bleed * 2
    );
    ctx.add(
      drawHatchFill(
        ctx.pixi,
        column,
        __spreadProps(__spreadValues({}, spec), { spacing: spec.spacing * (1.6 - index * 0.32) }),
        palette.tone4,
        0.6
      ),
      { delay: index * 0.06, span: 0.55, grow: true }
    );
  }
};
const doubleBand = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const slot = height * (0.2 + temperaHash01(ctx.seed, 51, 43) * 0.08);
  const rail = height * 0.3;
  const top = (height - slot) / 2 - rail;
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, top, width + bleed * 2, rail),
      palette.tone3,
      0.95,
      ctx.gradient
    ),
    { span: 0.55, enterDX: -width * 0.4 }
  );
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, top + rail + slot, width + bleed * 2, rail),
      palette.tone4,
      0.95,
      ctx.gradient
    ),
    { delay: 0.07, span: 0.55, enterDX: width * 0.4 }
  );
};
const tiltBand = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const lean = height * (0.14 + temperaHash01(ctx.seed, 53, 47) * 0.14);
  const half = height * 0.17;
  const band = [
    -bleed,
    height / 2 + lean - half,
    width + bleed,
    height / 2 - lean - half,
    width + bleed,
    height / 2 - lean + half,
    -bleed,
    height / 2 + lean + half,
  ];
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, -bleed, width + bleed * 2, height + bleed * 2),
      palette.tone1,
      0.9,
      ctx.gradient
    ),
    { span: 0.5 }
  );
  ctx.add(drawPolygonFill(ctx.pixi, band, palette.tone4, 0.95, ctx.gradient), {
    delay: 0.06,
    span: 0.55,
    enterDX: -width * 0.35,
  });
  ctx.add(
    drawHatchFill(
      ctx.pixi,
      band,
      __spreadProps(__spreadValues({}, buildHatchSpec(ctx.seed, 59)), { angle: Math.PI / 2 }),
      palette.paper,
      0.3
    ),
    { delay: 0.12, span: 0.55, grow: true }
  );
};
const edgeRails = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const rail = height * (0.16 + temperaHash01(ctx.seed, 61, 53) * 0.06);
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, -bleed, width + bleed * 2, rail + bleed),
      palette.tone3,
      0.94,
      ctx.gradient
    ),
    { span: 0.55, enterDY: -height * 0.2 }
  );
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, height - rail, width + bleed * 2, rail + bleed),
      palette.tone3,
      0.94,
      ctx.gradient
    ),
    { delay: 0.06, span: 0.55, enterDY: height * 0.2 }
  );
  if (!ctx.showDecor) return;
  ctx.add(
    drawLines(
      ctx.pixi,
      [
        { x1: -bleed, y1: rail + 8, x2: width + bleed, y2: rail + 8 },
        { x1: -bleed, y1: height - rail - 8, x2: width + bleed, y2: height - rail - 8 },
      ],
      palette.tone4,
      1.2,
      0.6
    ),
    { delay: 0.16, span: 0.5, enterDX: width * 0.2 }
  );
};
const gradientWall = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const spec = buildHatchSpec(ctx.seed, 67);
  const downward = temperaHash01(ctx.seed, 71, 59) > 0.5;
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, -bleed, width + bleed * 2, height + bleed * 2),
      palette.tone2,
      0.94,
      ctx.gradient
    ),
    { span: 0.5 }
  );
  const steps = 5;
  const bandHeight = height / steps;
  for (let index = 0; index < steps; index += 1) {
    const rank = downward ? index : steps - 1 - index;
    const top = bandHeight * index - (index === 0 ? bleed : 0);
    const bottom = bandHeight * (index + 1) + (index === steps - 1 ? bleed : 0);
    ctx.add(
      drawHatchFill(
        ctx.pixi,
        rectPolygon(-bleed, top, width + bleed * 2, bottom - top),
        __spreadProps(__spreadValues({}, spec), { spacing: spec.spacing * (1.9 - rank * 0.34) }),
        palette.tone4,
        0.55
      ),
      { delay: index * 0.05, span: 0.55, grow: true }
    );
  }
};
const terrace = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const tones = [palette.tone1, palette.tone2, palette.tone3, palette.tone4];
  const bandHeight = height / tones.length;
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, -bleed, width + bleed * 2, height + bleed * 2),
      palette.tone1,
      0.9,
      ctx.gradient
    ),
    { span: 0.5 }
  );
  tones.forEach((tone, index) => {
    const left = width * index * 0.14 - bleed;
    const top = bandHeight * index - (index === 0 ? bleed : 0);
    const bottom = bandHeight * (index + 1) + (index === tones.length - 1 ? bleed : 1);
    ctx.add(
      drawPolygonFill(
        ctx.pixi,
        rectPolygon(left, top, width + bleed * 2 - left - bleed, bottom - top),
        tone,
        0.94,
        ctx.gradient
      ),
      { delay: index * 0.06, span: 0.55, enterDX: -width * 0.25 }
    );
  });
};
const TEMPERA_BAND_COMPOSITIONS = {
  'band-strip': bandStrip,
  'horizon-band': horizonBand,
  'deep-dive': deepDive,
  'tone-ramp': toneRamp,
  'double-band': doubleBand,
  'tilt-band': tiltBand,
  'edge-rails': edgeRails,
  'gradient-wall': gradientWall,
  terrace: terrace,
};
export { TEMPERA_BAND_COMPOSITIONS };
