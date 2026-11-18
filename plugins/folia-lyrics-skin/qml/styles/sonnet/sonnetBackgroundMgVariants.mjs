// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty,
  __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty,
  __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
      : (obj[key] = value),
  __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  },
  __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
import { mixSonnetSeed } from './sonnetRandom.mjs';
const SONNET_BACKGROUND_MG_VARIANT_COUNT = 8,
  SONNET_BACKGROUND_MG_VARIANTS = [
    'classic-cross',
    'corner-brackets',
    'marquee-strips',
    'diagonal-corners',
    'dotted-columns',
    'double-frame',
    'ruler-frame',
    'arc-gauge',
  ],
  resolveSonnetBackgroundMgVariant = (seed) =>
    mixSonnetSeed(seed, 2654435769) % SONNET_BACKGROUND_MG_VARIANT_COUNT,
  withFrame = (options) =>
    __spreadProps(__spreadValues({}, options), {
      hw: options.width / 2,
      hh: options.height / 2,
      marginX: options.width * 0.05,
      marginY: options.height * 0.05,
    }),
  drawCross = (target, x, y, size, color, alpha = 0.5) => {
    (target
      .moveTo(x - size, y - size)
      .lineTo(x + size, y + size)
      .stroke({ color, width: 1, alpha }),
      target
        .moveTo(x + size, y - size)
        .lineTo(x - size, y + size)
        .stroke({ color, width: 1, alpha }));
  },
  drawClassicCross = (context) => {
    const { target, hw, hh, marginX, marginY, primary, secondary } = context,
      size = 4;
    (drawCross(target, -hw + marginX, -hh + marginY, size, primary, 0.4),
      drawCross(target, hw - marginX, -hh + marginY, size, primary, 0.4),
      drawCross(target, -hw + marginX, hh - marginY, size, primary, 0.4),
      drawCross(target, hw - marginX, hh - marginY, size, primary, 0.4));
    for (let i = 0; i < 8; i += 1)
      drawCross(target, -hw + marginX, -hh + marginY + i * 20 + 30, 3, primary, 0.3);
    const barY = hh - marginY - 10;
    (target
      .moveTo(-hw + marginX + 20, barY)
      .lineTo(hw - marginX - 20, barY)
      .stroke({ color: primary, width: 1, alpha: 0.3 }),
      drawCross(target, -hw + marginX + 10, barY, 3, primary, 0.5),
      drawCross(target, -hw + marginX + 30, barY, 3, primary, 0.5),
      drawCross(target, hw - marginX - 10, barY, 3, primary, 0.5),
      target.circle(0, barY, 2).fill({ color: secondary, alpha: 0.8 }));
  },
  drawCornerBrackets = (context) => {
    const { target, hw, hh, marginX, marginY, primary, secondary, seed } = context,
      arm = Math.min(hw, hh) * 0.08,
      inset = 6;
    [
      [-hw + marginX, -hh + marginY, 1, 1],
      [hw - marginX, -hh + marginY, -1, 1],
      [-hw + marginX, hh - marginY, 1, -1],
      [hw - marginX, hh - marginY, -1, -1],
    ].forEach(([cx, cy, sx, sy], index) => {
      (target
        .moveTo(cx + sx * arm, cy)
        .lineTo(cx, cy)
        .lineTo(cx, cy + sy * arm)
        .stroke({ color: primary, width: 2, alpha: 0.55 }),
        target
          .moveTo(cx + sx * (arm + inset), cy + sy * inset)
          .lineTo(cx + sx * inset, cy + sy * inset)
          .lineTo(cx + sx * inset, cy + sy * (arm + inset))
          .stroke({ color: primary, width: 1, alpha: 0.25 }),
        index % 2 === 0 &&
          target
            .rect(cx + sx * arm * 0.4 - 2, cy + sy * arm * 0.4 - 2, 4, 4)
            .fill({ color: secondary, alpha: 0.6 }));
    });
    const rulerY = hh - marginY + inset;
    target
      .moveTo(-hw + marginX + arm + 12, rulerY)
      .lineTo(hw - marginX - arm - 12, rulerY)
      .stroke({ color: primary, width: 1, alpha: 0.3 });
    const ticks = 24,
      span = (hw - marginX - arm - 12) * 2;
    for (let i = 0; i <= ticks; i += 1) {
      const x = -hw + marginX + arm + 12 + (span * i) / ticks,
        long = i % 6 === 0;
      target
        .moveTo(x, rulerY)
        .lineTo(x, rulerY - (long ? 8 : 4))
        .stroke({ color: long ? secondary : primary, width: 1, alpha: long ? 0.55 : 0.3 });
    }
    for (let i = 0; i < 5; i += 1) {
      const y = -hh + marginY + arm + 14 + (i * ((hh - marginY - arm - 14) * 2)) / 5;
      (target.circle(-hw + marginX - 4, y, 1.5).fill({ color: primary, alpha: 0.35 }),
        target.circle(hw - marginX + 4, y + (seed % 7), 1.5).fill({ color: primary, alpha: 0.35 }));
    }
  },
  drawMarqueeStrips = (context) => {
    const { target, hw, hh, marginX, marginY, primary, secondary } = context,
      left = -hw + marginX,
      right = hw - marginX;
    ([-1, 1].forEach((direction) => {
      const stripY = hh - marginY,
        y = direction * stripY;
      (target.moveTo(left, y).lineTo(right, y).stroke({ color: primary, width: 2, alpha: 0.45 }),
        target
          .moveTo(left, y + direction * 6)
          .lineTo(right, y + direction * 6)
          .stroke({ color: primary, width: 1, alpha: 0.2 }),
        target.rect(left, y - 3, 14, 6).fill({ color: secondary, alpha: 0.55 }),
        target.rect(right - 14, y - 3, 14, 6).fill({ color: secondary, alpha: 0.55 }));
      const ticks = 18;
      for (let i = 1; i < ticks; i += 1) {
        const x = left + ((right - left) * i) / ticks;
        i % 3 === 0 &&
          target
            .moveTo(x, y)
            .lineTo(x, y + direction * 6)
            .stroke({ color: primary, width: 1, alpha: 0.35 });
      }
    }),
      drawCross(target, 0, -hh + marginY, 4, primary, 0.5),
      target
        .moveTo(-6, hh - marginY - 14)
        .lineTo(0, hh - marginY - 8)
        .lineTo(6, hh - marginY - 14)
        .stroke({ color: secondary, width: 1, alpha: 0.6 }));
  },
  drawDiagonalCorners = (context) => {
    const { target, hw, hh, marginX, marginY, primary, secondary } = context,
      corner = Math.min(hw, hh) * 0.12;
    [
      [-hw + marginX, -hh + marginY, 1, 1],
      [hw - marginX, -hh + marginY, -1, 1],
      [-hw + marginX, hh - marginY, 1, -1],
      [hw - marginX, hh - marginY, -1, -1],
    ].forEach(([cx, cy, sx, sy], index) => {
      (target
        .moveTo(cx + sx * corner, cy)
        .lineTo(cx, cy)
        .lineTo(cx, cy + sy * corner)
        .lineTo(cx + sx * corner, cy)
        .stroke({ color: primary, width: 1.5, alpha: 0.5 }),
        target
          .moveTo(cx + sx * corner * 0.55, cy)
          .lineTo(cx, cy + sy * corner * 0.55)
          .stroke({ color: index % 2 === 0 ? secondary : primary, width: 1, alpha: 0.4 }),
        target
          .moveTo(cx + sx * corner * 0.3, cy)
          .lineTo(cx, cy + sy * corner * 0.3)
          .stroke({ color: primary, width: 1, alpha: 0.25 }));
    });
    const barY = hh - marginY - 12;
    target
      .moveTo(-hw + marginX + corner + 10, barY)
      .lineTo(hw - marginX - corner - 10, barY)
      .stroke({ color: primary, width: 1, alpha: 0.3 });
    for (let i = 0; i < 5; i += 1) {
      const x = -hw + marginX + corner + 30 + i * 26,
        s = i === 2 ? 5 : 3;
      target
        .moveTo(x, barY - s)
        .lineTo(x + s, barY)
        .lineTo(x, barY + s)
        .lineTo(x - s, barY)
        .lineTo(x, barY - s)
        .stroke({ color: i === 2 ? secondary : primary, width: 1, alpha: 0.55 });
    }
  },
  drawDottedColumns = (context) => {
    const { target, hw, hh, marginX, marginY, primary, secondary } = context,
      rows = 14;
    for (let i = 0; i < rows; i += 1) {
      const y = -hh + marginY + 10 + (i * ((hh - marginY - 10) * 2)) / (rows - 1),
        strong = i % 4 === 0;
      (target
        .circle(-hw + marginX, y, strong ? 2.4 : 1.4)
        .fill({ color: strong ? secondary : primary, alpha: strong ? 0.6 : 0.3 }),
        target
          .circle(hw - marginX, y, strong ? 2.4 : 1.4)
          .fill({ color: strong ? secondary : primary, alpha: strong ? 0.6 : 0.3 }));
    }
    (target.moveTo(-18, 0).lineTo(18, 0).stroke({ color: primary, width: 1, alpha: 0.22 }),
      target.moveTo(0, -18).lineTo(0, 18).stroke({ color: primary, width: 1, alpha: 0.22 }),
      target.circle(0, 0, 6).stroke({ color: primary, width: 1, alpha: 0.3 }));
    const barY = hh - marginY - 8;
    (target
      .moveTo(-hw + marginX + 16, barY)
      .lineTo(hw - marginX - 16, barY)
      .stroke({ color: primary, width: 1, alpha: 0.3 }),
      drawCross(target, -hw + marginX + 8, barY, 3, primary, 0.5),
      drawCross(target, hw - marginX - 8, barY, 3, primary, 0.5));
  },
  drawDoubleFrame = (context) => {
    const { target, hw, hh, marginX, marginY, primary, secondary } = context,
      left = -hw + marginX,
      right = hw - marginX,
      top = -hh + marginY,
      bottom = hh - marginY,
      gapX = (right - left) * 0.18,
      gapY = (bottom - top) * 0.22,
      cx = (left + right) / 2,
      cy = (top + bottom) / 2;
    (target
      .moveTo(left, top)
      .lineTo(cx - gapX / 2, top)
      .stroke({ color: primary, width: 2, alpha: 0.45 }),
      target
        .moveTo(cx + gapX / 2, top)
        .lineTo(right, top)
        .stroke({ color: primary, width: 2, alpha: 0.45 }),
      target
        .moveTo(left, bottom)
        .lineTo(cx - gapX / 2, bottom)
        .stroke({ color: primary, width: 2, alpha: 0.45 }),
      target
        .moveTo(cx + gapX / 2, bottom)
        .lineTo(right, bottom)
        .stroke({ color: primary, width: 2, alpha: 0.45 }),
      target
        .moveTo(left, top)
        .lineTo(left, cy - gapY / 2)
        .stroke({ color: primary, width: 2, alpha: 0.45 }),
      target
        .moveTo(left, cy + gapY / 2)
        .lineTo(left, bottom)
        .stroke({ color: primary, width: 2, alpha: 0.45 }),
      target
        .moveTo(right, top)
        .lineTo(right, cy - gapY / 2)
        .stroke({ color: primary, width: 2, alpha: 0.45 }),
      target
        .moveTo(right, cy + gapY / 2)
        .lineTo(right, bottom)
        .stroke({ color: primary, width: 2, alpha: 0.45 }));
    const inset = 7;
    (target
      .rect(left + inset, top + inset, right - left - inset * 2, bottom - top - inset * 2)
      .stroke({ color: primary, width: 1, alpha: 0.18 }),
      [
        [left, top],
        [right, top],
        [left, bottom],
        [right, bottom],
      ].forEach(([x, y], index) => {
        target
          .rect(x - 3, y - 3, 6, 6)
          .fill({ color: index % 2 === 0 ? secondary : primary, alpha: 0.6 });
      }),
      target
        .moveTo(cx - 5, top)
        .lineTo(cx + 5, top)
        .stroke({ color: secondary, width: 3, alpha: 0.5 }),
      target
        .moveTo(cx - 5, bottom)
        .lineTo(cx + 5, bottom)
        .stroke({ color: secondary, width: 3, alpha: 0.5 }));
  },
  drawRulerFrame = (context) => {
    const { target, hw, hh, marginX, marginY, primary, secondary } = context,
      left = -hw + marginX,
      right = hw - marginX,
      top = -hh + marginY,
      bottom = hh - marginY,
      xTicks = 32,
      yTicks = 18;
    for (let i = 0; i <= xTicks; i += 1) {
      const x = left + ((right - left) * i) / xTicks,
        major = i % 8 === 0,
        mid = i % 4 === 0,
        len = major ? 12 : mid ? 7 : 4,
        color = major ? secondary : primary;
      (target
        .moveTo(x, top)
        .lineTo(x, top + len)
        .stroke({ color, width: 1, alpha: major ? 0.55 : 0.32 }),
        target
          .moveTo(x, bottom)
          .lineTo(x, bottom - len)
          .stroke({ color, width: 1, alpha: major ? 0.55 : 0.32 }));
    }
    for (let i = 0; i <= yTicks; i += 1) {
      const y = top + ((bottom - top) * i) / yTicks,
        major = i % 6 === 0,
        len = major ? 12 : i % 3 === 0 ? 7 : 4,
        color = major ? secondary : primary;
      (target
        .moveTo(left, y)
        .lineTo(left + len, y)
        .stroke({ color, width: 1, alpha: major ? 0.55 : 0.32 }),
        target
          .moveTo(right, y)
          .lineTo(right - len, y)
          .stroke({ color, width: 1, alpha: major ? 0.55 : 0.32 }));
    }
    (target.circle(0, 0, 10).stroke({ color: primary, width: 1, alpha: 0.25 }),
      target.circle(0, 0, 3).fill({ color: secondary, alpha: 0.4 }));
  },
  drawArcGauge = (context) => {
    const { target, hw, hh, marginX, marginY, primary, secondary, seed } = context,
      arcR = Math.min(hw, hh) * 0.11,
      corners = [
        [-hw + marginX, -hh + marginY, 0, Math.PI / 2],
        [hw - marginX, -hh + marginY, Math.PI / 2, Math.PI],
        [hw - marginX, hh - marginY, Math.PI, Math.PI * 1.5],
        [-hw + marginX, hh - marginY, Math.PI * 1.5, Math.PI * 2],
      ],
      arcFrom = (cx, cy, r, start, end) =>
        target
          .moveTo(cx + Math.cos(start) * r, cy + Math.sin(start) * r)
          .arc(cx, cy, r, start, end);
    (corners.forEach(([cx, cy, start, end], index) => {
      (arcFrom(cx, cy, arcR, start, end).stroke({ color: primary, width: 2, alpha: 0.5 }),
        arcFrom(cx, cy, arcR * 0.72, start, end).stroke({ color: primary, width: 1, alpha: 0.25 }));
      const mid = (start + end) / 2;
      target
        .circle(cx + Math.cos(mid) * arcR, cy + Math.sin(mid) * arcR, 2)
        .fill({ color: index % 2 === 0 ? secondary : primary, alpha: 0.6 });
    }),
      target.circle(0, -hh + marginY, 2).fill({ color: primary, alpha: 0.45 }),
      target.circle(-hw + marginX, 0, 2).fill({ color: primary, alpha: 0.45 }),
      target.circle(hw - marginX, 0, 2).fill({ color: primary, alpha: 0.45 }));
    const gaugeY = hh - marginY + arcR * 0.4,
      gaugeR = Math.min(hw, hh) * 0.16;
    arcFrom(0, gaugeY, gaugeR, Math.PI, Math.PI * 2).stroke({
      color: primary,
      width: 1.5,
      alpha: 0.4,
    });
    for (let i = 0; i <= 8; i += 1) {
      const angle = Math.PI + (i / 8) * Math.PI;
      target
        .moveTo(Math.cos(angle) * (gaugeR - 5), gaugeY + Math.sin(angle) * (gaugeR - 5))
        .lineTo(Math.cos(angle) * gaugeR, gaugeY + Math.sin(angle) * gaugeR)
        .stroke({ color: i % 4 === 0 ? secondary : primary, width: 1, alpha: 0.45 });
    }
    const needle = Math.PI + ((seed % 100) / 100) * Math.PI;
    (target
      .moveTo(0, gaugeY)
      .lineTo(Math.cos(needle) * (gaugeR - 8), gaugeY + Math.sin(needle) * (gaugeR - 8))
      .stroke({ color: secondary, width: 2, alpha: 0.6 }),
      target.circle(0, gaugeY, 2.5).fill({ color: primary, alpha: 0.7 }));
  },
  drawSonnetBackgroundMgHud = (options) => {
    const context = withFrame(options);
    switch (options.variant % SONNET_BACKGROUND_MG_VARIANT_COUNT) {
      case 1:
        drawCornerBrackets(context);
        return;
      case 2:
        drawMarqueeStrips(context);
        return;
      case 3:
        drawDiagonalCorners(context);
        return;
      case 4:
        drawDottedColumns(context);
        return;
      case 5:
        drawDoubleFrame(context);
        return;
      case 6:
        drawRulerFrame(context);
        return;
      case 7:
        drawArcGauge(context);
        return;
      default:
        drawClassicCross(context);
    }
  };
export {
  SONNET_BACKGROUND_MG_VARIANTS,
  SONNET_BACKGROUND_MG_VARIANT_COUNT,
  drawSonnetBackgroundMgHud,
  resolveSonnetBackgroundMgVariant,
};
