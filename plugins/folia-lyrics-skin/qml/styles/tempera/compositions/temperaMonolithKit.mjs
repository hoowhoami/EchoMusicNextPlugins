// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { buildHatchSpec, buildScribblePath, rectPolygon } from '../temperaHatch.mjs';
import {
  drawHatchFill,
  drawLines,
  drawPolygonFill,
  drawPolygonOutline,
  drawPolyline,
} from '../temperaShapes.mjs';
const addMass = (ctx, polygon, color, options = {}) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      polygon,
      color,
      (_a = options.alpha) != null ? _a : 0.95,
      ctx.gradient
    ),
    {
      delay: (_b = options.delay) != null ? _b : 0.04,
      span: (_c = options.span) != null ? _c : 0.6,
      enterDX: (_d = options.enterDX) != null ? _d : 0,
      enterDY: (_e = options.enterDY) != null ? _e : 0,
    }
  );
  if (options.edge === false) return;
  ctx.add(
    drawPolygonOutline(
      ctx.pixi,
      polygon,
      ctx.palette.ink,
      (_f = options.edgeWidth) != null ? _f : 2.4,
      0.8
    ),
    {
      delay: ((_g = options.delay) != null ? _g : 0.04) + 0.06,
      span: 0.5,
      enterDX: ((_h = options.enterDX) != null ? _h : 0) * 0.6,
      enterDY: ((_i = options.enterDY) != null ? _i : 0) * 0.6,
    }
  );
};
const addGround = (ctx, color, alpha = 0.94) => {
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-ctx.bleed, -ctx.bleed, ctx.width + ctx.bleed * 2, ctx.height + ctx.bleed * 2),
      color,
      alpha,
      ctx.gradient
    ),
    { span: 0.5 }
  );
};
const addFaceRuling = (ctx, face, salt, color = ctx.palette.tone4, alpha = 0.5) => {
  ctx.add(drawHatchFill(ctx.pixi, face, buildHatchSpec(ctx.seed, salt, 0.7), color, alpha), {
    delay: 0.16,
    span: 0.65,
    grow: true,
  });
};
const addSurveyLines = (ctx, count = 3, salt = 211) => {
  const { width, height, bleed } = ctx;
  const lines = Array.from({ length: Math.max(1, count) }, (_, index) => {
    const anchor = height * (0.16 + ((index * 0.31 + (ctx.seed % 7) * 0.04) % 0.7));
    const lean = height * (index % 2 === 0 ? 0.22 : -0.16);
    return {
      x1: -bleed,
      y1: anchor - lean,
      x2: width + bleed,
      y2: anchor + lean,
    };
  });
  ctx.add(drawLines(ctx.pixi, lines, ctx.palette.paper, 1, 0.45), {
    delay: 0.2 + (salt % 3) * 0.02,
    span: 0.7,
    enterDX: width * 0.2,
  });
};
const addCornerTicks = (ctx) => {
  const { width, height, palette } = ctx;
  const inset = Math.min(width, height) * 0.06;
  const arm = Math.min(width, height) * 0.05;
  [
    [1, 1],
    [-1, -1],
  ].forEach(([sx, sy], index) => {
    const x = sx > 0 ? inset : width - inset;
    const y = sy > 0 ? inset : height - inset;
    ctx.add(
      drawLines(
        ctx.pixi,
        [
          { x1: x, y1: y, x2: x + sx * arm, y2: y },
          { x1: x, y1: y, x2: x, y2: y + sy * arm },
        ],
        palette.paper,
        1.6,
        0.6
      ),
      { delay: 0.26 + index * 0.04, span: 0.5 }
    );
  });
};
const addWireTrace = (ctx, cx, cy, radius) => {
  const group = ctx.createGroup(0, cx, cy);
  ctx.add(
    drawPolyline(
      ctx.pixi,
      buildScribblePath(ctx.decor.scribbleSeed, 199, 0, 0, radius, 1),
      ctx.palette.paper,
      1.2,
      0.4
    ),
    {
      delay: 0.3,
      span: 0.6,
      drift: true,
    },
    group
  );
};
export { addCornerTicks, addFaceRuling, addGround, addMass, addSurveyLines, addWireTrace };
