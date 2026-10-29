// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
const freePlacements = (random, region, nextAlpha) => {
  const placement = (upper, alpha) => {
    const angle = upper ? Math.PI * (1.12 + random() * 0.76) : Math.PI * (0.12 + random() * 0.76);
    const rx = region.w * (0.24 + random() * 0.22);
    const ry = region.h * (0.3 + random() * 0.18);
    const vertical = random() < 0.5;
    return {
      dx: Math.cos(angle) * rx,
      dy: Math.sin(angle) * ry,
      scale: 0.5 + random() * 0.2,
      alpha,
      orient: vertical ? 1 : 0,
      rotation: (random() - 0.5) * (vertical ? 0.3 : 0.7),
      wrap: 0,
    };
  };
  const farther = (slot) =>
    __spreadProps(__spreadValues({}, slot), {
      dx: slot.dx * 1.45,
      dy: slot.dy * 1.45,
      scale: slot.scale * 0.85,
      alpha: 0,
    });
  const previous = placement(true, 0.9);
  const next = placement(false, nextAlpha);
  return /* @__PURE__ */ new Map([
    [-1, previous],
    [1, next],
    [-2, farther(previous)],
    [2, farther(next)],
  ]);
};
const STACK_GAP = {
  vertical: { previous: 0.95, next: 0.88, farPrevious: 0.78, farNext: 0.7 },
  horizontal: { previous: 0.93, next: 0.735, farPrevious: 0.56, farNext: 0.56 },
};
const fixedSlot = (typography, relative, region, fontH, nextAlpha, across) => {
  const slot = (dx, dy, scale2, alpha2, orient2) => ({
    dx,
    dy,
    scale: scale2,
    alpha: alpha2,
    orient: orient2,
    rotation: 0,
    wrap: 0,
  });
  const vertical = typography === 'vertical';
  const orient = vertical ? 1 : 0;
  if (relative === 0) return slot(0, 0, 1, 1, orient);
  const previous = relative < 0;
  const far = Math.abs(relative) > 1;
  const nearScale = vertical ? 0.58 : 0.52;
  const scale = far ? (vertical ? 0.48 : 0.44) : nearScale;
  const gap = STACK_GAP[vertical ? 'vertical' : 'horizontal'];
  const sign = previous ? -1 : 1;
  let offset = across(0, 1) / 2 + (previous ? gap.previous : gap.next) * fontH;
  if (far) offset += across(sign, nearScale) + (previous ? gap.farPrevious : gap.farNext) * fontH;
  offset += across(relative, scale) / 2;
  const alpha = previous ? (far ? 0 : 0.9) : far ? 0 : nextAlpha;
  if (vertical) {
    return slot(-sign * offset, sign * (far ? 0.07 : 0.03), scale, alpha, orient);
  }
  return slot(sign * region.w * (far ? 0.24 : 0.16), sign * offset, scale, alpha, orient);
};
const CROSSED_CLEARANCE = 0.5;
const stackX = (kind) => (kind === 'vertical' ? 1 : 0);
const awayOf = (index, c, kind) =>
  (index === c ? 0 : index < c ? -1 : 1) * (kind === 'vertical' ? -1 : 1);
const sameSlot = (a, b) =>
  a.dx === b.dx &&
  a.dy === b.dy &&
  a.scale === b.scale &&
  a.alpha === b.alpha &&
  a.orient === b.orient &&
  a.rotation === b.rotation &&
  a.wrap === b.wrap;
export { CROSSED_CLEARANCE, awayOf, fixedSlot, freePlacements, sameSlot, stackX };
