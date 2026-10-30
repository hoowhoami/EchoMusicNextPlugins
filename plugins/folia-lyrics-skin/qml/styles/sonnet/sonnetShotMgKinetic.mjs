// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { sonnetHash01 } from './sonnetRandom.mjs';
import { resolveSonnetShotMgBleed } from './sonnetShotMgViewport.mjs';
const SONNET_KINETIC_GEO_VARIANTS = [
    'pendulum-wave',
    'domino-arc',
    'gear-cluster',
    'circuit-delta',
    'signal-tower',
    'spiral-stair',
    'waterfall-lines',
    'pinwheel',
    'ripple-drop',
    'suspension-bridge',
    'field-lines',
    'prism-beam',
    'echo-arcs',
    'kite-string',
  ],
  TAU = Math.PI * 2,
  drawPendulumWave = ({ target, radius, seed, primary, secondary }) => {
    const pivotY = -radius * 0.42,
      bobs = 9;
    for (let i = 0; i < bobs; i += 1) {
      const x = -radius * 0.5 + (i / (bobs - 1)) * radius,
        len = radius * (0.4 + i * 0.035),
        swing = Math.sin(i * 0.9 + seed * 0.07) * 0.35,
        bx = x + Math.sin(swing) * len,
        by = pivotY + Math.cos(swing) * len;
      (target.moveTo(x, pivotY).lineTo(bx, by).stroke({ color: primary, width: 1, alpha: 0.4 }),
        target
          .circle(bx, by, 3.5 + (i % 3))
          .fill({ color: i % 2 === 0 ? secondary : primary, alpha: 0.7 }));
    }
    target
      .moveTo(-radius * 0.58, pivotY)
      .lineTo(radius * 0.58, pivotY)
      .stroke({ color: primary, width: 2, alpha: 0.35 });
  },
  drawDominoArc = ({ target, radius, seed, primary, secondary }) => {
    const arcR = radius * 0.55;
    for (let i = 0; i < 10; i += 1) {
      const angle = Math.PI * 1.15 + (i / 9) * Math.PI * 0.7,
        bx = Math.cos(angle) * arcR,
        by = Math.sin(angle) * arcR + radius * 0.5,
        tilt = (i / 9) * 1.1 * (seed % 2 === 0 ? 1 : -1),
        w = radius * 0.035,
        h = radius * 0.14,
        cos = Math.cos(tilt),
        sin = Math.sin(tilt),
        corner = (cx, cy) => [bx + cx * cos - cy * sin, by + cx * sin + cy * cos],
        [x1, y1] = corner(-w, 0),
        [x2, y2] = corner(w, 0),
        [x3, y3] = corner(w, -h * 2),
        [x4, y4] = corner(-w, -h * 2);
      target
        .moveTo(x1, y1)
        .lineTo(x2, y2)
        .lineTo(x3, y3)
        .lineTo(x4, y4)
        .lineTo(x1, y1)
        .stroke({ color: i % 3 === 0 ? secondary : primary, width: 1.5, alpha: 0.55 });
    }
  },
  drawGearCluster = ({ target, radius, seed, primary, secondary }) => {
    [
      { x: 0, y: 0, r: radius * 0.26, teeth: 10 },
      { x: radius * 0.42, y: -radius * 0.2, r: radius * 0.16, teeth: 8 },
      { x: -radius * 0.4, y: radius * 0.22, r: radius * 0.13, teeth: 7 },
    ].forEach((gear, gi) => {
      const color = gi === 1 ? secondary : primary;
      (target.circle(gear.x, gear.y, gear.r).stroke({ color, width: 2, alpha: 0.55 }),
        target.circle(gear.x, gear.y, gear.r * 0.3).stroke({ color, width: 1.5, alpha: 0.45 }));
      const offset = sonnetHash01(seed, gi, 467) * TAU;
      for (let t = 0; t < gear.teeth; t += 1) {
        const angle = offset + (t / gear.teeth) * TAU;
        target
          .moveTo(gear.x + Math.cos(angle) * gear.r, gear.y + Math.sin(angle) * gear.r)
          .lineTo(
            gear.x + Math.cos(angle) * gear.r * 1.18,
            gear.y + Math.sin(angle) * gear.r * 1.18
          )
          .stroke({ color, width: 3, alpha: 0.5 });
      }
    });
  },
  drawCircuitDelta = ({ target, radius, width, height, seed, primary, secondary }) => {
    const bleed = resolveSonnetShotMgBleed(width, height, radius),
      lanes = 4;
    for (let lane = 0; lane < lanes; lane += 1) {
      const y = -radius * 0.36 + lane * radius * 0.24,
        bendX = -radius * 0.3 + sonnetHash01(seed, lane, 479) * radius * 0.6,
        drop = (lane % 2 === 0 ? 1 : -1) * radius * 0.08;
      (target
        .moveTo(-bleed.x, y)
        .lineTo(bendX - Math.abs(drop), y)
        .lineTo(bendX, y + drop)
        .lineTo(bleed.x, y + drop)
        .stroke({ color: lane === 1 ? secondary : primary, width: 1.5, alpha: 0.45 }),
        target.circle(bendX, y + drop, 3).fill({ color: secondary, alpha: 0.7 }),
        target.circle(-bleed.x * 0.55, y, 2.5).stroke({ color: primary, width: 1, alpha: 0.5 }));
    }
  },
  drawSignalTower = ({ target, radius, seed, primary, secondary }) => {
    const baseY = radius * 0.45,
      topY = -radius * 0.3;
    target
      .moveTo(-radius * 0.12, baseY)
      .lineTo(0, topY)
      .lineTo(radius * 0.12, baseY)
      .stroke({ color: primary, width: 2, alpha: 0.6 });
    for (let brace = 1; brace <= 3; brace += 1) {
      const y = baseY - (baseY - topY) * (brace / 4),
        half = radius * 0.12 * (1 - brace / 4.5);
      target
        .moveTo(-half, y)
        .lineTo(half, y - radius * 0.06)
        .stroke({ color: primary, width: 1, alpha: 0.4 });
    }
    target.circle(0, topY, radius * 0.03).fill({ color: secondary, alpha: 0.9 });
    for (let side = -1; side <= 1; side += 2)
      for (let ring = 0; ring < 3; ring += 1) {
        const r = radius * (0.12 + ring * 0.13);
        target
          .arc(
            0,
            topY,
            r,
            side < 0 ? Math.PI * 0.75 : -Math.PI * 0.25,
            side < 0 ? Math.PI * 1.25 : Math.PI * 0.25
          )
          .stroke({
            color: ring === 1 ? secondary : primary,
            width: 1.5,
            alpha: 0.45 - ring * 0.1,
          });
      }
  },
  drawSpiralStair = ({ target, radius, seed, primary, secondary }) => {
    const startAngle = sonnetHash01(seed, 0, 487) * TAU;
    for (let i = 0; i < 12; i += 1) {
      const angle = startAngle + i * 0.42,
        r = radius * (0.14 + i * 0.04),
        x = Math.cos(angle) * r,
        y = radius * 0.4 - i * radius * 0.055,
        tread = radius * 0.09;
      (target
        .moveTo(x, y)
        .lineTo(x + Math.cos(angle) * tread, y + Math.sin(angle) * tread * 0.4)
        .stroke({ color: i % 3 === 0 ? secondary : primary, width: 2, alpha: 0.55 }),
        target
          .moveTo(x + Math.cos(angle) * tread, y + Math.sin(angle) * tread * 0.4)
          .lineTo(x + Math.cos(angle) * tread, y + Math.sin(angle) * tread * 0.4 - radius * 0.055)
          .stroke({ color: primary, width: 1, alpha: 0.35 }));
    }
    target
      .moveTo(0, radius * 0.45)
      .lineTo(0, -radius * 0.35)
      .stroke({ color: primary, width: 2, alpha: 0.3 });
  },
  drawWaterfallLines = ({ target, radius, seed, primary, secondary }) => {
    for (let i = 0; i < 9; i += 1) {
      const x =
          -radius * 0.5 + (i / 8) * radius + (sonnetHash01(seed, i, 491) - 0.5) * radius * 0.05,
        topY = -radius * 0.6 + sonnetHash01(seed, i, 499) * radius * 0.15,
        len = radius * (0.55 + sonnetHash01(seed, i, 503) * 0.35);
      target
        .moveTo(x, topY)
        .lineTo(x, topY + len)
        .stroke({
          color: i % 3 === 0 ? secondary : primary,
          width: i % 3 === 0 ? 2 : 1,
          alpha: 0.4 + (i % 3) * 0.08,
        });
    }
    for (let i = 0; i < 5; i += 1) {
      const x = -radius * 0.4 + i * radius * 0.2;
      target
        .arc(x, radius * 0.5, radius * 0.07, Math.PI, TAU)
        .stroke({ color: secondary, width: 1, alpha: 0.4 });
    }
  },
  drawPinwheel = ({ target, radius, seed, primary, secondary }) => {
    const hubR = radius * 0.05;
    for (let blade = 0; blade < 4; blade += 1) {
      const angle = (blade / 4) * TAU + sonnetHash01(seed, 0, 509) * 0.5,
        tipR = radius * 0.5,
        tx = Math.cos(angle) * tipR,
        ty = Math.sin(angle) * tipR,
        edgeAngle = angle + 0.7;
      (target
        .moveTo(Math.cos(angle) * hubR, Math.sin(angle) * hubR)
        .quadraticCurveTo(
          Math.cos(edgeAngle) * tipR * 0.55,
          Math.sin(edgeAngle) * tipR * 0.55,
          tx,
          ty
        )
        .stroke({ color: blade % 2 === 0 ? primary : secondary, width: 2, alpha: 0.55 }),
        target
          .moveTo(tx, ty)
          .lineTo(Math.cos(angle + 0.45) * tipR * 0.62, Math.sin(angle + 0.45) * tipR * 0.62)
          .stroke({ color: blade % 2 === 0 ? primary : secondary, width: 1.5, alpha: 0.4 }));
    }
    (target.circle(0, 0, hubR).fill({ color: secondary, alpha: 0.8 }),
      target.circle(0, 0, radius * 0.56).stroke({ color: primary, width: 1, alpha: 0.15 }));
  },
  drawRippleDrop = ({ target, radius, seed, primary, secondary }) => {
    const dx = (sonnetHash01(seed, 0, 521) - 0.5) * radius * 0.2;
    (target.moveTo(dx, -radius * 0.52),
      target.bezierCurveTo(
        dx + radius * 0.07,
        -radius * 0.36,
        dx + radius * 0.06,
        -radius * 0.3,
        dx,
        -radius * 0.27
      ),
      target.bezierCurveTo(
        dx - radius * 0.06,
        -radius * 0.3,
        dx - radius * 0.07,
        -radius * 0.36,
        dx,
        -radius * 0.52
      ),
      target.stroke({ color: secondary, width: 2, alpha: 0.65 }));
    for (let ring = 0; ring < 4; ring += 1) {
      const r = radius * (0.14 + ring * 0.13),
        y = radius * 0.25,
        gapAt = sonnetHash01(seed, ring, 523) * TAU;
      target.arc(dx, y, r, gapAt, gapAt + TAU * 0.72).stroke({
        color: ring % 2 === 0 ? primary : secondary,
        width: ring === 0 ? 2 : 1,
        alpha: 0.5 - ring * 0.09,
      });
    }
    (target
      .moveTo(dx - radius * 0.05, radius * 0.2)
      .lineTo(dx - radius * 0.02, radius * 0.12)
      .stroke({ color: primary, width: 1.5, alpha: 0.5 }),
      target
        .moveTo(dx + radius * 0.05, radius * 0.2)
        .lineTo(dx + radius * 0.02, radius * 0.12)
        .stroke({ color: primary, width: 1.5, alpha: 0.5 }));
  },
  drawSuspensionBridge = ({ target, radius, width, height, seed, primary, secondary }) => {
    const bleed = resolveSonnetShotMgBleed(width, height, radius),
      deckY = radius * 0.3,
      towerX = radius * 0.34,
      towerTop = -radius * 0.28;
    target
      .moveTo(-bleed.x, deckY)
      .lineTo(bleed.x, deckY)
      .stroke({ color: primary, width: 2, alpha: 0.5 });
    for (const side of [-1, 1]) {
      const x = side * towerX;
      (target
        .moveTo(x - radius * 0.03, deckY)
        .lineTo(x - radius * 0.03, towerTop)
        .stroke({ color: primary, width: 2, alpha: 0.55 }),
        target
          .moveTo(x + radius * 0.03, deckY)
          .lineTo(x + radius * 0.03, towerTop)
          .stroke({ color: primary, width: 2, alpha: 0.55 }),
        target
          .moveTo(x - radius * 0.04, towerTop + radius * 0.08)
          .lineTo(x + radius * 0.04, towerTop + radius * 0.08)
          .stroke({ color: secondary, width: 1.5, alpha: 0.45 }));
    }
    (target
      .moveTo(-bleed.x, deckY - radius * 0.1)
      .quadraticCurveTo(-towerX, towerTop - radius * 0.06, -towerX, towerTop)
      .stroke({ color: secondary, width: 1.5, alpha: 0.5 }),
      target
        .moveTo(-towerX, towerTop)
        .quadraticCurveTo(0, deckY - radius * 0.04, towerX, towerTop)
        .stroke({ color: secondary, width: 1.5, alpha: 0.5 }),
      target
        .moveTo(towerX, towerTop)
        .quadraticCurveTo(bleed.x, deckY - radius * 0.1, bleed.x, deckY - radius * 0.06)
        .stroke({ color: secondary, width: 1.5, alpha: 0.5 }));
    for (let i = 1; i < 7; i += 1) {
      const t = i / 7,
        x = -towerX + t * towerX * 2,
        cableY =
          (1 - t) * (1 - t) * towerTop +
          2 * (1 - t) * t * (deckY - radius * 0.04) +
          t * t * towerTop;
      target.moveTo(x, cableY).lineTo(x, deckY).stroke({ color: primary, width: 1, alpha: 0.35 });
    }
  },
  drawFieldLines = ({ target, radius, seed, primary, secondary }) => {
    const poleGap = radius * 0.2;
    for (let loop = 0; loop < 4; loop += 1) {
      const bulge = radius * (0.2 + loop * 0.16);
      for (const mirror of [-1, 1])
        (target.moveTo(0, -poleGap),
          target.bezierCurveTo(
            mirror * bulge,
            -poleGap - radius * 0.1,
            mirror * bulge,
            poleGap + radius * 0.1,
            0,
            poleGap
          ),
          target.stroke({
            color: loop % 2 === 0 ? primary : secondary,
            width: loop === 0 ? 2 : 1,
            alpha: 0.5 - loop * 0.08,
          }));
    }
    (target.circle(0, -poleGap, radius * 0.04).fill({ color: secondary, alpha: 0.85 }),
      target.circle(0, poleGap, radius * 0.04).fill({ color: primary, alpha: 0.85 }),
      target
        .moveTo(-radius * 0.1, -poleGap)
        .lineTo(radius * 0.1, -poleGap)
        .stroke({ color: secondary, width: 1.5, alpha: 0.5 }),
      target
        .moveTo(-radius * 0.1, poleGap)
        .lineTo(radius * 0.1, poleGap)
        .stroke({ color: primary, width: 1.5, alpha: 0.5 }));
  },
  drawPrismBeam = ({ target, radius, width, height, seed, primary, secondary }) => {
    const bleed = resolveSonnetShotMgBleed(width, height, radius),
      s = radius * 0.24,
      topY = -s * 0.7,
      baseY = s * 0.55;
    (target
      .moveTo(0, topY)
      .lineTo(s * 0.8, baseY)
      .lineTo(-s * 0.8, baseY)
      .lineTo(0, topY)
      .stroke({ color: primary, width: 2, alpha: 0.6 }),
      target
        .moveTo(0, topY)
        .lineTo(s * 0.8, baseY)
        .lineTo(-s * 0.8, baseY)
        .lineTo(0, topY)
        .fill({ color: primary, alpha: 0.06 }));
    const entryX = -s * 0.35,
      entryY = s * 0.05;
    target
      .moveTo(-bleed.x, entryY + radius * 0.12)
      .lineTo(entryX, entryY)
      .stroke({ color: secondary, width: 2.5, alpha: 0.6 });
    for (let ray = 0; ray < 4; ray += 1) {
      const exitY = -radius * 0.1 + ray * radius * 0.09;
      target
        .moveTo(s * 0.4, entryY - radius * 0.05)
        .lineTo(bleed.x, exitY)
        .stroke({ color: ray === 1 ? secondary : primary, width: 1.5, alpha: 0.45 - ray * 0.05 });
    }
  },
  drawEchoArcs = ({ target, radius, seed, primary, secondary }) => {
    for (let hop = 0; hop < 5; hop += 1) {
      const side = hop % 2 === 0 ? -1 : 1,
        cx = side * radius * 0.52,
        cy = -radius * 0.35 + hop * radius * 0.18,
        r = radius * (0.14 + hop * 0.045);
      (target
        .arc(
          cx,
          cy,
          r,
          side < 0 ? -Math.PI / 2 : Math.PI / 2,
          side < 0 ? Math.PI / 2 : Math.PI * 1.5
        )
        .stroke({
          color: hop % 2 === 0 ? primary : secondary,
          width: 2 - hop * 0.2,
          alpha: 0.55 - hop * 0.07,
        }),
        target
          .circle(cx + (side < 0 ? r : -r) * 0.4, cy + r * 0.6, 1.8)
          .fill({ color: secondary, alpha: 0.5 }));
    }
  },
  drawKiteString = ({ target, radius, seed, primary, secondary }) => {
    const kx = radius * 0.22 * (seed % 2 === 0 ? 1 : -1),
      ky = -radius * 0.3,
      kw = radius * 0.16,
      kh = radius * 0.22;
    (target
      .moveTo(kx, ky - kh)
      .lineTo(kx + kw, ky)
      .lineTo(kx, ky + kh)
      .lineTo(kx - kw, ky)
      .lineTo(kx, ky - kh)
      .stroke({ color: primary, width: 2, alpha: 0.6 }),
      target
        .moveTo(kx, ky - kh)
        .lineTo(kx, ky + kh)
        .stroke({ color: secondary, width: 1, alpha: 0.4 }),
      target
        .moveTo(kx - kw, ky)
        .lineTo(kx + kw, ky)
        .stroke({ color: secondary, width: 1, alpha: 0.4 }),
      target
        .moveTo(kx, ky - kh)
        .lineTo(kx + kw, ky)
        .lineTo(kx, ky + kh)
        .lineTo(kx - kw, ky)
        .lineTo(kx, ky - kh)
        .fill({ color: primary, alpha: 0.06 }));
    const bows = [];
    target.moveTo(kx, ky + kh);
    const stringSteps = 24;
    for (let i = 1; i <= stringSteps; i += 1) {
      const t = i / stringSteps,
        x = kx - t * radius * 0.5 + Math.sin(t * Math.PI * 2.2) * radius * 0.08,
        y = ky + kh + t * radius * 0.6;
      (target.lineTo(x, y), (i === 7 || i === 13 || i === 19) && bows.push({ x, y }));
    }
    (target.stroke({ color: primary, width: 1.5, alpha: 0.5 }),
      bows.forEach(({ x, y }) => {
        const bowS = radius * 0.035;
        target
          .moveTo(x, y)
          .lineTo(x - bowS, y - bowS)
          .lineTo(x, y - bowS * 0.3)
          .lineTo(x + bowS, y - bowS)
          .lineTo(x, y)
          .stroke({ color: secondary, width: 1, alpha: 0.55 });
      }));
  },
  SONNET_KINETIC_DRAWERS = [
    drawPendulumWave,
    drawDominoArc,
    drawGearCluster,
    drawCircuitDelta,
    drawSignalTower,
    drawSpiralStair,
    drawWaterfallLines,
    drawPinwheel,
    drawRippleDrop,
    drawSuspensionBridge,
    drawFieldLines,
    drawPrismBeam,
    drawEchoArcs,
    drawKiteString,
  ];
export { SONNET_KINETIC_DRAWERS, SONNET_KINETIC_GEO_VARIANTS };
