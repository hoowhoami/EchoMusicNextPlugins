// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { rectPolygon } from '../temperaHatch.mjs';
import { rotatePolygon } from '../temperaCurves.mjs';
import { drawPolygonFillWithHoles, drawPolygonOutline } from '../temperaShapes.mjs';
const fieldPolygon = (ctx) =>
  rectPolygon(-ctx.bleed, -ctx.bleed, ctx.width + ctx.bleed * 2, ctx.height + ctx.bleed * 2);
const addCutField = (ctx, color, holes, options = {}) => {
  var _a, _b, _c;
  ctx.add(
    drawPolygonFillWithHoles(
      ctx.pixi,
      fieldPolygon(ctx),
      holes,
      color,
      (_a = options.alpha) != null ? _a : 0.94,
      ctx.gradient
    ),
    { delay: (_b = options.delay) != null ? _b : 0, span: (_c = options.span) != null ? _c : 0.5 }
  );
};
const addHoleLip = (ctx, hole, width = 2.4, alpha = 0.85, delay = 0.1) => {
  ctx.add(drawPolygonOutline(ctx.pixi, hole, ctx.palette.ink, width, alpha), { delay, span: 0.5 });
};
const axisRect = (cx, cy, length, width, angle) =>
  rotatePolygon(rectPolygon(cx - length / 2, cy - width / 2, length, width), cx, cy, angle);
const channelAxis = (ctx) => {
  const axis = ((Math.sin(ctx.flowAngle) >= 0 ? 1 : -1) * Math.PI) / 2;
  return axis + (ctx.flowAngle - axis) * 0.5;
};
const acrossFlow = (angle) => {
  const across = angle + Math.PI / 2;
  const sign = Math.cos(across) >= 0 ? 1 : -1;
  return { x: Math.cos(across) * sign, y: Math.sin(across) * sign };
};
const acrossPoint = (ctx, offset) => {
  const across = acrossFlow(channelAxis(ctx));
  return { x: ctx.width / 2 + across.x * offset, y: ctx.height / 2 + across.y * offset };
};
const flowPoint = (ctx, distance, offset) => {
  const base = acrossPoint(ctx, offset);
  const angle = channelAxis(ctx);
  return {
    x: base.x + Math.cos(angle) * distance,
    y: base.y + Math.sin(angle) * distance,
  };
};
const flowSpan = (ctx) => Math.hypot(ctx.width, ctx.height) * 1.6;
export {
  acrossFlow,
  acrossPoint,
  addCutField,
  addHoleLip,
  axisRect,
  channelAxis,
  fieldPolygon,
  flowPoint,
  flowSpan,
};
