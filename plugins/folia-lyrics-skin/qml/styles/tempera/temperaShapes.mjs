// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { mixColors } from '../cadenza/color.mjs';
import { buildHatchLines } from './temperaHatch.mjs';
const toPixiColor = (pixi, color) => pixi.Color.shared.setValue(color).toNumber();
const boundsCenter = (polygon) => {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < polygon.length; index += 2) {
    minX = Math.min(minX, polygon[index]);
    maxX = Math.max(maxX, polygon[index]);
    minY = Math.min(minY, polygon[index + 1]);
    maxY = Math.max(maxY, polygon[index + 1]);
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
};
const gradientFills = /* @__PURE__ */ new WeakMap();
const createGradientFill = (pixi, gradient, color) => {
  const half = 0.5;
  const dx = Math.cos(gradient.angle) * half;
  const dy = Math.sin(gradient.angle) * half;
  const stops = gradient.colors.map((stop, index) => ({
    offset: gradient.colors.length > 1 ? index / (gradient.colors.length - 1) : 0,
    color: mixColors(stop, color, 0.5),
  }));
  return new pixi.FillGradient({
    type: 'linear',
    start: { x: half - dx, y: half - dy },
    end: { x: half + dx, y: half + dy },
    colorStops: stops,
    textureSpace: 'local',
  });
};
const buildGradientFill = (pixi, gradient, color) => {
  let byColor = gradientFills.get(gradient);
  if (!byColor) {
    byColor = /* @__PURE__ */ new Map();
    gradientFills.set(gradient, byColor);
  }
  let fill = byColor.get(color);
  if (!fill) {
    fill = createGradientFill(pixi, gradient, color);
    byColor.set(color, fill);
  }
  return fill;
};
const destroyTemperaGradientFills = (pixi, root) => {
  const fills = /* @__PURE__ */ new Set();
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.children.length > 0) stack.push(...node.children);
    if (!(node instanceof pixi.Graphics)) continue;
    for (const instruction of node.context.instructions) {
      if (instruction.action !== 'fill' && instruction.action !== 'stroke') continue;
      const fill = instruction.data.style.fill;
      if (fill instanceof pixi.FillGradient) fills.add(fill);
    }
  }
  fills.forEach((fill) => fill.destroy());
};
const drawPolygonFill = (pixi, polygon, color, alpha = 1, gradient) => {
  const node = new pixi.Graphics().poly(polygon);
  return gradient && gradient.colors.length > 1
    ? node.fill({ fill: buildGradientFill(pixi, gradient, color), alpha })
    : node.fill({ color: toPixiColor(pixi, color), alpha });
};
const drawPolygonFillWithHoles = (pixi, polygon, holes, color, alpha = 1, gradient) => {
  const node = new pixi.Graphics().poly(polygon);
  if (gradient && gradient.colors.length > 1) {
    node.fill({ fill: buildGradientFill(pixi, gradient, color), alpha });
  } else {
    node.fill({ color: toPixiColor(pixi, color), alpha });
  }
  holes.forEach((hole) => {
    if (hole.length >= 6) node.poly(hole).cut();
  });
  return node;
};
const drawPolygonOutline = (pixi, polygon, color, width, alpha = 1) =>
  new pixi.Graphics().poly(polygon).stroke({ color: toPixiColor(pixi, color), width, alpha });
const drawHatchFill = (pixi, polygon, spec, color, alpha = 1) => {
  const node = new pixi.Graphics();
  const lines = buildHatchLines(polygon, spec);
  lines.forEach((line) => {
    node.moveTo(line.x1, line.y1).lineTo(line.x2, line.y2);
  });
  if (lines.length > 0) {
    node.stroke({ color: toPixiColor(pixi, color), width: spec.width, alpha });
  }
  const center = boundsCenter(polygon);
  node.pivot.set(center.x, center.y);
  node.position.set(center.x, center.y);
  return node;
};
const discsCenter = (discs) => {
  if (discs.length === 0) return { x: 0, y: 0 };
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  discs.forEach((disc) => {
    minX = Math.min(minX, disc.x - disc.radius);
    maxX = Math.max(maxX, disc.x + disc.radius);
    minY = Math.min(minY, disc.y - disc.radius);
    maxY = Math.max(maxY, disc.y + disc.radius);
  });
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
};
const buildDiscNode = (pixi, discs) => {
  const node = new pixi.Graphics();
  discs.forEach((disc) => {
    node.circle(disc.x, disc.y, Math.max(0.5, disc.radius));
  });
  return node;
};
const pivotOnSelf = (node, center) => {
  node.pivot.set(center.x, center.y);
  node.position.set(center.x, center.y);
  return node;
};
const drawDiscs = (pixi, discs, color, alpha = 1, gradient) => {
  const node = buildDiscNode(pixi, discs);
  if (discs.length > 0) {
    node.fill(
      gradient && gradient.colors.length > 1
        ? { fill: buildGradientFill(pixi, gradient, color), alpha }
        : { color: toPixiColor(pixi, color), alpha }
    );
  }
  return pivotOnSelf(node, discsCenter(discs));
};
const drawRings = (pixi, discs, color, width, alpha = 1) => {
  const node = buildDiscNode(pixi, discs);
  if (discs.length > 0) {
    node.stroke({ color: toPixiColor(pixi, color), width, alpha });
  }
  return pivotOnSelf(node, discsCenter(discs));
};
const drawLines = (pixi, lines, color, width, alpha = 1) => {
  const node = new pixi.Graphics();
  lines.forEach((line) => {
    node.moveTo(line.x1, line.y1).lineTo(line.x2, line.y2);
  });
  if (lines.length > 0) {
    node.stroke({ color: toPixiColor(pixi, color), width, alpha });
  }
  return node;
};
const drawPolyline = (pixi, points, color, width, alpha = 1) => {
  const node = new pixi.Graphics();
  if (points.length < 4) return node;
  node.moveTo(points[0], points[1]);
  for (let index = 2; index < points.length; index += 2) {
    node.lineTo(points[index], points[index + 1]);
  }
  return node.stroke({ color: toPixiColor(pixi, color), width, alpha });
};
const drawConcentricDiamonds = (pixi, cx, cy, rx, ry, rings, color, alpha = 1) => {
  const node = new pixi.Graphics();
  const stroke = toPixiColor(pixi, color);
  for (let ring = 0; ring < Math.max(1, rings); ring += 1) {
    const shrink = 1 - ring * 0.22;
    node
      .poly([
        cx,
        cy - ry * shrink,
        cx + rx * shrink,
        cy,
        cx,
        cy + ry * shrink,
        cx - rx * shrink,
        cy,
      ])
      .stroke({ color: stroke, width: ring % 2 === 0 ? 3.5 : 1.4, alpha });
  }
  node.pivot.set(cx, cy);
  node.position.set(cx, cy);
  return node;
};
const drawCrossMarks = (pixi, marks, color, width, alpha = 1) => {
  const node = new pixi.Graphics();
  marks.forEach((mark) => {
    const cos = Math.cos(mark.rotation + Math.PI / 4) * mark.size;
    const sin = Math.sin(mark.rotation + Math.PI / 4) * mark.size;
    node.moveTo(mark.x - cos, mark.y - sin).lineTo(mark.x + cos, mark.y + sin);
    node.moveTo(mark.x - sin, mark.y + cos).lineTo(mark.x + sin, mark.y - cos);
  });
  if (marks.length > 0) {
    node.stroke({ color: toPixiColor(pixi, color), width, alpha });
  }
  return node;
};
const drawSquareMarks = (pixi, marks, color, alpha = 1) => {
  const node = new pixi.Graphics();
  marks.forEach((mark) => {
    node.rect(mark.x - mark.size / 2, mark.y - mark.size / 2, mark.size, mark.size);
  });
  if (marks.length > 0) {
    node.fill({ color: toPixiColor(pixi, color), alpha });
  }
  return node;
};
export {
  destroyTemperaGradientFills,
  drawConcentricDiamonds,
  drawCrossMarks,
  drawDiscs,
  drawHatchFill,
  drawLines,
  drawPolygonFill,
  drawPolygonFillWithHoles,
  drawPolygonOutline,
  drawPolyline,
  drawRings,
  drawSquareMarks,
  toPixiColor,
};
