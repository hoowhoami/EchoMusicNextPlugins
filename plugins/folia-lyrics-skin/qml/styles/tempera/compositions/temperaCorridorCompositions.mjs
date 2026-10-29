// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { flatMap } from '../compat.mjs';
import { circlePolygon } from '../temperaHatch.mjs';
import { roundedRectPolygon, rotatePolygon } from '../temperaCurves.mjs';
import { drawLines, drawPolygonFill, drawPolygonOutline, drawRings } from '../temperaShapes.mjs';
import {
  acrossPoint,
  addCutField,
  addHoleLip,
  axisRect,
  channelAxis,
  flowPoint,
  flowSpan,
} from './temperaCutout.mjs';
const channel = (ctx, offset, width) => {
  const centre = acrossPoint(ctx, offset);
  return axisRect(centre.x, centre.y, flowSpan(ctx), width, channelAxis(ctx));
};
const addRails = (ctx, offset, width, alpha = 0.55) => {
  const angle = channelAxis(ctx);
  const half = flowSpan(ctx) / 2;
  [-1, 1].forEach((side, index) => {
    const start = flowPoint(ctx, -half, offset + side * width);
    const end = flowPoint(ctx, half, offset + side * width);
    ctx.add(
      drawLines(
        ctx.pixi,
        [{ x1: start.x, y1: start.y, x2: end.x, y2: end.y }],
        ctx.palette.tone4,
        1.4,
        alpha
      ),
      {
        delay: 0.18 + index * 0.03,
        span: 0.5,
        enterDX: Math.cos(angle) * ctx.width * 0.08,
        enterDY: Math.sin(angle) * ctx.height * 0.08,
      }
    );
  });
};
const flowChannel = (ctx) => {
  const { width, palette } = ctx;
  const unit = Math.min(width, ctx.height);
  const slot = channel(ctx, width * 0.26, unit * 0.3);
  addCutField(ctx, palette.tone3, [slot]);
  addHoleLip(ctx, slot, 2.6, 0.85, 0.08);
  addRails(ctx, width * 0.26, unit * 0.19);
};
const twinChannel = (ctx) => {
  const { width, palette } = ctx;
  const unit = Math.min(width, ctx.height);
  const slots = [channel(ctx, -width * 0.34, unit * 0.16), channel(ctx, width * 0.34, unit * 0.16)];
  addCutField(ctx, palette.tone4, slots);
  slots.forEach((slot, index) => addHoleLip(ctx, slot, 2.4, 0.8, 0.1 + index * 0.04));
};
const reedRun = (ctx) => {
  const { width, palette } = ctx;
  const unit = Math.min(width, ctx.height);
  const slots = [];
  [-1, 1].forEach((side) => {
    for (let index = 0; index < 4; index += 1) {
      slots.push(channel(ctx, side * width * (0.22 + index * 0.08), unit * 0.035));
    }
  });
  addCutField(ctx, palette.tone2, slots, { alpha: 0.9 });
  addRails(ctx, 0, width * 0.17, 0.4);
};
const taperChannel = (ctx) => {
  const { width, palette } = ctx;
  const unit = Math.min(width, ctx.height);
  const half = flowSpan(ctx) / 2;
  const wide = unit * 0.24;
  const narrow = unit * 0.06;
  const offset = width * 0.24;
  const corners = [
    flowPoint(ctx, -half, offset - wide),
    flowPoint(ctx, -half, offset + wide),
    flowPoint(ctx, half, offset + narrow),
    flowPoint(ctx, half, offset - narrow),
  ];
  const slot = flatMap(corners, (point) => [point.x, point.y]);
  addCutField(ctx, palette.tone3, [slot]);
  addHoleLip(ctx, slot, 2.6, 0.85, 0.08);
};
const chainPorts = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const offset = width * 0.28;
  const spacing = height * 0.26;
  const ports = [-1.5, -0.5, 0.5, 1.5].map((step) => flowPoint(ctx, step * spacing, offset));
  addCutField(
    ctx,
    palette.tone4,
    ports.map((port) => circlePolygon(port.x, port.y, unit * 0.11, 40))
  );
  ctx.add(
    drawRings(
      ctx.pixi,
      ports.map((port) => ({ x: port.x, y: port.y, radius: unit * 0.11 })),
      palette.ink,
      2.4,
      0.85
    ),
    { delay: 0.1, span: 0.55 }
  );
  const head = flowPoint(ctx, -spacing * 2.4, offset);
  const tail = flowPoint(ctx, spacing * 2.4, offset);
  ctx.add(
    drawLines(
      ctx.pixi,
      [{ x1: head.x, y1: head.y, x2: tail.x, y2: tail.y }],
      palette.tone2,
      1.6,
      0.6
    ),
    { delay: 0.18, span: 0.5 }
  );
};
const dashChannel = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const offset = width * 0.24;
  const step = height * 0.32;
  const angle = channelAxis(ctx);
  const slots = [-1.5, -0.5, 0.5, 1.5].map((index) => {
    const centre = flowPoint(ctx, index * step, offset);
    return axisRect(centre.x, centre.y, step * 0.72, unit * 0.22, angle);
  });
  addCutField(ctx, palette.tone3, slots);
  slots.forEach((slot, index) => addHoleLip(ctx, slot, 2.2, 0.8, 0.08 + index * 0.03));
};
const windowRun = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const offset = width * 0.27;
  const step = height * 0.36;
  const angle = channelAxis(ctx);
  const slots = [-1.5, -0.5, 0.5, 1.5].map((index) => {
    const centre = flowPoint(ctx, index * step, offset);
    const size = unit * 0.2;
    return rotatePolygon(
      roundedRectPolygon(
        centre.x - size,
        centre.y - size * 0.62,
        size * 2,
        size * 1.24,
        size * 0.3
      ),
      centre.x,
      centre.y,
      angle + Math.PI / 2
    );
  });
  addCutField(ctx, palette.tone4, slots);
  slots.forEach((slot, index) => addHoleLip(ctx, slot, 2.4, 0.85, 0.08 + index * 0.03));
};
const bridgeSpan = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const slot = channel(ctx, 0, unit * 0.62);
  addCutField(ctx, palette.tone4, [slot]);
  addHoleLip(ctx, slot, 2.6, 0.8, 0.08);
  const band = axisRect(
    width / 2,
    height / 2,
    flowSpan(ctx),
    height * 0.46,
    channelAxis(ctx) + Math.PI / 2
  );
  ctx.add(drawPolygonFill(ctx.pixi, band, palette.tone3, 0.95, ctx.gradient), {
    delay: 0.12,
    span: 0.6,
    enterDX: -width * 0.16,
  });
  ctx.add(drawPolygonOutline(ctx.pixi, band, palette.ink, 2, 0.7), {
    delay: 0.2,
    span: 0.5,
    enterDX: width * 0.1,
  });
};
const braidChannel = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const angle = channelAxis(ctx);
  const pitch = height * 0.42;
  const slots = [];
  [-1, 1].forEach((side) => {
    for (let index = -1; index <= 1; index += 1) {
      const centre = flowPoint(ctx, index * pitch + side * pitch * 0.5, side * width * 0.32);
      slots.push(axisRect(centre.x, centre.y, pitch * 0.78, unit * 0.16, angle));
    }
  });
  addCutField(ctx, palette.tone3, slots);
  slots.forEach((slot, index) => addHoleLip(ctx, slot, 2.2, 0.8, 0.08 + index * 0.025));
};
const portLadder = (ctx) => {
  const { width, height, palette } = ctx;
  const unit = Math.min(width, height);
  const offset = width * 0.3;
  const slot = channel(ctx, offset, unit * 0.14);
  addCutField(ctx, palette.tone2, [slot]);
  addHoleLip(ctx, slot, 2.2, 0.8, 0.08);
  const rungs = Array.from({ length: 9 }, (_, index) => {
    const distance = (index - 4) * height * 0.13;
    const long = index % 3 === 0;
    const inner = flowPoint(ctx, distance, offset - unit * 0.09);
    const outer = flowPoint(ctx, distance, offset - unit * (long ? 0.22 : 0.15));
    return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
  });
  ctx.add(drawLines(ctx.pixi, rungs, palette.tone4, 2, 0.7), { delay: 0.14, span: 0.6 });
};
const TEMPERA_CORRIDOR_COMPOSITIONS = {
  'flow-channel': flowChannel,
  'twin-channel': twinChannel,
  'reed-run': reedRun,
  'taper-channel': taperChannel,
  'chain-ports': chainPorts,
  'dash-channel': dashChannel,
  'window-run': windowRun,
  'bridge-span': bridgeSpan,
  'braid-channel': braidChannel,
  'port-ladder': portLadder,
};
export { TEMPERA_CORRIDOR_COMPOSITIONS };
