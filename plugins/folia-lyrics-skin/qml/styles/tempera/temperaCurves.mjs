// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { temperaHash01 } from './temperaRandom.mjs';
const TAU = Math.PI * 2;
const ellipsePolygon = (cx, cy, rx, ry, segments = 32) => {
  const count = Math.max(8, Math.round(segments));
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU;
    points.push(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
  }
  return points;
};
const roundedRectPolygon = (x, y, width, height, radius, cornerSegments = 6) => {
  const limit = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  const steps = Math.max(1, Math.round(cornerSegments));
  const corners = [
    [x + width - limit, y + limit, -Math.PI / 2],
    [x + width - limit, y + height - limit, 0],
    [x + limit, y + height - limit, Math.PI / 2],
    [x + limit, y + limit, Math.PI],
  ];
  const points = [];
  corners.forEach(([ccx, ccy, start]) => {
    for (let step = 0; step <= steps; step += 1) {
      const angle = start + (step / steps) * (Math.PI / 2);
      points.push(ccx + Math.cos(angle) * limit, ccy + Math.sin(angle) * limit);
    }
  });
  return points;
};
const rotatePolygon = (polygon, cx, cy, angle) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const points = [];
  for (let index = 0; index < polygon.length; index += 2) {
    const dx = polygon[index] - cx;
    const dy = polygon[index + 1] - cy;
    points.push(cx + dx * cos - dy * sin, cy + dx * sin + dy * cos);
  }
  return points;
};
const lobedPolygon = (cx, cy, rx, ry, lobes, amplitude, segments = 96) => {
  const count = Math.max(24, Math.round(segments));
  const petals = Math.max(1, Math.round(lobes));
  const swell = Math.max(0, amplitude);
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * TAU;
    const scale = (1 + Math.cos(angle * petals) * swell) / (1 + swell);
    points.push(cx + Math.cos(angle) * rx * scale, cy + Math.sin(angle) * ry * scale);
  }
  return points;
};
const scallopBandPolygon = (x0, x1, flatY, baseY, bumps, segmentsPerBump = 10) => {
  const count = Math.max(1, Math.round(bumps));
  const steps = Math.max(3, Math.round(segmentsPerBump));
  const span = (x1 - x0) / count;
  const radius = Math.abs(span) / 2;
  const direction = baseY >= flatY ? 1 : -1;
  const points = [x0, flatY, x1, flatY];
  for (let bump = count - 1; bump >= 0; bump -= 1) {
    const cx = x0 + span * (bump + 0.5);
    for (let step = 0; step <= steps; step += 1) {
      const angle = (step / steps) * Math.PI;
      points.push(cx + Math.cos(angle) * (span / 2), baseY + direction * Math.sin(angle) * radius);
    }
  }
  return points;
};
const heartPolygon = (cx, cy, rx, ry, segments = 64) => {
  const count = Math.max(16, Math.round(segments));
  const raw = [];
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < count; index += 1) {
    const t = (index / count) * TAU;
    const x = Math.sin(t) ** 3 * 16;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push(x, y);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const halfWidth = Math.max(1e-6, (maxX - minX) / 2);
  const halfHeight = Math.max(1e-6, (maxY - minY) / 2);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const points = [];
  for (let index = 0; index < raw.length; index += 2) {
    points.push(
      cx + ((raw[index] - midX) / halfWidth) * rx,
      cy + ((raw[index + 1] - midY) / halfHeight) * ry
    );
  }
  return points;
};
const annularSectorPolygon = (
  cx,
  cy,
  innerRadius,
  outerRadius,
  startAngle,
  endAngle,
  segments = 10
) => {
  const steps = Math.max(2, Math.round(segments));
  const points = [];
  for (let step = 0; step <= steps; step += 1) {
    const angle = startAngle + ((endAngle - startAngle) * step) / steps;
    points.push(cx + Math.cos(angle) * outerRadius, cy + Math.sin(angle) * outerRadius);
  }
  for (let step = steps; step >= 0; step -= 1) {
    const angle = startAngle + ((endAngle - startAngle) * step) / steps;
    points.push(cx + Math.cos(angle) * innerRadius, cy + Math.sin(angle) * innerRadius);
  }
  return points;
};
const starPolygon = (cx, cy, outerRadius, innerRadius, points, rotation = 0) => {
  const tips = Math.max(3, Math.round(points));
  const polygon = [];
  for (let index = 0; index < tips * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation - Math.PI / 2 + (index / (tips * 2)) * TAU;
    polygon.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  return polygon;
};
const arcRibbonPolygon = (x0, x1, y, thickness, sag, steps = 28) => {
  const count = Math.max(4, Math.round(steps));
  const half = thickness / 2;
  const top = [];
  const bottom = [];
  for (let index = 0; index <= count; index += 1) {
    const progress = index / count;
    const x = x0 + (x1 - x0) * progress;
    const centre = y + Math.sin(progress * Math.PI) * sag;
    top.push(x, centre - half);
    bottom.push(x, centre + half);
  }
  const points = [...top];
  for (let index = bottom.length - 2; index >= 0; index -= 2) {
    points.push(bottom[index], bottom[index + 1]);
  }
  return points;
};
const buildDiscField = (seed, salt, width, height, count, radius) => {
  const total = Math.max(0, Math.round(count));
  if (total === 0 || width <= 0 || height <= 0) return [];
  const columns = Math.max(1, Math.round(Math.sqrt(total * (width / height))));
  const rows = Math.max(1, Math.ceil(total / columns));
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const discs = [];
  for (let index = 0; index < total; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    discs.push({
      x: cellWidth * (column + 0.15 + temperaHash01(seed, index, salt) * 0.7),
      y: cellHeight * (row + 0.15 + temperaHash01(seed, index, salt + 3) * 0.7),
      radius: radius * (0.55 + temperaHash01(seed, index, salt + 7) * 0.75),
    });
  }
  return discs;
};
export {
  annularSectorPolygon,
  arcRibbonPolygon,
  buildDiscField,
  ellipsePolygon,
  heartPolygon,
  lobedPolygon,
  rotatePolygon,
  roundedRectPolygon,
  scallopBandPolygon,
  starPolygon,
};
