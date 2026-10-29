// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const SONNET_GEO_VARIANT_COUNT = 100,
  resolveSonnetGeoVariant = (seed) => ((Math.trunc(seed) % 100) + 100) % 100,
  resolveSonnetGeoCycle = (seed) => Math.floor(Math.trunc(seed) / 100),
  resolveSonnetGeoSubVariant = (seed, count) =>
    ((resolveSonnetGeoCycle(seed) % count) + count) % count,
  resolveSonnetMoleculeVariant = (seed) => resolveSonnetGeoSubVariant(seed, 3),
  resolveSonnetHudRotationQuarterTurns = (seed) => resolveSonnetGeoSubVariant(seed, 4),
  tracePolygon = (target, points) => {
    target.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1)
      target.lineTo(points[index][0], points[index][1]);
    return target.lineTo(points[0][0], points[0][1]);
  },
  drawFace = (target, points, color, fillAlpha) => {
    tracePolygon(target, points).fill({ color, alpha: fillAlpha });
  },
  drawSonnetSolidCuboid = (target, x, y, width, height, depthX, depthY, color, alpha) => {
    const left = x - width / 2,
      right = x + width / 2,
      top = y - height / 2,
      bottom = y + height / 2,
      front = [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
      ],
      topFace = [
        [left, top],
        [left + depthX, top + depthY],
        [right + depthX, top + depthY],
        [right, top],
      ],
      sideFace = [
        [right, top],
        [right + depthX, top + depthY],
        [right + depthX, bottom + depthY],
        [right, bottom],
      ];
    (drawFace(target, topFace, color, alpha * 0.42),
      drawFace(target, sideFace, color, alpha * 0.68),
      drawFace(target, front, color, alpha * 0.24));
  },
  drawSonnetExtrudedPolygon = (target, front, depthX, depthY, color, alpha) => {
    const back = front.map(([x, y]) => [x + depthX, y + depthY]);
    for (let index = 0; index < front.length; index += 1) {
      const next = (index + 1) % front.length;
      drawFace(
        target,
        [front[index], back[index], back[next], front[next]],
        color,
        alpha * (0.34 + (index % 3) * 0.12)
      );
    }
    drawFace(target, front, color, alpha * 0.22);
  },
  drawSonnetTriangularPrism = (target, x, y, width, height, depthX, depthY, color, alpha) =>
    drawSonnetExtrudedPolygon(
      target,
      [
        [x, y - height / 2],
        [x + width / 2, y + height / 2],
        [x - width / 2, y + height / 2],
      ],
      depthX,
      depthY,
      color,
      alpha
    ),
  drawSonnetHexagonalPrism = (target, x, y, width, height, depthX, depthY, color, alpha) =>
    drawSonnetExtrudedPolygon(
      target,
      [
        [x - width * 0.25, y - height / 2],
        [x + width * 0.25, y - height / 2],
        [x + width / 2, y],
        [x + width * 0.25, y + height / 2],
        [x - width * 0.25, y + height / 2],
        [x - width / 2, y],
      ],
      depthX,
      depthY,
      color,
      alpha
    ),
  drawSonnetTrapezoidPrism = (
    target,
    x,
    y,
    topWidth,
    bottomWidth,
    height,
    depthX,
    depthY,
    color,
    alpha
  ) =>
    drawSonnetExtrudedPolygon(
      target,
      [
        [x - topWidth / 2, y - height / 2],
        [x + topWidth / 2, y - height / 2],
        [x + bottomWidth / 2, y + height / 2],
        [x - bottomWidth / 2, y + height / 2],
      ],
      depthX,
      depthY,
      color,
      alpha
    );
export {
  SONNET_GEO_VARIANT_COUNT,
  drawSonnetHexagonalPrism,
  drawSonnetSolidCuboid,
  drawSonnetTrapezoidPrism,
  drawSonnetTriangularPrism,
  resolveSonnetGeoVariant,
  resolveSonnetHudRotationQuarterTurns,
  resolveSonnetMoleculeVariant,
};
