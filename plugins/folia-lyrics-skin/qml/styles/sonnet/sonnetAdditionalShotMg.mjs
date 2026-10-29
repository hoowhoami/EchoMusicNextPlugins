// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { drawThemedSonnetShotMg } from './sonnetThemedShotMg.mjs';
import { drawOpenSonnetShotMg } from './sonnetOpenFrameShotMg.mjs';
import { drawExtendedSonnetShotMg } from './sonnetExtendedShotMg.mjs';
import { resolveSonnetShotMgBleed } from './sonnetShotMgViewport.mjs';
const SONNET_ADDITIONAL_GEO_VARIANT_START = 18,
  SONNET_ADDITIONAL_GEO_VARIANT_COUNT = 6,
  drawContourAtlas = ({ target, radius, seed, primary, secondary }) => {
    for (let ring = 0; ring < 8; ring += 1) {
      const baseRadius = radius * (0.16 + ring * 0.075);
      for (let step = 0; step <= 48; step += 1) {
        const angle = (step / 48) * Math.PI * 2,
          ripple =
            Math.sin(angle * 3 + seed * 0.07 + ring) * radius * 0.018 +
            Math.cos(angle * 5 - seed * 0.03 + ring * 0.7) * radius * 0.012,
          x = Math.cos(angle) * (baseRadius + ripple) + Math.sin(ring * 1.7) * radius * 0.055,
          y =
            Math.sin(angle) * (baseRadius + ripple) * 0.72 + Math.cos(ring * 1.3) * radius * 0.035;
        step === 0 ? target.moveTo(x, y) : target.lineTo(x, y);
      }
      target.stroke({
        color: ring % 3 === 0 ? secondary : primary,
        width: ring % 3 === 0 ? 2 : 1,
        alpha: 0.2 + ring * 0.045,
      });
    }
    target
      .moveTo(-radius * 0.78, radius * 0.52)
      .lineTo(-radius * 0.58, radius * 0.52)
      .lineTo(-radius * 0.58, radius * 0.46)
      .lineTo(-radius * 0.38, radius * 0.46)
      .stroke({ color: primary, width: 3, alpha: 0.64 });
  },
  drawRadialWave = ({ target, radius, seed, primary, secondary }) => {
    for (let index = 0; index < 64; index += 1) {
      const angle = (index / 64) * Math.PI * 2,
        signal = 0.5 + 0.5 * Math.sin(index * 1.83 + seed * 0.11),
        inner = radius * (0.29 + signal * 0.035),
        outer = radius * (0.43 + signal * 0.21);
      target
        .moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
        .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        .stroke({
          color: index % 8 === 0 ? secondary : primary,
          width: index % 8 === 0 ? 3 : 1,
          alpha: index % 2 === 0 ? 0.58 : 0.32,
        });
    }
    (target.circle(0, 0, radius * 0.24).stroke({ color: primary, width: 5, alpha: 0.7 }),
      target.circle(0, 0, radius * 0.68).stroke({ color: secondary, width: 1, alpha: 0.18 }),
      target.circle(0, 0, radius * 0.72).stroke({ color: primary, width: 2, alpha: 0.12 }));
  },
  drawTransitBlueprint = ({ target, radius, width, height, seed, primary, secondary }) => {
    const direction = seed % 2 === 0 ? 1 : -1,
      bleed = resolveSonnetShotMgBleed(width, height, radius);
    [
      [
        [-0.72, -0.38],
        [-0.38, -0.38],
        [-0.38, 0.08],
        [0.08, 0.08],
        [0.08, 0.52],
        [0.68, 0.52],
      ],
      [
        [-0.62, 0.58],
        [-0.62, 0.24],
        [-0.14, 0.24],
        [-0.14, -0.52],
        [0.5, -0.52],
        [0.5, -0.2],
        [0.74, -0.2],
      ],
      [
        [-0.78, -0.06],
        [-0.5, -0.06],
        [-0.5, -0.62],
        [0.24, -0.62],
        [0.24, 0.3],
        [0.72, 0.3],
      ],
    ].forEach((route, routeIndex) => {
      const first = route[0],
        last = route[route.length - 1];
      (target.moveTo(-bleed.x * direction, first[1] * radius),
        route.forEach(([x, y]) => {
          const px = x * radius * direction,
            py = y * radius;
          target.lineTo(px, py);
        }),
        target.lineTo(bleed.x * direction, last[1] * radius),
        target.stroke({
          color: routeIndex === 1 ? secondary : primary,
          width: routeIndex === 0 ? 5 : 2,
          alpha: 0.34 + routeIndex * 0.12,
        }),
        route.forEach(([x, y], pointIndex) => {
          if (
            pointIndex === 0 ||
            pointIndex === route.length - 1 ||
            (pointIndex + routeIndex) % 2 === 0
          ) {
            const px = x * radius * direction,
              py = y * radius;
            (target
              .circle(px, py, pointIndex === 0 ? 10 : 6)
              .fill({ color: pointIndex % 2 === 0 ? primary : secondary, alpha: 0.72 }),
              target
                .circle(px, py, pointIndex === 0 ? 16 : 11)
                .stroke({ color: primary, width: 1, alpha: 0.36 }));
          }
        }));
    });
  },
  drawChronograph = ({ target, radius, seed, primary, secondary }) => {
    [0.2, 0.38, 0.62].forEach((scale, index) => {
      target.circle(0, 0, radius * scale).stroke({
        color: index === 1 ? secondary : primary,
        width: index === 2 ? 4 : 2,
        alpha: 0.3 + index * 0.13,
      });
    });
    for (let tick = 0; tick < 48; tick += 1) {
      const angle = (tick / 48) * Math.PI * 2,
        outer = radius * 0.72,
        inner = outer - radius * (tick % 4 === 0 ? 0.11 : 0.045);
      target
        .moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
        .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        .stroke({
          color: tick % 4 === 0 ? secondary : primary,
          width: tick % 4 === 0 ? 3 : 1,
          alpha: 0.5,
        });
    }
    const handAngle = ((seed % 60) / 60) * Math.PI * 2 - Math.PI / 2,
      secondAngle = (((seed * 7) % 60) / 60) * Math.PI * 2 - Math.PI / 2;
    (target
      .moveTo(-Math.cos(handAngle) * radius * 0.12, -Math.sin(handAngle) * radius * 0.12)
      .lineTo(Math.cos(handAngle) * radius * 0.55, Math.sin(handAngle) * radius * 0.55)
      .stroke({ color: primary, width: 6, alpha: 0.74 }),
      target
        .moveTo(0, 0)
        .lineTo(Math.cos(secondAngle) * radius * 0.65, Math.sin(secondAngle) * radius * 0.65)
        .stroke({ color: secondary, width: 2, alpha: 0.72 }),
      target.circle(0, 0, radius * 0.055).fill({ color: primary, alpha: 0.85 }));
  },
  drawFoldedRibbons = ({ target, radius, width, height, seed, primary, secondary }) => {
    const direction = seed % 2 === 0 ? 1 : -1,
      bleed = resolveSonnetShotMgBleed(width, height, radius);
    for (let band = 0; band < 5; band += 1) {
      const y = (-0.5 + band * 0.25) * radius,
        offset = (band % 2 === 0 ? 1 : -1) * direction;
      (target
        .moveTo(-bleed.x, y)
        .bezierCurveTo(
          -radius * 0.38,
          y - radius * 0.28 * offset,
          radius * 0.18,
          y + radius * 0.28 * offset,
          bleed.x,
          y
        )
        .stroke({
          color: band % 2 === 0 ? primary : secondary,
          width: band === 2 ? 12 : 5,
          alpha: 0.24 + band * 0.08,
        }),
        target
          .moveTo(-bleed.x, y + radius * 0.055)
          .bezierCurveTo(
            -radius * 0.38,
            y - radius * 0.28 * offset + radius * 0.055,
            radius * 0.18,
            y + radius * 0.28 * offset + radius * 0.055,
            bleed.x,
            y + radius * 0.055
          )
          .stroke({ color: primary, width: 1, alpha: 0.3 }));
    }
    (target
      .moveTo(-radius * 0.34, -bleed.y)
      .lineTo(-radius * 0.34, -radius * 0.18)
      .stroke({ color: primary, width: 2, alpha: 0.18 }),
      target
        .moveTo(radius * 0.34, radius * 0.18)
        .lineTo(radius * 0.34, bleed.y)
        .stroke({ color: primary, width: 2, alpha: 0.18 }));
  },
  drawHalftonePoster = ({ target, radius, width, height, seed, primary, secondary }) => {
    const spacing = radius * 0.17,
      bleed = resolveSonnetShotMgBleed(width, height, radius),
      columns = Math.ceil((bleed.x * 2) / spacing) + 2,
      rows = Math.ceil((bleed.y * 2) / spacing) + 2;
    for (let row = 0; row < rows; row += 1)
      for (let column = 0; column < columns; column += 1) {
        const x = (column - (columns - 1) / 2) * spacing,
          y = (row - (rows - 1) / 2) * spacing,
          distance = Math.hypot(x, y) / radius,
          pulse = 0.5 + 0.5 * Math.sin(column * 0.9 + row * 1.4 + seed * 0.08),
          dotRadius = radius * (9e-3 + Math.max(0, 0.72 - distance) * 0.034 + pulse * 0.012);
        target.circle(x, y, dotRadius).fill({
          color: (row + column) % 5 === 0 ? secondary : primary,
          alpha: 0.24 + pulse * 0.5,
        });
      }
    (target
      .moveTo(-bleed.x, -bleed.y * 0.72)
      .lineTo(bleed.x, -bleed.y * 0.72)
      .stroke({ color: secondary, width: 2, alpha: 0.28 }),
      target
        .moveTo(-bleed.x * 0.58, -bleed.y)
        .lineTo(-bleed.x * 0.58, bleed.y)
        .stroke({ color: primary, width: 1, alpha: 0.2 }));
  },
  drawAdditionalSonnetShotMg = (options) => {
    switch (options.variant) {
      case 18:
        return (drawContourAtlas(options), !0);
      case 19:
        return (drawRadialWave(options), !0);
      case 20:
        return (drawTransitBlueprint(options), !0);
      case 21:
        return (drawChronograph(options), !0);
      case 22:
        return (drawFoldedRibbons(options), !0);
      case 23:
        return (drawHalftonePoster(options), !0);
      default:
        return (
          drawThemedSonnetShotMg(options) ||
          drawOpenSonnetShotMg(options) ||
          drawExtendedSonnetShotMg(options)
        );
    }
  };
export {
  SONNET_ADDITIONAL_GEO_VARIANT_COUNT,
  SONNET_ADDITIONAL_GEO_VARIANT_START,
  drawAdditionalSonnetShotMg,
};
