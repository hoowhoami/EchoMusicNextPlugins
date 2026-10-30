// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { temperaHash01 } from '../temperaRandom.mjs';
import { buildHatchSpec, circlePolygon, rectPolygon } from '../temperaHatch.mjs';
import { drawHatchFill, drawLines, drawPolygonFill, drawRings } from '../temperaShapes.mjs';
import { annularSectorPolygon } from '../temperaCurves.mjs';
import { addCutField, addHoleLip } from './temperaCutout.mjs';
const irisHole = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const cx = width * 0.68;
  const cy = height * 0.42;
  const radius = unit * 0.3;
  const hole = circlePolygon(cx, cy, radius, 56);
  addCutField(ctx, palette.tone3, [hole]);
  addHoleLip(ctx, hole, 3, 0.9, 0.08);
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(-ctx.bleed, cy - unit * 0.035, cx - radius * 0.7 + ctx.bleed, unit * 0.07),
      palette.tone4,
      0.9,
      ctx.gradient
    ),
    { delay: 0.14, span: 0.55, enterDX: -width * 0.12 }
  );
  if (!ctx.showDecor) return;
  ctx.add(drawRings(ctx.pixi, [{ x: cx, y: cy, radius: radius * 1.14 }], palette.tone4, 1.4, 0.6), {
    delay: 0.2,
    span: 0.5,
    drift: true,
  });
};
const slotRail = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const top = height * 0.22;
  const slot = rectPolygon(-bleed, top, width + bleed * 2, height * 0.16);
  addCutField(ctx, palette.tone4, [slot]);
  addHoleLip(ctx, slot, 2.4, 0.8, 0.1);
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(width * 0.66, top - height * 0.06, width * 0.12, height * 0.28),
      palette.tone2,
      0.95,
      ctx.gradient
    ),
    { delay: 0.16, span: 0.55, enterDY: -height * 0.1 }
  );
  ctx.add(
    drawLines(
      ctx.pixi,
      [{ x1: -bleed, y1: top + height * 0.22, x2: width + bleed, y2: top + height * 0.22 }],
      palette.tone2,
      1.4,
      0.55
    ),
    { delay: 0.22, span: 0.5, enterDX: width * 0.14 }
  );
};
const punchRow = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const radius = unit * 0.028;
  const holes = [];
  for (let index = 0; index < 9; index += 1) {
    const x = width * (0.08 + index * 0.105);
    holes.push(circlePolygon(x, height * 0.14, radius, 20));
    holes.push(circlePolygon(x, height * 0.86, radius, 20));
  }
  addCutField(ctx, palette.tone3, holes);
  [0.22, 0.78].forEach((y, index) => {
    ctx.add(
      drawLines(
        ctx.pixi,
        [{ x1: 0, y1: height * y, x2: width, y2: height * y }],
        palette.tone4,
        1.6,
        0.6
      ),
      { delay: 0.12 + index * 0.04, span: 0.5, enterDX: (index === 0 ? 1 : -1) * width * 0.12 }
    );
  });
};
const filmGate = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const gate = rectPolygon(width * 0.2, height * 0.1, width * 0.6, height * 0.52);
  const holes = [gate];
  for (let index = 0; index < 4; index += 1) {
    const y = height * (0.14 + index * 0.13);
    holes.push(rectPolygon(width * 0.08, y, width * 0.05, height * 0.06));
    holes.push(rectPolygon(width * 0.87, y, width * 0.05, height * 0.06));
  }
  addCutField(ctx, palette.tone4, holes);
  addHoleLip(ctx, gate, 3, 0.9, 0.08);
  ctx.add(
    drawHatchFill(
      ctx.pixi,
      rectPolygon(width * 0.2, height * 0.68, width * 0.6, height * 0.1),
      buildHatchSpec(ctx.seed, 131, 1.2),
      palette.tone2,
      0.5
    ),
    { delay: 0.18, span: 0.6, grow: true }
  );
};
const crossVent = (ctx) => {
  const { width, height, palette } = ctx;
  const cx = width * 0.5;
  const cy = height * 0.38;
  const arm = Math.min(width, height) * 0.3;
  const bar = Math.min(width, height) * 0.1;
  const cross = [
    cx - bar,
    cy - arm,
    cx + bar,
    cy - arm,
    cx + bar,
    cy - bar,
    cx + arm,
    cy - bar,
    cx + arm,
    cy + bar,
    cx + bar,
    cy + bar,
    cx + bar,
    cy + arm,
    cx - bar,
    cy + arm,
    cx - bar,
    cy + bar,
    cx - arm,
    cy + bar,
    cx - arm,
    cy - bar,
    cx - bar,
    cy - bar,
  ];
  addCutField(ctx, palette.tone3, [cross]);
  addHoleLip(ctx, cross, 2.6, 0.85, 0.1);
  if (!ctx.showDecor) return;
  ctx.add(drawRings(ctx.pixi, [{ x: cx, y: cy, radius: arm * 1.24 }], palette.tone4, 1.2, 0.5), {
    delay: 0.2,
    span: 0.5,
  });
};
const louvre = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const holes = [];
  for (let index = 0; index < 6; index += 1) {
    const y = height * (0.08 + index * 0.1);
    const lean = height * 0.03;
    const thickness = height * (0.05 - index * 4e-3);
    holes.push([
      -bleed,
      y,
      width + bleed,
      y - lean,
      width + bleed,
      y - lean + thickness,
      -bleed,
      y + thickness,
    ]);
  }
  addCutField(ctx, palette.tone4, holes);
  ctx.add(
    drawPolygonFill(
      ctx.pixi,
      rectPolygon(width * 0.1, height * 0.72, width * 0.08, height * 0.2),
      palette.tone2,
      0.9,
      ctx.gradient
    ),
    { delay: 0.2, span: 0.55, enterDY: height * 0.1 }
  );
};
const ringEye = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const cx = width * 0.5;
  const cy = height * 0.5;
  const inner = unit * 0.31;
  const outer = unit * 0.44;
  const segments = 12;
  const gap = 0.03;
  const holes = Array.from({ length: segments }, (_, index) => {
    const start = (index / segments) * Math.PI * 2 + gap;
    const end = ((index + 1) / segments) * Math.PI * 2 - gap;
    return annularSectorPolygon(cx, cy, inner, outer, start, end, 8);
  });
  addCutField(ctx, palette.tone3, holes);
  ctx.add(
    drawRings(
      ctx.pixi,
      [
        { x: cx, y: cy, radius: inner },
        { x: cx, y: cy, radius: outer },
      ],
      palette.ink,
      2.4,
      0.85
    ),
    { delay: 0.12, span: 0.5 }
  );
};
const notchStack = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const holes = [];
  for (let index = 0; index < 4; index += 1) {
    const size = unit * (0.26 - index * 0.05);
    holes.push(
      rectPolygon(width * (0.6 + index * 0.06), height * (0.1 + index * 0.19), size, size)
    );
  }
  addCutField(ctx, palette.tone4, holes);
  holes.forEach((hole, index) => addHoleLip(ctx, hole, 2, 0.75, 0.1 + index * 0.04));
};
const wedgeGap = (ctx) => {
  const { width, height, palette, bleed } = ctx;
  const apexX = width * (0.4 + temperaHash01(ctx.seed, 3, 137) * 0.2);
  const wedge = [width * 0.1, -bleed, width * 0.92, -bleed, apexX, height * 0.56];
  addCutField(ctx, palette.tone3, [wedge]);
  addHoleLip(ctx, wedge, 3, 0.9, 0.08);
  ctx.add(
    drawLines(
      ctx.pixi,
      [{ x1: apexX, y1: height * 0.58, x2: apexX, y2: height + bleed }],
      palette.tone4,
      1.6,
      0.6
    ),
    { delay: 0.18, span: 0.5, enterDY: height * 0.12 }
  );
};
const dotSieve = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const holes = [];
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const density = 1 - column / 4.5;
      if (temperaHash01(ctx.seed, row * 9 + column, 139) > density) continue;
      const x = width * (0.06 + column * 0.105) + (row % 2 === 0 ? 0 : width * 0.05);
      holes.push(
        circlePolygon(x, height * (0.1 + row * 0.16), unit * 0.045 * density + unit * 0.012, 18)
      );
    }
  }
  addCutField(ctx, palette.tone2, holes, { alpha: 0.92 });
};
const TEMPERA_APERTURE_COMPOSITIONS = {
  'iris-hole': irisHole,
  'slot-rail': slotRail,
  'punch-row': punchRow,
  'film-gate': filmGate,
  'cross-vent': crossVent,
  'louvre-slats': louvre,
  'ring-eye': ringEye,
  'notch-stack': notchStack,
  'wedge-gap': wedgeGap,
  'dot-sieve': dotSieve,
};
export { TEMPERA_APERTURE_COMPOSITIONS };
