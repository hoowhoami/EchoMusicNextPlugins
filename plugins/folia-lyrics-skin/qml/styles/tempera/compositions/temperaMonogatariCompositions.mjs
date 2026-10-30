// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { temperaHash01 } from '../temperaRandom.mjs';
import { buildCrossRow, buildHatchSpec, rectPolygon } from '../temperaHatch.mjs';
import { drawCrossMarks, drawHatchFill, drawLines, drawPolygonFill } from '../temperaShapes.mjs';
const addField = (ctx, tone) => {
  const { width, height, bleed } = ctx;
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, -bleed, width + bleed * 2, height + bleed * 2),
      tone,
      1,
      ctx.gradient
    ),
    { span: 0.45 }
  );
};
const pickField = (ctx) =>
  temperaHash01(ctx.seed, 167, 173) > 0.5 ? ctx.palette.tone4 : ctx.palette.tone1;
const monogatariCard = (ctx) => {
  addField(ctx, pickField(ctx));
  if (!ctx.showDecor) return;
  ctx.add(
    drawLines(
      ctx.pixi,
      [{ x1: ctx.width * 0.12, y1: ctx.height * 0.9, x2: ctx.width * 0.88, y2: ctx.height * 0.9 }],
      ctx.palette.paper,
      1.2,
      0.45
    ),
    { delay: 0.22, span: 0.6, enterDX: ctx.width * 0.15 }
  );
};
const monogatariRule = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addField(ctx, pickField(ctx));
  const y = height * (0.62 + temperaHash01(ctx.seed, 179, 181) * 0.08);
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-bleed, y, width + bleed * 2, height * 0.012),
      palette.paper,
      0.85,
      ctx.gradient
    ),
    { delay: 0.12, span: 0.55, enterDX: -width * 0.3 }
  );
  if (!ctx.showDecor) return;
  ctx.add(
    drawLines(
      ctx.pixi,
      [{ x1: -bleed, y1: y + height * 0.05, x2: width + bleed, y2: y + height * 0.05 }],
      palette.paper,
      1,
      0.35
    ),
    { delay: 0.2, span: 0.6, enterDX: width * 0.2 }
  );
};
const monogatariEdge = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const field = pickField(ctx);
  addField(ctx, field);
  const band = width * (0.1 + temperaHash01(ctx.seed, 191, 193) * 0.05);
  const fromLeft = temperaHash01(ctx.seed, 197, 199) > 0.5;
  const spine = rectPolygon(
    fromLeft ? -bleed : width - band,
    -bleed,
    band + bleed,
    height + bleed * 2
  );
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      spine,
      field === palette.tone4 ? palette.tone1 : palette.tone4,
      0.95,
      ctx.gradient
    ),
    { delay: 0.1, span: 0.55, enterDX: (fromLeft ? -1 : 1) * width * 0.2 }
  );
  if (!ctx.showDecor) return;
  ctx.add(drawHatchFill(ctx.pixi, spine, buildHatchSpec(ctx.seed, 211), palette.paper, 0.2), {
    delay: 0.18,
    span: 0.6,
    grow: true,
  });
};
const monogatariStack = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  addField(ctx, pickField(ctx));
  const column = width * 0.5;
  ctx.add(
    drawLines(
      ctx.pixi,
      [
        { x1: (width - column) / 2, y1: -bleed, x2: (width - column) / 2, y2: height + bleed },
        { x1: (width + column) / 2, y1: -bleed, x2: (width + column) / 2, y2: height + bleed },
      ],
      palette.paper,
      1.1,
      0.4
    ),
    { delay: 0.14, span: 0.6, enterDY: height * 0.12 }
  );
};
const monogatariFlash = (ctx) => {
  const { width, height, palette } = ctx;
  addField(ctx, palette.tone4);
  if (!ctx.showDecor) return;
  ctx.add(
    drawCrossMarks(
      ctx.pixi,
      buildCrossRow(ctx.seed, 223, width * 0.1, height * 0.18, 4, width * 0.05, 10),
      palette.paper,
      2.4,
      0.6
    ),
    { delay: 0.2, span: 0.5, enterDX: -width * 0.1 }
  );
};
const TEMPERA_MONOGATARI_COMPOSITIONS = {
  'monogatari-card': monogatariCard,
  'monogatari-rule': monogatariRule,
  'monogatari-edge': monogatariEdge,
  'monogatari-stack': monogatariStack,
  'monogatari-flash': monogatariFlash,
};
export { TEMPERA_MONOGATARI_COMPOSITIONS };
