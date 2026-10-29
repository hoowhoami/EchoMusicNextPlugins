// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { sonnetHash01 } from './sonnetRandom.mjs';
import { resolveSonnetShotMgBleed } from './sonnetShotMgViewport.mjs';
const SONNET_MUSIC_GEO_VARIANTS = [
    'sound-wave',
    'vinyl-grooves',
    'equalizer-bloom',
    'note-arc',
    'tuning-fork',
    'piano-ribbon',
    'metronome',
    'staff-wave',
  ],
  TAU = Math.PI * 2,
  drawSoundWave = ({ target, radius, width, height, seed, primary, secondary }) => {
    const bleed = resolveSonnetShotMgBleed(width, height, radius),
      steps = 72,
      envelope = (t) =>
        Math.sin(t * Math.PI) * (0.4 + 0.6 * sonnetHash01(seed, Math.round(t * 12), 401));
    for (const mirror of [-1, 1]) {
      target.moveTo(-bleed.x, 0);
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps,
          x = -bleed.x + t * bleed.x * 2,
          y = mirror * Math.sin(t * TAU * 5 + seed * 0.13) * radius * 0.22 * envelope(t);
        target.lineTo(x, y);
      }
      target.stroke({
        color: mirror < 0 ? primary : secondary,
        width: mirror < 0 ? 2 : 1,
        alpha: 0.55,
      });
    }
    target.moveTo(-bleed.x, 0).lineTo(bleed.x, 0).stroke({ color: primary, width: 1, alpha: 0.18 });
  },
  drawVinylGrooves = ({ target, radius, seed, primary, secondary }) => {
    for (let groove = 0; groove < 7; groove += 1) {
      const r = radius * (0.2 + groove * 0.08),
        gapAt = sonnetHash01(seed, groove, 409) * TAU;
      target.arc(0, 0, r, gapAt, gapAt + TAU * 0.86).stroke({
        color: groove % 3 === 0 ? secondary : primary,
        width: groove % 3 === 0 ? 2 : 1,
        alpha: 0.3 + groove * 0.05,
      });
    }
    (target.circle(0, 0, radius * 0.12).stroke({ color: primary, width: 2, alpha: 0.6 }),
      target.circle(0, 0, radius * 0.03).fill({ color: secondary, alpha: 0.8 }));
    const pivotX = radius * 0.62,
      pivotY = -radius * 0.52;
    (target.circle(pivotX, pivotY, radius * 0.035).stroke({ color: primary, width: 2, alpha: 0.6 }),
      target
        .moveTo(pivotX, pivotY)
        .lineTo(radius * 0.18, -radius * 0.1)
        .stroke({ color: primary, width: 3, alpha: 0.5 }),
      target.circle(radius * 0.18, -radius * 0.1, 3).fill({ color: secondary, alpha: 0.8 }));
  },
  drawEqualizerBloom = ({ target, radius, seed, primary, secondary }) => {
    for (let i = 0; i < 17; i += 1) {
      const t = i / 16,
        x = -radius * 0.66 + t * radius * 1.32,
        arcY = radius * 0.5 - Math.sin(t * Math.PI) * radius * 0.12,
        h =
          radius * (0.08 + Math.sin(t * Math.PI) * 0.3 * (0.5 + sonnetHash01(seed, i, 419) * 0.8));
      (target
        .moveTo(x, arcY)
        .lineTo(x, arcY - h)
        .stroke({
          color: i % 4 === 0 ? secondary : primary,
          width: 3,
          alpha: 0.5 + Math.sin(t * Math.PI) * 0.25,
        }),
        target.circle(x, arcY - h - 4, 1.6).fill({ color: secondary, alpha: 0.55 }));
    }
  },
  drawNoteArc = ({ target, radius, seed, primary, secondary }) => {
    const headR = radius * 0.045,
      points = [];
    for (let i = 0; i < 5; i += 1) {
      const t = i / 4,
        x = -radius * 0.55 + t * radius * 1.1,
        y = radius * 0.22 - Math.sin(t * Math.PI * 0.9) * radius * 0.34;
      (points.push({ x, y }),
        target.circle(x, y, headR).fill({ color: i === 2 ? secondary : primary, alpha: 0.8 }),
        target
          .moveTo(x + headR, y)
          .lineTo(x + headR, y - radius * 0.16)
          .stroke({ color: i === 2 ? secondary : primary, width: 2, alpha: 0.65 }));
    }
    target.moveTo(points[0].x + headR, points[0].y - radius * 0.16);
    for (let i = 1; i < points.length; i += 1)
      target.lineTo(points[i].x + headR, points[i].y - radius * 0.16);
    (target.lineTo(points[4].x + radius * 0.12, points[4].y - radius * 0.13),
      target.stroke({ color: primary, width: 3, alpha: 0.5 }),
      target
        .moveTo(points[0].x + headR, points[0].y - radius * 0.16)
        .quadraticCurveTo(
          points[0].x + radius * 0.1,
          points[0].y - radius * 0.1,
          points[0].x + radius * 0.06,
          points[0].y - radius * 0.02
        )
        .stroke({ color: secondary, width: 1.5, alpha: 0.5 }));
  },
  drawTuningFork = ({ target, radius, seed, primary, secondary }) => {
    const fx = (seed % 2 === 0 ? -1 : 1) * radius * 0.08,
      topY = -radius * 0.4,
      prongW = radius * 0.05,
      prongGap = radius * 0.1,
      uY = radius * 0.02;
    (target
      .moveTo(fx - prongGap / 2 - prongW, topY)
      .lineTo(fx - prongGap / 2 - prongW, uY)
      .stroke({ color: primary, width: 2.5, alpha: 0.65 }),
      target
        .moveTo(fx + prongGap / 2 + prongW, topY)
        .lineTo(fx + prongGap / 2 + prongW, uY)
        .stroke({ color: primary, width: 2.5, alpha: 0.65 }),
      target
        .arc(fx, uY, prongGap / 2 + prongW, 0, Math.PI)
        .stroke({ color: primary, width: 2.5, alpha: 0.65 }),
      target
        .moveTo(fx, uY + prongGap / 2 + prongW)
        .lineTo(fx, radius * 0.42)
        .stroke({ color: primary, width: 3, alpha: 0.6 }),
      target
        .circle(fx, radius * 0.46, radius * 0.035)
        .stroke({ color: secondary, width: 2, alpha: 0.6 }));
    for (let side = -1; side <= 1; side += 2)
      for (let ring = 0; ring < 3; ring += 1) {
        const r = radius * (0.14 + ring * 0.1),
          cx = fx + side * radius * 0.06,
          cy = topY + radius * 0.1;
        target
          .arc(
            cx,
            cy,
            r,
            side < 0 ? Math.PI * 0.6 : -Math.PI * 0.4,
            side < 0 ? Math.PI * 1.4 : Math.PI * 0.4
          )
          .stroke({
            color: ring === 1 ? secondary : primary,
            width: 1.5,
            alpha: 0.42 - ring * 0.1,
          });
      }
  },
  drawPianoRibbon = ({ target, radius, width, height, seed, primary, secondary }) => {
    const bleed = resolveSonnetShotMgBleed(width, height, radius);
    target
      .moveTo(-bleed.x, radius * 0.18)
      .bezierCurveTo(
        -radius * 0.3,
        -radius * 0.05,
        radius * 0.3,
        radius * 0.3,
        bleed.x,
        radius * 0.05
      )
      .stroke({ color: primary, width: 1, alpha: 0.25 });
    const keys = 12;
    for (let i = 0; i < keys; i += 1) {
      const t = i / (keys - 1),
        x = -radius * 0.6 + t * radius * 1.2,
        baseY = radius * 0.18 + Math.sin(t * Math.PI) * -radius * 0.1 + t * -radius * 0.06,
        black = [1, 3, 6, 8, 10].includes(i % 12),
        len = radius * (black ? 0.14 : 0.24);
      target
        .moveTo(x, baseY)
        .lineTo(x, baseY - len)
        .stroke({
          color: black ? secondary : primary,
          width: black ? 4 : 3,
          alpha: black ? 0.7 : 0.45,
        });
    }
  },
  drawMetronome = ({ target, radius, seed, primary, secondary }) => {
    const baseY = radius * 0.4,
      topY = -radius * 0.36;
    (target
      .moveTo(0 - radius * 0.2, baseY)
      .lineTo(0 - radius * 0.06, topY)
      .stroke({ color: primary, width: 2, alpha: 0.6 }),
      target
        .moveTo(0 + radius * 0.2, baseY)
        .lineTo(0 + radius * 0.06, topY)
        .stroke({ color: primary, width: 2, alpha: 0.6 }),
      target
        .moveTo(0 - radius * 0.06, topY)
        .lineTo(0 + radius * 0.06, topY)
        .stroke({ color: primary, width: 2, alpha: 0.6 }));
    const tilt = (sonnetHash01(seed, 0, 431) - 0.5) * 0.9,
      pivotY = radius * 0.16,
      tipX = 0 + Math.sin(tilt) * radius * 0.5,
      tipY = pivotY - Math.cos(tilt) * radius * 0.5;
    (target.circle(0, pivotY, radius * 0.03).fill({ color: secondary, alpha: 0.85 }),
      target
        .moveTo(0, pivotY)
        .lineTo(tipX, tipY)
        .stroke({ color: secondary, width: 2, alpha: 0.7 }),
      target.rect(tipX - 4, tipY - 4, 8, 8).fill({ color: secondary, alpha: 0.7 }));
    for (let i = 0; i < 3; i += 1) {
      const r = radius * (0.24 + i * 0.12);
      target
        .arc(0, pivotY, r, -Math.PI / 2 - 0.5 - i * 0.1, -Math.PI / 2 + 0.5 + i * 0.1)
        .stroke({ color: primary, width: 1, alpha: 0.3 - i * 0.06 });
    }
  },
  drawStaffWave = ({ target, radius, width, height, seed, primary, secondary }) => {
    const bleed = resolveSonnetShotMgBleed(width, height, radius);
    for (let line = 0; line < 5; line += 1) {
      const y0 = -radius * 0.16 + line * radius * 0.08,
        lift = (line % 2 === 0 ? 1 : -1) * radius * 0.05;
      target
        .moveTo(-bleed.x, y0)
        .bezierCurveTo(-radius * 0.3, y0 + lift, radius * 0.3, y0 - lift, bleed.x, y0)
        .stroke({ color: primary, width: 1, alpha: 0.3 + (line === 2 ? 0.15 : 0) });
    }
    for (let i = 0; i < 4; i += 1) {
      const x =
          -radius * 0.45 + i * radius * 0.3 + (sonnetHash01(seed, i, 439) - 0.5) * radius * 0.08,
        y = -radius * 0.16 + Math.floor(sonnetHash01(seed, i, 443) * 5) * radius * 0.08;
      (target
        .circle(x, y, radius * 0.032)
        .fill({ color: i % 2 === 0 ? secondary : primary, alpha: 0.85 }),
        target
          .moveTo(x + radius * 0.032, y)
          .lineTo(x + radius * 0.032, y - radius * 0.14)
          .stroke({ color: i % 2 === 0 ? secondary : primary, width: 1.5, alpha: 0.6 }));
    }
  },
  SONNET_MUSIC_DRAWERS = [
    drawSoundWave,
    drawVinylGrooves,
    drawEqualizerBloom,
    drawNoteArc,
    drawTuningFork,
    drawPianoRibbon,
    drawMetronome,
    drawStaffWave,
  ];
export { SONNET_MUSIC_DRAWERS, SONNET_MUSIC_GEO_VARIANTS };
