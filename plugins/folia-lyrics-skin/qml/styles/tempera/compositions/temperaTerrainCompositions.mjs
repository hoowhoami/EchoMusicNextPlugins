// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { temperaHash01 } from '../temperaRandom.mjs';
import { rectPolygon } from '../temperaHatch.mjs';
import { rotatePolygon } from '../temperaCurves.mjs';
import { drawLines, drawPolygonFill, drawPolygonFillWithHoles } from '../temperaShapes.mjs';
import { addCutField, addHoleLip } from './temperaCutout.mjs';
import {
  addCornerTicks,
  addFaceRuling,
  addGround,
  addMass,
  addSurveyLines,
  addWireTrace,
} from './temperaMonolithKit.mjs';
const ridgeLine = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const lift = temperaHash01(ctx.seed, 5, 251) * 0.06;
  addGround(ctx, palette.tone1);
  addMass(
    ctx,
    [
      -bleed,
      height * (0.68 + lift),
      width * 0.34,
      height * (0.4 + lift),
      width * 0.62,
      height * (0.58 + lift),
      width + bleed,
      height * (0.34 + lift),
      width + bleed,
      height + bleed,
      -bleed,
      height + bleed,
    ],
    palette.tone3,
    { enterDY: height * 0.08 }
  );
  addFaceRuling(
    ctx,
    [
      width * 0.34,
      height * (0.42 + lift),
      width * 0.62,
      height * (0.6 + lift),
      width * 0.62,
      height + bleed,
      width * 0.34,
      height + bleed,
    ],
    253,
    palette.tone4,
    0.45
  );
  addSurveyLines(ctx, 3);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
  addWireTrace(ctx, width * 0.1, height * 0.86, Math.min(width, height) * 0.08);
};
const chasm = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const gap = rectPolygon(width * 0.46, -bleed, width * 0.1, height + bleed * 2);
  addCutField(ctx, palette.tone1, [gap], { alpha: 0.94 });
  addMass(
    ctx,
    rectPolygon(-bleed, height * 0.3, width * 0.46 + bleed, height * 0.7 + bleed),
    palette.tone3,
    {
      enterDX: -width * 0.1,
      edgeWidth: 2,
    }
  );
  addMass(
    ctx,
    rectPolygon(width * 0.56, height * 0.2, width * 0.44 + bleed, height * 0.8 + bleed),
    palette.tone4,
    {
      delay: 0.08,
      enterDX: width * 0.1,
      edgeWidth: 2,
    }
  );
  addSurveyLines(ctx, 2);
};
const overhang = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addGround(ctx, palette.tone1);
  addMass(
    ctx,
    rectPolygon(-bleed, -bleed, width + bleed * 2, height * 0.34 + bleed),
    palette.tone4,
    {
      enterDY: -height * 0.1,
      edgeWidth: 3,
    }
  );
  addMass(
    ctx,
    rectPolygon(width * 0.72, height * 0.34, width * 0.28 + bleed, height * 0.66 + bleed),
    palette.tone3,
    {
      delay: 0.08,
      enterDX: width * 0.1,
      edge: false,
    }
  );
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, height * 0.34, width + bleed * 2, height * 0.14),
      palette.tone2,
      0.5,
      ctx.gradient
    ),
    { delay: 0.16, span: 0.6 }
  );
  addSurveyLines(ctx, 3);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
};
const stepWell = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const shaft = rectPolygon(width * 0.36, height * 0.6, width * 0.28, height * 0.4 + bleed);
  addCutField(ctx, palette.tone2, [shaft], { alpha: 0.94 });
  [
    [0.14, 0.3, 0.72, palette.tone3],
    [0.24, 0.44, 0.52, palette.tone4],
  ].forEach(([x, y, w, tone], index) => {
    ctx.add(
      drawPolygonFillWithHoles(
        ctx.pixi,
        rectPolygon(width * x, height * y, width * w, height * (1 - y) + bleed),
        [shaft],
        tone,
        0.95,
        ctx.gradient
      ),
      { delay: 0.06 + index * 0.06, span: 0.6, enterDY: height * 0.06 }
    );
  });
  addHoleLip(ctx, shaft, 3, 0.85, 0.18);
  addSurveyLines(ctx, 2);
};
const pierRow = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const water = rectPolygon(-bleed, height * 0.46, width + bleed * 2, height * 0.54 + bleed);
  addCutField(ctx, palette.tone1, [water], { alpha: 0.94 });
  [0.04, 0.28, 0.52, 0.76].forEach((x, index) => {
    addMass(
      ctx,
      rectPolygon(width * x, height * 0.46, width * 0.14, height * 0.54 + bleed),
      palette.tone4,
      {
        delay: 0.06 + index * 0.04,
        enterDY: height * 0.1,
        edge: false,
      }
    );
  });
  addMass(
    ctx,
    rectPolygon(-bleed, height * 0.32, width + bleed * 2, height * 0.16),
    palette.tone3,
    {
      delay: 0.02,
      enterDX: -width * 0.12,
      edgeWidth: 2,
    }
  );
  addSurveyLines(ctx, 2);
};
const revetment = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addGround(ctx, palette.tone1);
  const slope = [
    -bleed,
    height * 0.72,
    width * 0.62,
    height * 0.3,
    width + bleed,
    height * 0.34,
    width + bleed,
    height + bleed,
    -bleed,
    height + bleed,
  ];
  addMass(ctx, slope, palette.tone3, { enterDY: height * 0.1 });
  const ribs = Array.from({ length: 9 }, (_, index) => {
    const x = width * (0.04 + index * 0.11);
    const top = height * (0.72 - (x / (width * 0.62)) * 0.42);
    return {
      x1: x,
      y1: Math.max(top, height * 0.3) + height * 0.03,
      x2: x - width * 0.03,
      y2: height + bleed,
    };
  });
  ctx.add(drawLines(ctx.pixi, ribs, palette.tone4, 2.4, 0.5), { delay: 0.16, span: 0.65 });
  addSurveyLines(ctx, 3);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
};
const towerCrop = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addGround(ctx, palette.tone1);
  addMass(
    ctx,
    rectPolygon(width * 0.58, height * 0.18, width * 0.42 + bleed, height * 0.82 + bleed),
    palette.tone4,
    {
      enterDX: width * 0.08,
      enterDY: height * 0.06,
      edgeWidth: 3,
    }
  );
  addFaceRuling(
    ctx,
    rectPolygon(width * 0.62, height * 0.26, width * 0.12, height * 0.6),
    257,
    palette.paper,
    0.3
  );
  addSurveyLines(ctx, 2);
  if (!ctx.showDecor) return;
  addWireTrace(ctx, width * 0.2, height * 0.7, Math.min(width, height) * 0.1);
  addCornerTicks(ctx);
};
const lintel = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addGround(ctx, palette.tone1);
  addMass(ctx, rectPolygon(-bleed, height * 0.4, width + bleed * 2, height * 0.2), palette.tone3, {
    enterDX: -width * 0.16,
    edgeWidth: 3,
  });
  [0.18, 0.66].forEach((x, index) => {
    addMass(ctx, rectPolygon(width * x, height * 0.6, width * 0.16, height * 0.12), palette.tone4, {
      delay: 0.12 + index * 0.04,
      enterDY: height * 0.06,
      edge: false,
    });
  });
  addSurveyLines(ctx, 3);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
};
const rubbleFan = (ctx) => {
  const { width, height, palette } = ctx;
  const hubX = -width * 0.12;
  const hubY = height * 1.12;
  addGround(ctx, palette.tone1);
  for (let index = 0; index < 5; index += 1) {
    const angle = -1.24 + index * 0.19 + temperaHash01(ctx.seed, index, 259) * 0.05;
    const reach = Math.hypot(width, height) * (0.5 + index * 0.09);
    const slab = rectPolygon(
      hubX + reach * 0.34,
      hubY - height * 0.06,
      reach * 0.5,
      height * 0.12 + index * 8
    );
    addMass(
      ctx,
      rotatePolygon(slab, hubX, hubY, angle),
      index % 2 === 0 ? palette.tone3 : palette.tone4,
      {
        delay: 0.04 + index * 0.05,
        enterDX: -width * 0.06,
        enterDY: height * 0.06,
        edgeWidth: 2,
      }
    );
  }
  addSurveyLines(ctx, 2);
};
const gnomon = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addGround(ctx, palette.tone1);
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      [
        width * 0.42,
        height * 0.86,
        width + bleed,
        height * 0.6,
        width + bleed,
        height * 0.78,
        width * 0.46,
        height * 0.94,
      ],
      palette.tone2,
      0.6,
      ctx.gradient
    ),
    { delay: 0.1, span: 0.65, enterDX: width * 0.1 }
  );
  addMass(
    ctx,
    [
      width * 0.3,
      height + bleed,
      width * 0.36,
      height * 0.16,
      width * 0.42,
      height * 0.16,
      width * 0.46,
      height + bleed,
    ],
    palette.tone4,
    { delay: 0.04, enterDY: height * 0.08, edgeWidth: 2 }
  );
  addSurveyLines(ctx, 3);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
  addWireTrace(ctx, width * 0.8, height * 0.82, Math.min(width, height) * 0.08);
};
const TEMPERA_TERRAIN_COMPOSITIONS = {
  'ridge-line': ridgeLine,
  chasm: chasm,
  overhang: overhang,
  'step-well': stepWell,
  'pier-row': pierRow,
  revetment: revetment,
  'tower-crop': towerCrop,
  lintel: lintel,
  'rubble-fan': rubbleFan,
  gnomon: gnomon,
};
export { TEMPERA_TERRAIN_COMPOSITIONS };
