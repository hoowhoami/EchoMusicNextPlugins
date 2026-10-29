// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const tracePolygon = (target, points) => (
    points.forEach(([x, y], index) => {
      index === 0 ? target.moveTo(x, y) : target.lineTo(x, y);
    }),
    target.lineTo(points[0][0], points[0][1])
  ),
  fillPolygon = (target, points, color, alpha) =>
    tracePolygon(target, points).fill({ color, alpha }),
  strokePolygon = (target, points, color, alpha, width = 1.5) =>
    tracePolygon(target, points).stroke({ color, alpha, width }),
  drawLeaf = (target, x, y, length, width, angle, color, fillAlpha) => {
    const dx = Math.cos(angle),
      dy = Math.sin(angle),
      nx = -dy,
      ny = dx,
      tipX = x + dx * length,
      tipY = y + dy * length;
    (target
      .moveTo(x, y)
      .quadraticCurveTo(
        x + dx * length * 0.45 + nx * width,
        y + dy * length * 0.45 + ny * width,
        tipX,
        tipY
      )
      .quadraticCurveTo(
        x + dx * length * 0.45 - nx * width,
        y + dy * length * 0.45 - ny * width,
        x,
        y
      )
      .fill({ color, alpha: fillAlpha }),
      target
        .moveTo(x, y)
        .quadraticCurveTo(
          x + dx * length * 0.45 + nx * width,
          y + dy * length * 0.45 + ny * width,
          tipX,
          tipY
        )
        .quadraticCurveTo(
          x + dx * length * 0.45 - nx * width,
          y + dy * length * 0.45 - ny * width,
          x,
          y
        )
        .stroke({ color, alpha: Math.min(0.8, fillAlpha * 3.2), width: 1.5 }),
      target.moveTo(x, y).lineTo(tipX, tipY).stroke({ color, alpha: 0.32, width: 1 }));
  },
  drawPetal = (target, cx, cy, length, width, angle, color, fillAlpha) =>
    drawLeaf(target, cx, cy, length, width, angle, color, fillAlpha);
export { drawLeaf, drawPetal, fillPolygon, strokePolygon };
