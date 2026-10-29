// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { sonnetHash01 } from './sonnetRandom.mjs';
import { resolveSonnetShotMgBleed } from './sonnetShotMgViewport.mjs';
const SONNET_MARINE_GEO_VARIANTS = [
    'wave-scrolls',
    'nautilus',
    'coral-branch',
    'lighthouse-beam',
    'compass-rose',
    'sail-regatta',
    'bubble-rise',
    'tide-pools',
    'seaweed-sway',
    'deep-current',
  ],
  TAU = Math.PI * 2,
  drawWaveScrolls = ({ target, radius, width, height, seed, primary, secondary }) => {
    const bleed = resolveSonnetShotMgBleed(width, height, radius);
    for (let row = 0; row < 4; row += 1) {
      const y = -radius * 0.3 + row * radius * 0.22,
        crestR = radius * 0.1,
        step = crestR * 2.1,
        count = Math.ceil((bleed.x * 2) / step);
      for (let i = 0; i < count; i += 1) {
        const x = -bleed.x + i * step + (row % 2) * crestR;
        target.arc(x, y, crestR, Math.PI, TAU).stroke({
          color: (i + row) % 3 === 0 ? secondary : primary,
          width: row === 1 ? 2 : 1,
          alpha: 0.42 - row * 0.06,
        });
      }
    }
    for (let i = 0; i < 6; i += 1)
      target
        .circle(
          (sonnetHash01(seed, i, 263) - 0.5) * bleed.x * 1.4,
          -radius * 0.55 + sonnetHash01(seed, i, 269) * radius * 0.25,
          1.6
        )
        .fill({ color: secondary, alpha: 0.4 });
  },
  drawNautilus = ({ target, radius, seed, primary, secondary }) => {
    const startAngle = sonnetHash01(seed, 0, 271) * TAU;
    target.moveTo(Math.cos(startAngle) * radius * 0.04, Math.sin(startAngle) * radius * 0.04);
    for (let i = 1; i <= 90; i += 1) {
      const t = i / 90,
        angle = startAngle + t * 2.6 * TAU,
        r = radius * (0.04 + t * 0.5);
      target.lineTo(Math.cos(angle) * r, Math.sin(angle) * r * 0.94);
    }
    target.stroke({ color: primary, width: 2.5, alpha: 0.65 });
    for (let i = 1; i <= 8; i += 1) {
      const t = i / 9,
        angle = startAngle + t * 2.6 * TAU,
        r = radius * (0.04 + t * 0.5);
      target
        .moveTo(Math.cos(angle) * r * 0.55, Math.sin(angle) * r * 0.52)
        .lineTo(Math.cos(angle) * r, Math.sin(angle) * r * 0.94)
        .stroke({ color: secondary, width: 1, alpha: 0.35 });
    }
    target.circle(0, 0, radius * 0.05).stroke({ color: primary, width: 1.5, alpha: 0.5 });
  },
  drawCoralBranch = ({ target, radius, seed, primary, secondary }) => {
    const baseX = (seed % 2 === 0 ? -1 : 1) * radius * 0.12,
      fork = (x, y, angle, len, width_, depth, limb) => {
        const ex = x + Math.cos(angle) * len,
          ey = y + Math.sin(angle) * len;
        if (
          (target
            .moveTo(x, y)
            .quadraticCurveTo(
              x + Math.cos(angle + 0.3) * len * 0.5,
              y + Math.sin(angle + 0.3) * len * 0.5,
              ex,
              ey
            )
            .stroke({
              color: depth === 0 ? secondary : primary,
              width: width_,
              alpha: 0.6 - depth * 0.12,
            }),
          target.circle(ex, ey, width_ * 0.9).fill({ color: secondary, alpha: 0.5 }),
          depth < 2)
        ) {
          const spread = 0.55 + sonnetHash01(seed, limb, 277) * 0.3;
          (fork(
            ex,
            ey,
            angle - spread,
            len * 0.62,
            Math.max(1, width_ - 1),
            depth + 1,
            limb * 2 + 1
          ),
            fork(
              ex,
              ey,
              angle + spread * 0.8,
              len * 0.68,
              Math.max(1, width_ - 1),
              depth + 1,
              limb * 2 + 2
            ));
        }
      };
    fork(baseX, radius * 0.62, -Math.PI / 2, radius * 0.34, 3, 0, 0);
    for (let i = 0; i < 5; i += 1)
      target
        .circle(
          baseX + (sonnetHash01(seed, i, 281) - 0.5) * radius * 0.9,
          radius * (0.3 + sonnetHash01(seed, i, 283) * 0.3),
          1.8
        )
        .fill({ color: primary, alpha: 0.35 });
  },
  drawLighthouseBeam = ({ target, radius, seed, primary, secondary }) => {
    const direction = seed % 2 === 0 ? 1 : -1,
      bx = -radius * 0.3 * direction,
      baseY = radius * 0.42;
    (target
      .moveTo(bx - radius * 0.09, baseY)
      .lineTo(bx - radius * 0.05, baseY - radius * 0.42)
      .lineTo(bx + radius * 0.05, baseY - radius * 0.42)
      .lineTo(bx + radius * 0.09, baseY)
      .stroke({ color: primary, width: 2, alpha: 0.6 }),
      target
        .rect(bx - radius * 0.07, baseY - radius * 0.52, radius * 0.14, radius * 0.1)
        .stroke({ color: primary, width: 1.5, alpha: 0.55 }),
      target
        .circle(bx, baseY - radius * 0.47, radius * 0.025)
        .fill({ color: secondary, alpha: 0.9 }));
    for (let beam = 0; beam < 2; beam += 1) {
      const spread = radius * (0.1 + beam * 0.12);
      (target
        .moveTo(bx, baseY - radius * 0.47)
        .lineTo(bx + direction * radius * 0.85, baseY - radius * 0.47 - spread)
        .stroke({ color: secondary, width: 1.5, alpha: 0.4 - beam * 0.1 }),
        target
          .moveTo(bx, baseY - radius * 0.47)
          .lineTo(bx + direction * radius * 0.85, baseY - radius * 0.47 + spread)
          .stroke({ color: secondary, width: 1.5, alpha: 0.4 - beam * 0.1 }));
    }
    for (let i = 0; i < 5; i += 1) {
      const x = -radius * 0.6 + i * radius * 0.3;
      target
        .arc(x, radius * 0.56, radius * 0.1, Math.PI, TAU)
        .stroke({ color: primary, width: 1, alpha: 0.35 });
    }
  },
  drawCompassRose = ({ target, radius, seed, primary, secondary }) => {
    const roseR = radius * 0.42;
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU - Math.PI / 2,
        long = i % 2 === 0,
        len = long ? roseR : roseR * 0.55,
        halfWidth = long ? 0.09 : 0.06,
        tx = Math.cos(angle) * len,
        ty = Math.sin(angle) * len,
        lx = Math.cos(angle + halfWidth) * roseR * 0.16,
        ly = Math.sin(angle + halfWidth) * roseR * 0.16,
        rx = Math.cos(angle - halfWidth) * roseR * 0.16,
        ry = Math.sin(angle - halfWidth) * roseR * 0.16;
      (target
        .moveTo(lx, ly)
        .lineTo(tx, ty)
        .lineTo(rx, ry)
        .stroke({
          color: long ? primary : secondary,
          width: long ? 2 : 1,
          alpha: long ? 0.65 : 0.45,
        }),
        long &&
          i % 4 === 0 &&
          target.moveTo(lx, ly).lineTo(tx, ty).lineTo(rx, ry).fill({ color: primary, alpha: 0.1 }));
    }
    (target.circle(0, 0, roseR * 0.14).stroke({ color: primary, width: 1.5, alpha: 0.6 }),
      target.circle(0, 0, roseR * 0.05).fill({ color: secondary, alpha: 0.8 }));
    const arcStart = sonnetHash01(seed, 0, 293) * TAU;
    for (let i = 0; i <= 24; i += 1) {
      const angle = arcStart + (i / 24) * Math.PI * 1.2,
        inner = roseR * 1.12,
        outer = inner + (i % 6 === 0 ? 10 : 5);
      target
        .moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
        .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        .stroke({ color: primary, width: 1, alpha: 0.4 });
    }
  },
  drawSailRegatta = ({ target, radius, seed, primary, secondary }) => {
    for (let boat = 0; boat < 3; boat += 1) {
      const scale = 1 - boat * 0.24,
        bx = (boat - 1) * radius * 0.44 + (sonnetHash01(seed, boat, 307) - 0.5) * radius * 0.08,
        by = radius * (0.28 - boat * 0.12),
        mastH = radius * 0.34 * scale;
      (target
        .moveTo(bx, by)
        .lineTo(bx, by - mastH)
        .stroke({ color: primary, width: 2, alpha: 0.6 }),
        target
          .moveTo(bx, by - mastH)
          .quadraticCurveTo(bx + radius * 0.2 * scale, by - mastH * 0.55, bx, by - mastH * 0.08)
          .stroke({ color: boat === 1 ? secondary : primary, width: 1.5, alpha: 0.55 }),
        target
          .moveTo(bx, by - mastH * 0.92)
          .lineTo(bx - radius * 0.13 * scale, by - mastH * 0.1)
          .lineTo(bx, by - mastH * 0.1)
          .stroke({ color: primary, width: 1, alpha: 0.4 }),
        target
          .moveTo(bx - radius * 0.15 * scale, by)
          .quadraticCurveTo(bx, by + radius * 0.07 * scale, bx + radius * 0.15 * scale, by)
          .stroke({ color: primary, width: 2, alpha: 0.55 }));
    }
    for (let i = 0; i < 7; i += 1) {
      const x = -radius * 0.66 + i * radius * 0.22,
        y = radius * (0.42 + (i % 2) * 0.05);
      target
        .moveTo(x, y)
        .lineTo(x + radius * 0.1, y)
        .stroke({ color: secondary, width: 1, alpha: 0.35 });
    }
  },
  drawBubbleRise = ({ target, radius, seed, primary, secondary }) => {
    for (let column = 0; column < 3; column += 1) {
      const x =
          (column - 1) * radius * 0.34 + (sonnetHash01(seed, column, 311) - 0.5) * radius * 0.12,
        count = 5 + column;
      for (let i = 0; i < count; i += 1) {
        const t = i / count,
          y = radius * 0.55 - t * radius * 1.05,
          wobble = (sonnetHash01(seed, column * 10 + i, 313) - 0.5) * radius * 0.08,
          r = radius * (0.02 + t * 0.055);
        (target
          .circle(x + wobble, y, r)
          .stroke({ color: i % 3 === 0 ? secondary : primary, width: 1, alpha: 0.35 + t * 0.35 }),
          r > radius * 0.05 &&
            target
              .arc(x + wobble, y, r * 0.55, Math.PI * 1.1, Math.PI * 1.6)
              .stroke({ color: secondary, width: 1, alpha: 0.5 }));
      }
    }
  },
  drawTidePools = ({ target, radius, seed, primary, secondary }) => {
    for (let pool = 0; pool < 4; pool += 1) {
      const px = (sonnetHash01(seed, pool, 317) - 0.5) * radius * 0.7,
        py = (sonnetHash01(seed, pool, 331) - 0.2) * radius * 0.5,
        pr = radius * (0.16 + sonnetHash01(seed, pool, 337) * 0.12);
      (target.moveTo(px + pr, py),
        target.bezierCurveTo(px + pr, py - pr * 0.7, px + pr * 0.4, py - pr, px, py - pr * 0.9),
        target.bezierCurveTo(
          px - pr * 0.7,
          py - pr * 0.8,
          px - pr,
          py - pr * 0.2,
          px - pr * 0.9,
          py + pr * 0.3
        ),
        target.bezierCurveTo(
          px - pr * 0.6,
          py + pr * 0.8,
          px + pr * 0.2,
          py + pr,
          px + pr * 0.6,
          py + pr * 0.7
        ),
        target.bezierCurveTo(px + pr * 0.95, py + pr * 0.5, px + pr, py + pr * 0.3, px + pr, py),
        target.stroke({ color: pool % 2 === 0 ? primary : secondary, width: 1.5, alpha: 0.45 }));
      for (let pebble = 0; pebble < 3; pebble += 1)
        target
          .circle(
            px + (sonnetHash01(seed, pool * 4 + pebble, 347) - 0.5) * pr,
            py + (sonnetHash01(seed, pool * 4 + pebble, 349) - 0.5) * pr * 0.7,
            1.6 + pebble
          )
          .fill({ color: secondary, alpha: 0.45 });
    }
  },
  drawSeaweedSway = ({ target, radius, seed, primary, secondary }) => {
    for (let blade = 0; blade < 6; blade += 1) {
      const x =
          -radius * 0.55 +
          blade * radius * 0.22 +
          (sonnetHash01(seed, blade, 353) - 0.5) * radius * 0.06,
        h = radius * (0.4 + sonnetHash01(seed, blade, 359) * 0.3),
        sway = (blade % 2 === 0 ? 1 : -1) * radius * 0.12;
      (target
        .moveTo(x, radius * 0.62)
        .bezierCurveTo(
          x + sway,
          radius * 0.62 - h * 0.4,
          x - sway,
          radius * 0.62 - h * 0.7,
          x + sway * 0.5,
          radius * 0.62 - h
        )
        .stroke({
          color: blade % 2 === 0 ? primary : secondary,
          width: 2,
          alpha: 0.5 - blade * 0.03,
        }),
        target.circle(x + sway * 0.5, radius * 0.62 - h, 2).fill({ color: secondary, alpha: 0.5 }));
    }
    for (let i = 0; i < 6; i += 1)
      target
        .circle(
          (sonnetHash01(seed, i, 367) - 0.5) * radius * 1.1,
          -radius * 0.5 + sonnetHash01(seed, i, 373) * radius * 0.5,
          1.4 + sonnetHash01(seed, i, 379) * 1.6
        )
        .stroke({ color: primary, width: 1, alpha: 0.35 });
  },
  drawDeepCurrent = ({ target, radius, width, height, seed, primary, secondary }) => {
    const bleed = resolveSonnetShotMgBleed(width, height, radius);
    for (let line = 0; line < 5; line += 1) {
      const y = -radius * 0.4 + line * radius * 0.2,
        lift = (line % 2 === 0 ? 1 : -1) * radius * 0.06;
      target
        .moveTo(-bleed.x, y)
        .bezierCurveTo(-radius * 0.3, y + lift, radius * 0.3, y - lift, bleed.x, y)
        .stroke({
          color: line === 2 ? secondary : primary,
          width: line === 2 ? 2 : 1,
          alpha: 0.32 + (line % 3) * 0.07,
        });
    }
    for (let i = 0; i < 6; i += 1) {
      const x = (sonnetHash01(seed, i, 383) - 0.5) * radius * 1.2,
        y = -radius * 0.3 + sonnetHash01(seed, i, 389) * radius * 0.6,
        s = 5 + sonnetHash01(seed, i, 397) * 4,
        flip = i % 2 === 0 ? 1 : -1;
      target
        .moveTo(x - s * flip, y - s * 0.5)
        .lineTo(x, y)
        .lineTo(x - s * flip, y + s * 0.5)
        .stroke({ color: secondary, width: 1.5, alpha: 0.55 });
    }
  },
  SONNET_MARINE_DRAWERS = [
    drawWaveScrolls,
    drawNautilus,
    drawCoralBranch,
    drawLighthouseBeam,
    drawCompassRose,
    drawSailRegatta,
    drawBubbleRise,
    drawTidePools,
    drawSeaweedSway,
    drawDeepCurrent,
  ];
export { SONNET_MARINE_DRAWERS, SONNET_MARINE_GEO_VARIANTS };
