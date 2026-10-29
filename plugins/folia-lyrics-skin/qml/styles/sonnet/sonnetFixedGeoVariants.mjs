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
import { AnimatedGraphics } from './sonnetAnimatedGraphics.mjs';
import { mixSonnetSeed } from './sonnetRandom.mjs';
const SONNET_FIXED_GEO_VARIANT_COUNT = 8,
  SONNET_FIXED_GEO_VARIANTS = [
    'classic-blocks',
    'twin-pillars',
    'disc-ring',
    'diamond-pair',
    'stripe-stack',
    'corner-els',
    'twin-wedges',
    'cross-ring',
  ],
  resolveSonnetFixedGeoVariant = (seed) =>
    mixSonnetSeed(seed, 2246822507) % SONNET_FIXED_GEO_VARIANT_COUNT,
  drawHatching = (pixi, primary, x, y, w, h, spacing, target) => {
    const hatch = new AnimatedGraphics(pixi);
    for (let i = -w; i < w + h; i += spacing)
      hatch
        .moveTo(x + i, y)
        .lineTo(x + i + h, y + h)
        .stroke({ color: primary, width: 1, alpha: 0.15 });
    const mask = new pixi.Graphics();
    return (
      mask.rect(x, y, w, h).fill({ color: 16777215 }),
      (hatch.mask = mask),
      target.addChild(hatch.display),
      target.addChild(mask),
      hatch
    );
  },
  addHatch = (context, x, y, w, h, spacing = 6) => {
    context.parts.push(
      drawHatching(context.pixi, context.primary, x, y, w, h, spacing, context.layer)
    );
  },
  drawClassicBlocks = (context) => {
    const { geo, radius: r, primary } = context;
    (geo.rect(-r * 0.4, -r * 0.2, r * 0.6, r * 0.15).fill({ color: primary, alpha: 0.7 }),
      geo
        .rect(-r * 0.1, r * 0.1, r * 0.5, r * 0.3)
        .stroke({ color: primary, width: 2, alpha: 0.6 }),
      addHatch(context, -r * 0.3, -r * 0.4, r * 0.4, r * 0.25));
  },
  drawTwinPillars = (context) => {
    const { geo, radius: r, primary, accent } = context;
    (geo.rect(-r * 0.34, -r * 0.28, r * 0.12, r * 0.56).fill({ color: accent, alpha: 0.65 }),
      geo
        .rect(-r * 0.34 + r * 0.035, -r * 0.28 + r * 0.035, r * 0.05, r * 0.49)
        .fill({ color: primary, alpha: 0.35 }),
      geo
        .rect(r * 0.06, -r * 0.34, r * 0.28, r * 0.68)
        .stroke({ color: primary, width: 2, alpha: 0.6 }),
      geo
        .rect(r * 0.06 + r * 0.04, -r * 0.34 + r * 0.04, r * 0.2, r * 0.6)
        .stroke({ color: primary, width: 1, alpha: 0.3 }),
      addHatch(context, -r * 0.14, -r * 0.2, r * 0.12, r * 0.4, 5));
  },
  drawDiscRing = (context) => {
    const { geo, radius: r, primary, accent } = context;
    (geo.circle(-r * 0.2, r * 0.12, r * 0.15).fill({ color: accent, alpha: 0.7 }),
      geo.circle(-r * 0.2, r * 0.12, r * 0.06).fill({ color: primary, alpha: 0.5 }),
      geo.circle(r * 0.14, -r * 0.06, r * 0.3).stroke({ color: primary, width: 2, alpha: 0.6 }),
      geo.circle(r * 0.14, -r * 0.06, r * 0.22).stroke({ color: primary, width: 1, alpha: 0.3 }),
      addHatch(context, r * 0.02, -r * 0.14, r * 0.24, r * 0.16, 5));
  },
  drawDiamondPair = (context) => {
    const { geo, radius: r, primary, accent, seed } = context,
      direction = seed % 2 === 0 ? 1 : -1,
      dr = r * 0.3,
      cx = -r * 0.08 * direction;
    (geo
      .moveTo(cx, -dr)
      .lineTo(cx + dr, 0)
      .lineTo(cx, dr)
      .lineTo(cx - dr, 0)
      .lineTo(cx, -dr)
      .stroke({ color: primary, width: 2, alpha: 0.6 }),
      geo
        .moveTo(cx, -dr * 0.7)
        .lineTo(cx + dr * 0.7, 0)
        .lineTo(cx, dr * 0.7)
        .lineTo(cx - dr * 0.7, 0)
        .lineTo(cx, -dr * 0.7)
        .stroke({ color: primary, width: 1, alpha: 0.3 }));
    const sr = r * 0.11,
      sx = r * 0.3 * direction,
      sy = -r * 0.2;
    (geo
      .moveTo(sx, sy - sr)
      .lineTo(sx + sr, sy)
      .lineTo(sx, sy + sr)
      .lineTo(sx - sr, sy)
      .lineTo(sx, sy - sr)
      .fill({ color: accent, alpha: 0.7 }),
      addHatch(context, sx - sr * 0.8, r * 0.16, sr * 1.6, sr * 1.2, 4));
  },
  drawStripeStack = (context) => {
    const { geo, radius: r, primary, accent, seed } = context,
      direction = seed % 2 === 0 ? 1 : -1;
    (geo
      .rect(-r * 0.36 * direction - r * 0.2, -r * 0.26, r * 0.56, r * 0.09)
      .fill({ color: accent, alpha: 0.7 }),
      geo
        .rect(-r * 0.28, -r * 0.06, r * 0.56, r * 0.16)
        .stroke({ color: primary, width: 2, alpha: 0.6 }),
      geo
        .rect(-r * 0.2 * direction, r * 0.2, r * 0.4, r * 0.045)
        .fill({ color: primary, alpha: 0.5 }),
      addHatch(context, r * 0.26 * direction, -r * 0.3, r * 0.12, r * 0.6, 5));
  },
  drawCornerEls = (context) => {
    const { geo, radius: r, primary, accent, seed } = context,
      direction = seed % 2 === 0 ? 1 : -1,
      arm = r * 0.24,
      thick = r * 0.07,
      x1 = -r * 0.3 * direction,
      y1 = -r * 0.24;
    (geo.rect(x1 - (direction < 0 ? arm : 0), y1, arm, thick).fill({ color: accent, alpha: 0.7 }),
      geo.rect(direction < 0 ? x1 - arm : x1, y1, thick, arm).fill({ color: accent, alpha: 0.7 }));
    const x2 = r * 0.3 * direction,
      y2 = r * 0.24;
    (geo
      .rect(direction < 0 ? x2 : x2 - arm, y2 - thick, arm, thick)
      .fill({ color: primary, alpha: 0.55 }),
      geo
        .rect(direction < 0 ? x2 + arm - thick : x2 - thick, y2 - arm, thick, arm)
        .fill({ color: primary, alpha: 0.55 }),
      geo
        .rect(-r * 0.13, -r * 0.13, r * 0.26, r * 0.26)
        .stroke({ color: primary, width: 2, alpha: 0.6 }),
      addHatch(context, -r * 0.09 * direction, r * 0.02, r * 0.16, r * 0.1, 4));
  },
  drawTwinWedges = (context) => {
    const { geo, radius: r, primary, accent, seed } = context,
      direction = seed % 2 === 0 ? 1 : -1,
      wx = -r * 0.14 * direction;
    geo
      .moveTo(wx, -r * 0.3)
      .lineTo(wx + r * 0.24, r * 0.02)
      .lineTo(wx - r * 0.24, r * 0.02)
      .lineTo(wx, -r * 0.3)
      .fill({ color: accent, alpha: 0.6 });
    const hx = r * 0.16 * direction;
    (geo
      .moveTo(hx, r * 0.3)
      .lineTo(hx + r * 0.24, -r * 0.02)
      .lineTo(hx - r * 0.24, -r * 0.02)
      .lineTo(hx, r * 0.3)
      .stroke({ color: primary, width: 2, alpha: 0.6 }),
      geo
        .moveTo(hx, r * 0.2)
        .lineTo(hx + r * 0.15, 0)
        .lineTo(hx - r * 0.15, 0)
        .lineTo(hx, r * 0.2)
        .stroke({ color: primary, width: 1, alpha: 0.3 }),
      addHatch(context, -r * 0.3 * direction - r * 0.05, r * 0.1, r * 0.2, r * 0.18, 5));
  },
  drawCrossRing = (context) => {
    const { geo, radius: r, primary, accent, seed } = context,
      cx = ((seed % 3) - 1) * r * 0.08,
      arm = r * 0.17,
      thick = r * 0.075;
    (geo.rect(cx - arm, -thick / 2, arm * 2, thick).fill({ color: accent, alpha: 0.7 }),
      geo.rect(cx - thick / 2, -arm, thick, arm * 2).fill({ color: accent, alpha: 0.7 }),
      geo.circle(cx, 0, r * 0.3).stroke({ color: primary, width: 2, alpha: 0.6 }),
      geo.circle(cx, 0, r * 0.36).stroke({ color: primary, width: 1, alpha: 0.25 }),
      addHatch(context, cx + r * 0.18, r * 0.14, r * 0.16, r * 0.16, 4));
  },
  buildSonnetFixedGeo = (options) => {
    const geo = new AnimatedGraphics(options.pixi),
      context = __spreadProps(__spreadValues({}, options), {
        geo,
        parts: [geo],
        accent: options.seed % 2 === 0 ? options.secondary : options.primary,
      });
    switch (
      (options.layer.addChild(geo.display), options.variant % SONNET_FIXED_GEO_VARIANT_COUNT)
    ) {
      case 1:
        drawTwinPillars(context);
        break;
      case 2:
        drawDiscRing(context);
        break;
      case 3:
        drawDiamondPair(context);
        break;
      case 4:
        drawStripeStack(context);
        break;
      case 5:
        drawCornerEls(context);
        break;
      case 6:
        drawTwinWedges(context);
        break;
      case 7:
        drawCrossRing(context);
        break;
      default:
        drawClassicBlocks(context);
    }
    return context.parts;
  };
export {
  SONNET_FIXED_GEO_VARIANTS,
  SONNET_FIXED_GEO_VARIANT_COUNT,
  buildSonnetFixedGeo,
  resolveSonnetFixedGeoVariant,
};
