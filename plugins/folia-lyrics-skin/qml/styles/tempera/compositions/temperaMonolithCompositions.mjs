// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { temperaHash01 } from '../temperaRandom.mjs';
import { rectPolygon } from '../temperaHatch.mjs';
import { drawLines, drawPolygonFill, drawPolygonOutline } from '../temperaShapes.mjs';
import { addCutField, addHoleLip } from './temperaCutout.mjs';
import {
  addCornerTicks,
  addFaceRuling,
  addGround,
  addMass,
  addSurveyLines,
  addWireTrace,
} from './temperaMonolithKit.mjs';
const apexMass = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const apexX = width * (0.46 + temperaHash01(ctx.seed, 3, 227) * 0.12);
  const apexY = height * 0.38;
  addGround(ctx, palette.tone1);
  const mass = [-bleed, height + bleed, apexX, apexY, width + bleed, height + bleed];
  addMass(ctx, mass, palette.tone3, { enterDY: height * 0.1 });
  addFaceRuling(
    ctx,
    [apexX, apexY, width + bleed, height + bleed, apexX + width * 0.24, height + bleed],
    229
  );
  addSurveyLines(ctx, 3);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
  addWireTrace(ctx, width * 0.12, height * 0.84, Math.min(width, height) * 0.09);
};
const ziggurat = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addGround(ctx, palette.tone1);
  const tones = [palette.tone4, palette.tone3, palette.tone3, palette.tone2];
  for (let course = 0; course < 4; course += 1) {
    const half = width * (0.44 - course * 0.09);
    const top = height * (0.9 - course * 0.13) - height * 0.13;
    addMass(
      ctx,
      rectPolygon(width / 2 - half, top, half * 2, height * 0.13 + bleed),
      tones[course],
      {
        delay: 0.04 + course * 0.05,
        enterDY: height * 0.08,
        edgeWidth: 2,
      }
    );
  }
  addSurveyLines(ctx, 2);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
};
const slabWall = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const edge = width * 0.36;
  addGround(ctx, palette.tone1);
  addMass(ctx, rectPolygon(edge, -bleed, width - edge + bleed, height + bleed * 2), palette.tone3, {
    edge: false,
  });
  ctx.add(
    drawLines(
      ctx.pixi,
      [{ x1: edge, y1: -bleed, x2: edge, y2: height + bleed }],
      palette.ink,
      3.5,
      0.9
    ),
    { delay: 0.1, span: 0.55, enterDX: width * 0.06 }
  );
  addFaceRuling(ctx, rectPolygon(width * 0.62, height * 0.1, width * 0.3, height * 0.8), 233);
  addSurveyLines(ctx, 3);
  if (!ctx.showDecor) return;
  addWireTrace(ctx, width * 0.16, height * 0.24, Math.min(width, height) * 0.08);
};
const cantilever = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addGround(ctx, palette.tone1);
  addMass(
    ctx,
    rectPolygon(0.16 * width, height * 0.5, width * 0.1, height * 0.5 + bleed),
    palette.tone4,
    {
      delay: 0.02,
      enterDY: height * 0.1,
      edge: false,
    }
  );
  addMass(
    ctx,
    rectPolygon(-bleed, height * 0.34, width * 0.78 + bleed, height * 0.16),
    palette.tone3,
    {
      delay: 0.08,
      enterDX: -width * 0.14,
    }
  );
  addFaceRuling(
    ctx,
    rectPolygon(width * 0.3, height * 0.36, width * 0.44, height * 0.12),
    239,
    palette.paper,
    0.35
  );
  addSurveyLines(ctx, 2);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
};
const pylonPair = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const bay = rectPolygon(width * 0.26, height * 0.3, width * 0.48, height * 0.7 + bleed);
  addCutField(ctx, palette.tone1, [bay], { alpha: 0.94 });
  addHoleLip(ctx, bay, 2, 0.6, 0.12);
  [0.1, 0.74].forEach((x, index) => {
    addMass(
      ctx,
      rectPolygon(width * x, height * 0.28, width * 0.16, height * 0.72 + bleed),
      palette.tone4,
      {
        delay: 0.04 + index * 0.05,
        enterDY: height * 0.08,
        edgeWidth: 2,
      }
    );
  });
  addMass(
    ctx,
    rectPolygon(width * 0.04, height * 0.14, width * 0.92, height * 0.16),
    palette.tone3,
    {
      delay: 0.14,
      enterDY: -height * 0.1,
    }
  );
  addSurveyLines(ctx, 2);
};
const bunkerSlit = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const slit = rectPolygon(-bleed, height * 0.62, width + bleed * 2, height * 0.06);
  addCutField(ctx, palette.tone1, [slit], { alpha: 0.94 });
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, height * 0.34, width + bleed * 2, height * 0.28),
      palette.tone4,
      0.95,
      ctx.gradient
    ),
    { delay: 0.05, span: 0.6, enterDY: -height * 0.08 }
  );
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, height * 0.68, width + bleed * 2, height * 0.32 + bleed),
      palette.tone4,
      0.95,
      ctx.gradient
    ),
    { delay: 0.08, span: 0.6, enterDY: height * 0.1 }
  );
  ctx.add(
    drawLines(
      ctx.pixi,
      [{ x1: -bleed, y1: height * 0.34, x2: width + bleed, y2: height * 0.34 }],
      palette.ink,
      3,
      0.85
    ),
    { delay: 0.14, span: 0.5 }
  );
  addFaceRuling(
    ctx,
    rectPolygon(width * 0.08, height * 0.72, width * 0.36, height * 0.2),
    241,
    palette.paper,
    0.3
  );
  addSurveyLines(ctx, 2);
};
const plinthStack = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addGround(ctx, palette.tone1);
  addMass(
    ctx,
    rectPolygon(width * 0.06, height * 0.72, width * 0.88, height * 0.28 + bleed),
    palette.tone4,
    { edgeWidth: 2 }
  );
  addMass(
    ctx,
    rectPolygon(width * 0.16, height * 0.52, width * 0.68, height * 0.2),
    palette.tone3,
    { delay: 0.08, edgeWidth: 2 }
  );
  addMass(
    ctx,
    rectPolygon(width * 0.28, height * 0.34, width * 0.44, height * 0.18),
    palette.tone2,
    { delay: 0.14, enterDY: height * 0.06 }
  );
  addFaceRuling(ctx, rectPolygon(width * 0.2, height * 0.76, width * 0.6, height * 0.16), 243);
  addSurveyLines(ctx, 3);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
};
const buttressRun = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const band = rectPolygon(-bleed, height * 0.42, width + bleed * 2, height * 0.58 + bleed);
  addCutField(ctx, palette.tone1, [band], { alpha: 0.94 });
  for (let index = 0; index < 5; index += 1) {
    const left = width * (index * 0.2 + 0.01);
    addMass(
      ctx,
      [
        left,
        height + bleed,
        left + width * 0.09,
        height * 0.42,
        left + width * 0.17,
        height + bleed,
      ],
      index % 2 === 0 ? palette.tone4 : palette.tone3,
      {
        delay: 0.04 + index * 0.04,
        enterDY: height * 0.12,
        edgeWidth: 2,
      }
    );
  }
  ctx.add(
    drawLines(
      ctx.pixi,
      [{ x1: -bleed, y1: height * 0.42, x2: width + bleed, y2: height * 0.42 }],
      palette.ink,
      2.4,
      0.8
    ),
    { delay: 0.2, span: 0.5, enterDX: -width * 0.1 }
  );
  addSurveyLines(ctx, 2);
};
const voidCore = (ctx) => {
  const { width, height, palette } = ctx;
  const core = rectPolygon(width * 0.22, height * 0.34, width * 0.56, height * 0.46);
  addCutField(ctx, palette.tone3, [core], { alpha: 0.95 });
  addHoleLip(ctx, core, 3.5, 0.9, 0.08);
  addFaceRuling(
    ctx,
    rectPolygon(width * 0.04, height * 0.36, width * 0.14, height * 0.42),
    247,
    palette.tone4,
    0.45
  );
  addSurveyLines(ctx, 3);
  if (!ctx.showDecor) return;
  addCornerTicks(ctx);
  addWireTrace(ctx, width * 0.86, height * 0.86, Math.min(width, height) * 0.08);
};
const shearBlock = (ctx) => {
  const { width, height, palette } = ctx;
  const left = width * 0.14;
  const right = width * 0.86;
  const top = height * 0.2;
  const bottom = height * 0.8;
  const cutTop = width * 0.56;
  const cutBottom = width * 0.44;
  addGround(ctx, palette.tone1);
  addMass(ctx, [left, top, cutTop, top, cutBottom, bottom, left, bottom], palette.tone3, {
    enterDX: -width * 0.08,
    enterDY: -height * 0.03,
    edgeWidth: 2,
  });
  addMass(
    ctx,
    [
      cutTop + width * 0.03,
      top + height * 0.04,
      right,
      top + height * 0.04,
      right,
      bottom + height * 0.04,
      cutBottom + width * 0.03,
      bottom + height * 0.04,
    ],
    palette.tone4,
    {
      delay: 0.1,
      enterDX: width * 0.08,
      enterDY: height * 0.03,
      edgeWidth: 2,
    }
  );
  addSurveyLines(ctx, 2);
  if (!ctx.showDecor) return;
  ctx.add(
    drawPolygonOutline(
      ctx.pixi,
      rectPolygon(width * 0.1, height * 0.16, width * 0.8, height * 0.68),
      palette.paper,
      1.2,
      0.35
    ),
    { delay: 0.28, span: 0.55 }
  );
};
const TEMPERA_MONOLITH_COMPOSITIONS = {
  'apex-mass': apexMass,
  ziggurat: ziggurat,
  'slab-wall': slabWall,
  cantilever: cantilever,
  'pylon-pair': pylonPair,
  'bunker-slit': bunkerSlit,
  'plinth-stack': plinthStack,
  'buttress-run': buttressRun,
  'void-core': voidCore,
  'shear-block': shearBlock,
};
export { TEMPERA_MONOLITH_COMPOSITIONS };
