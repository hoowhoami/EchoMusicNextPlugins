// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const SONNET_OPEN_GEO_VARIANT_START = 36,
  SONNET_OPEN_GEO_VARIANT_COUNT = 12,
  SONNET_OPEN_GEO_VARIANTS = [
    'open-arc-brackets',
    'dashed-orbits',
    'open-fragments',
    'horizon-bundles',
    'semi-wreath',
    'side-rulers',
    'diagonal-stream',
    'corner-petal-spray',
    'dotted-windows',
    'open-radar',
    'brush-strokes',
    'stitch-corners',
  ],
  TAU = Math.PI * 2,
  rotatePoint = (x, y, angle) => [
    x * Math.cos(angle) - y * Math.sin(angle),
    x * Math.sin(angle) + y * Math.cos(angle),
  ],
  drawOpenArcBrackets = ({ target, width, height, radius, seed, primary, secondary }) => {
    const bx = width * 0.34,
      by = height * 0.34,
      arcR = radius * 0.17;
    [
      { x: -bx, y: -by, start: Math.PI, end: Math.PI * 1.5 },
      { x: bx, y: -by, start: -Math.PI / 2, end: 0 },
      { x: bx, y: by, start: 0, end: Math.PI / 2 },
      { x: -bx, y: by, start: Math.PI / 2, end: Math.PI },
    ].forEach((corner, index) => {
      (target
        .arc(corner.x, corner.y, arcR, corner.start, corner.end)
        .stroke({ color: index % 2 ? secondary : primary, width: 3, alpha: 0.6 }),
        target
          .arc(corner.x, corner.y, arcR * 0.72, corner.start, corner.end)
          .stroke({ color: primary, width: 1, alpha: 0.3 }),
        target
          .moveTo(corner.x - 5, corner.y)
          .lineTo(corner.x + 5, corner.y)
          .stroke({ color: primary, width: 1, alpha: 0.5 }),
        target
          .moveTo(corner.x, corner.y - 5)
          .lineTo(corner.x, corner.y + 5)
          .stroke({ color: primary, width: 1, alpha: 0.5 }));
    });
    const dotAngle = ((seed % 8) * TAU) / 8;
    target
      .circle(Math.cos(dotAngle) * radius * 0.5, Math.sin(dotAngle) * radius * 0.5, radius * 0.02)
      .fill({ color: secondary, alpha: 0.7 });
  },
  drawDashedOrbits = ({ target, radius, seed, primary, secondary }) => {
    for (let ring = 0; ring < 3; ring += 1) {
      const ringRadius = radius * (0.32 + ring * 0.18),
        dashes = 12 + ring * 4,
        offset = seed * 0.13 + ring * 0.7,
        span = (TAU / dashes) * 0.55;
      for (let dash = 0; dash < dashes; dash += 1) {
        const start = offset + (dash / dashes) * TAU;
        target.arc(0, 0, ringRadius, start, start + span).stroke({
          color: ring === 1 ? secondary : primary,
          width: ring === 1 ? 1 : 2,
          alpha: 0.28 + ring * 0.06,
        });
      }
    }
    const markerAngle = seed * 0.31;
    (target
      .circle(
        Math.cos(markerAngle) * radius * 0.68,
        Math.sin(markerAngle) * radius * 0.68,
        radius * 0.022
      )
      .fill({ color: primary, alpha: 0.75 }),
      target
        .circle(
          Math.cos(markerAngle + Math.PI) * radius * 0.5,
          Math.sin(markerAngle + Math.PI) * radius * 0.5,
          radius * 0.016
        )
        .fill({ color: secondary, alpha: 0.6 }),
      target.circle(0, 0, radius * 0.05).stroke({ color: primary, width: 1.5, alpha: 0.5 }));
  },
  drawOpenFragments = ({ target, radius, seed, primary, secondary }) => {
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * TAU + seed * 0.05,
        distance = radius * (0.42 + ((seed + index * 7) % 30) / 100),
        cx = Math.cos(angle) * distance,
        cy = Math.sin(angle) * distance * 0.8,
        size = radius * (0.07 + ((seed + index * 13) % 20) / 200),
        rotation = seed * 0.11 + index * 0.9,
        points = [
          rotatePoint(-size, -size, rotation),
          rotatePoint(size, -size, rotation),
          rotatePoint(size, size, rotation),
          rotatePoint(-size, size, rotation),
        ];
      target.moveTo(cx + points[0][0], cy + points[0][1]);
      for (let point = 1; point < points.length; point += 1)
        target.lineTo(cx + points[point][0], cy + points[point][1]);
      (target.stroke({ color: index % 2 ? secondary : primary, width: 2, alpha: 0.5 }),
        index === seed % 5 &&
          target.circle(cx, cy, size * 0.28).fill({ color: primary, alpha: 0.35 }));
    }
  },
  drawHorizonBundles = ({ target, width, height, seed, primary, secondary }) => {
    ([
      { baseY: -height * 0.28, drift: 1 },
      { baseY: height * 0.3, drift: -1 },
    ].forEach((bundle, bundleIndex) => {
      for (let line = 0; line < 3; line += 1) {
        const y = bundle.baseY + line * 10 * bundle.drift,
          breakAt = width * ((((seed + line * 17 + bundleIndex * 31) % 40) + 30) / 100 - 0.5),
          gapHalf = width * 0.045;
        (target
          .moveTo(-width * 0.4, y)
          .lineTo(breakAt - gapHalf, y)
          .stroke({
            color: line === 1 ? secondary : primary,
            width: line === 1 ? 2 : 1,
            alpha: 0.42 - line * 0.08,
          }),
          target
            .moveTo(breakAt + gapHalf, y)
            .lineTo(width * 0.4, y)
            .stroke({
              color: line === 1 ? secondary : primary,
              width: line === 1 ? 2 : 1,
              alpha: 0.42 - line * 0.08,
            }));
      }
      target
        .moveTo(-width * 0.42, bundle.baseY)
        .lineTo(-width * 0.42 + 6, bundle.baseY)
        .stroke({ color: primary, width: 1, alpha: 0.4 });
    }),
      target
        .rect(width * 0.36, -height * 0.28 - 3, width * 0.04, 6)
        .fill({ color: secondary, alpha: 0.5 }));
  },
  drawSemiWreath = ({ target, radius, seed, primary, secondary }) => {
    const opening = (seed % 4) * (Math.PI / 2) + Math.PI / 8,
      span = TAU * 0.75,
      outer = radius * 0.58,
      inner = radius * 0.5;
    (target
      .arc(0, 0, outer, opening, opening + span)
      .stroke({ color: primary, width: 2.5, alpha: 0.55 }),
      target
        .arc(0, 0, inner, opening, opening + span)
        .stroke({ color: secondary, width: 1, alpha: 0.3 }));
    const ticks = 18;
    for (let index = 0; index < ticks; index += 1) {
      const angle = opening + (index / ticks) * span;
      (target
        .moveTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        .lineTo(
          Math.cos(angle) * (outer + radius * 0.05),
          Math.sin(angle) * (outer + radius * 0.05)
        )
        .stroke({ color: primary, width: 1, alpha: 0.4 }),
        index % 6 === 0 &&
          target
            .circle(Math.cos(angle) * inner, Math.sin(angle) * inner, radius * 0.016)
            .fill({ color: secondary, alpha: 0.6 }));
    }
  },
  drawSideRulers = ({ target, width, height, seed, primary, secondary }) => {
    for (const side of [-1, 1]) {
      const x = side * width * 0.36;
      target
        .moveTo(x, -height * 0.3)
        .lineTo(x, height * 0.3)
        .stroke({ color: primary, width: 1, alpha: 0.35 });
      for (let tick = 0; tick < 12; tick += 1) {
        const y = -height * 0.3 + (tick / 11) * height * 0.6,
          length = tick % 4 === 0 ? 18 : 9;
        target
          .moveTo(x, y)
          .lineTo(x - side * length, y)
          .stroke({ color: tick % 4 === 0 ? secondary : primary, width: 1, alpha: 0.45 });
      }
      const accentY = -height * 0.3 + (((seed + (side > 0 ? 5 : 0)) % 11) / 11) * height * 0.6;
      target.rect(side > 0 ? x : x - 4, accentY - 4, 4, 8).fill({ color: secondary, alpha: 0.6 });
    }
  },
  drawDiagonalStream = ({ target, radius, seed, primary, secondary }) => {
    const angle = Math.PI / 4 + (seed % 3) * (Math.PI / 12),
      dirX = Math.cos(angle),
      dirY = Math.sin(angle),
      normalX = -dirY,
      normalY = dirX;
    for (let line = 0; line < 7; line += 1) {
      const offset = (line - 3) * radius * 0.16,
        length = radius * (0.55 + ((seed + line * 29) % 40) / 100),
        cx = normalX * offset,
        cy = normalY * offset;
      target
        .moveTo(cx - dirX * length, cy - dirY * length)
        .lineTo(cx + dirX * length * 0.6, cy + dirY * length * 0.6)
        .stroke({
          color: line === 3 ? secondary : primary,
          width: line === 3 ? 2 : 1,
          alpha: 0.22 + line * 0.03,
        });
    }
    for (const [index, offset] of [-radius * 0.16, radius * 0.16].entries()) {
      const cx = normalX * offset + dirX * radius * 0.1,
        cy = normalY * offset + dirY * radius * 0.1,
        size = radius * 0.07,
        points = [
          rotatePoint(0, -size, angle),
          rotatePoint(size, 0, angle),
          rotatePoint(0, size, angle),
          rotatePoint(-size, 0, angle),
        ];
      target.moveTo(cx + points[0][0], cy + points[0][1]);
      for (let point = 1; point < points.length; point += 1)
        target.lineTo(cx + points[point][0], cy + points[point][1]);
      (target.stroke({ color: primary, width: 1.5, alpha: 0.55 }),
        index === 0 && target.circle(cx, cy, size * 0.22).fill({ color: secondary, alpha: 0.55 }));
    }
  },
  drawCornerPetalSpray = ({ target, width, height, radius, seed, primary, secondary }) => {
    const sign = seed % 2 === 0 ? 1 : -1;
    [
      { x: -sign * width * 0.28, y: -height * 0.26, base: Math.atan2(1, sign) },
      { x: sign * width * 0.28, y: height * 0.26, base: Math.atan2(-1, -sign) },
    ].forEach((corner, cornerIndex) => {
      for (let petal = 0; petal < 5; petal += 1) {
        const spread = (petal - 2) * 0.3,
          angle = corner.base + spread,
          length = radius * (0.3 - Math.abs(petal - 2) * 0.045),
          endX = corner.x + Math.cos(angle) * length,
          endY = corner.y + Math.sin(angle) * length,
          ctrlX = corner.x + Math.cos(angle + 0.35) * length * 0.55,
          ctrlY = corner.y + Math.sin(angle + 0.35) * length * 0.55;
        target
          .moveTo(corner.x, corner.y)
          .quadraticCurveTo(ctrlX, ctrlY, endX, endY)
          .stroke({
            color: petal === 2 ? secondary : primary,
            width: petal === 2 ? 2 : 1,
            alpha: 0.4,
          });
      }
      cornerIndex === 0 &&
        target.circle(corner.x, corner.y, radius * 0.02).fill({ color: primary, alpha: 0.6 });
    });
  },
  drawDottedWindows = ({ target, width, height, radius, seed, primary, secondary }) => {
    for (let row = 0; row < 5; row += 1)
      for (let column = 0; column < 7; column += 1) {
        if ((row * 7 + column + seed) % 5 === 0) continue;
        const x = (column - 6 / 2) * width * 0.11,
          y = (row - 4 / 2) * height * 0.14;
        target.circle(x, y, 1.5).fill({ color: primary, alpha: 0.35 });
      }
    const arm = radius * 0.1;
    for (let window = 0; window < 3; window += 1) {
      const cellX = (((seed + window * 2) % 7) - 3) * width * 0.11,
        cellY = (((seed + window * 3 + 1) % 5) - 4 / 2) * height * 0.14,
        flipX = (seed + window) % 2 === 0 ? 1 : -1,
        flipY = (seed + window * 2) % 2 === 0 ? 1 : -1;
      target
        .moveTo(cellX + flipX * arm, cellY)
        .lineTo(cellX, cellY)
        .lineTo(cellX, cellY + flipY * arm)
        .stroke({ color: secondary, width: 2, alpha: 0.6 });
    }
  },
  drawOpenRadar = ({ target, radius, seed, primary, secondary }) => {
    const span = TAU * 0.56;
    for (let ring = 0; ring < 3; ring += 1) {
      const ringRadius = radius * (0.3 + ring * 0.18),
        start = seed * 0.1 + ring * 0.9;
      target.arc(0, 0, ringRadius, start, start + span).stroke({
        color: ring === 1 ? secondary : primary,
        width: ring === 1 ? 2 : 1,
        alpha: 0.35 + ring * 0.06,
      });
    }
    const sweep = seed * 0.07;
    target
      .moveTo(0, 0)
      .lineTo(Math.cos(sweep) * radius * 0.66, Math.sin(sweep) * radius * 0.66)
      .stroke({ color: primary, width: 1.5, alpha: 0.5 });
    const lockAngle = sweep + 0.8,
      lockX = Math.cos(lockAngle) * radius * 0.48,
      lockY = Math.sin(lockAngle) * radius * 0.48,
      tick = radius * 0.04;
    (target
      .moveTo(lockX - tick * 2, lockY - tick)
      .lineTo(lockX - tick * 2, lockY - tick * 2)
      .lineTo(lockX - tick, lockY - tick * 2)
      .stroke({ color: secondary, width: 1.5, alpha: 0.7 }),
      target
        .moveTo(lockX + tick * 2, lockY + tick)
        .lineTo(lockX + tick * 2, lockY + tick * 2)
        .lineTo(lockX + tick, lockY + tick * 2)
        .stroke({ color: secondary, width: 1.5, alpha: 0.7 }),
      target.circle(0, 0, radius * 0.018).fill({ color: primary, alpha: 0.8 }),
      target.circle(lockX, lockY, radius * 0.014).fill({ color: secondary, alpha: 0.7 }));
  },
  drawBrushStrokes = ({ target, width, height, radius, seed, primary, secondary }) => {
    for (let stroke = 0; stroke < 4; stroke += 1) {
      const horizontal = stroke % 2 === 0,
        along = (((seed + stroke * 23) % 50) / 100 - 0.25) * (horizontal ? width : height),
        across = (((seed + stroke * 41) % 60) / 100 - 0.3) * (horizontal ? height : width),
        length = radius * (0.3 + ((seed + stroke * 7) % 25) / 100),
        x1 = horizontal ? along - length : across,
        y1 = horizontal ? across : along - length,
        x2 = horizontal ? along + length : across,
        y2 = horizontal ? across : along + length;
      (target
        .moveTo(x1, y1)
        .lineTo(x2, y2)
        .stroke({ color: stroke === 1 ? secondary : primary, width: radius * 0.04, alpha: 0.22 }),
        target
          .moveTo(x1, y1 + (horizontal ? radius * 0.035 : 0))
          .lineTo(horizontal ? x2 * 0.6 : x2, horizontal ? y2 + radius * 0.035 : y2 * 0.6)
          .stroke({ color: primary, width: radius * 0.012, alpha: 0.45 }));
    }
    const size = radius * 0.05,
      anchorX = width * 0.3,
      anchorY = -height * 0.3;
    (target
      .moveTo(anchorX - size, anchorY - size)
      .lineTo(anchorX + size, anchorY - size)
      .lineTo(anchorX + size, anchorY + size)
      .stroke({ color: secondary, width: 1.5, alpha: 0.6 }),
      target
        .rect(-anchorX - size / 2, -anchorY - size / 2, size, size)
        .fill({ color: primary, alpha: 0.4 }));
  },
  drawStitchCorners = ({ target, width, height, radius, seed, primary, secondary }) => {
    const arm = radius * 0.18,
      dash = radius * 0.03,
      corners = [
        { x: -width * 0.39, y: -height * 0.36, sx: 1, sy: 1 },
        { x: width * 0.39, y: -height * 0.36, sx: -1, sy: 1 },
        { x: width * 0.39, y: height * 0.36, sx: -1, sy: -1 },
        { x: -width * 0.39, y: height * 0.36, sx: 1, sy: -1 },
      ];
    corners.forEach((corner, index) => {
      for (let offset = 0; offset + dash <= arm; offset += dash * 2)
        (target
          .moveTo(corner.x + corner.sx * offset, corner.y)
          .lineTo(corner.x + corner.sx * (offset + dash), corner.y)
          .stroke({ color: index % 2 ? secondary : primary, width: 2, alpha: 0.5 }),
          target
            .moveTo(corner.x, corner.y + corner.sy * offset)
            .lineTo(corner.x, corner.y + corner.sy * (offset + dash))
            .stroke({ color: index % 2 ? secondary : primary, width: 2, alpha: 0.5 }));
    });
    const crossArm = radius * 0.09;
    for (let offset = -crossArm; offset + dash * 0.6 <= crossArm; offset += dash * 1.2)
      (target
        .moveTo(offset, 0)
        .lineTo(offset + dash * 0.6, 0)
        .stroke({ color: primary, width: 1, alpha: 0.4 }),
        target
          .moveTo(0, offset)
          .lineTo(0, offset + dash * 0.6)
          .stroke({ color: primary, width: 1, alpha: 0.4 }));
    target.circle(0, 0, radius * 0.012).fill({ color: secondary, alpha: 0.7 });
    const accentCorner = corners[seed % corners.length];
    target
      .circle(accentCorner.x + accentCorner.sx * arm, accentCorner.y, radius * 0.014)
      .fill({ color: primary, alpha: 0.6 });
  },
  OPEN_DRAWERS = [
    drawOpenArcBrackets,
    drawDashedOrbits,
    drawOpenFragments,
    drawHorizonBundles,
    drawSemiWreath,
    drawSideRulers,
    drawDiagonalStream,
    drawCornerPetalSpray,
    drawDottedWindows,
    drawOpenRadar,
    drawBrushStrokes,
    drawStitchCorners,
  ],
  drawOpenSonnetShotMg = (options) => {
    const index = options.variant - 36,
      drawer = OPEN_DRAWERS[index];
    return drawer ? (drawer(options), !0) : !1;
  };
export {
  SONNET_OPEN_GEO_VARIANTS,
  SONNET_OPEN_GEO_VARIANT_COUNT,
  SONNET_OPEN_GEO_VARIANT_START,
  drawOpenSonnetShotMg,
};
