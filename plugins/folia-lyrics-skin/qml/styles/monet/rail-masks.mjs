// Derived from Folia a8da4437 (AGPL-3.0-only). See monet-reference.md.
var __defProp = Object.defineProperty;
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
const getLineMask = (isClipped, fadePx) =>
  isClipped
    ? `linear-gradient(180deg, black 0%, black calc(100% - ${fadePx}px), transparent 100%)`
    : void 0;
const getClippedTextMask = (isClipped, contentBottomPx, fadePx) => {
  if (!isClipped) {
    return void 0;
  }
  const solidEndPx = Math.max(contentBottomPx - fadePx, 0);
  return `linear-gradient(180deg, black 0px, black ${solidEndPx}px, transparent ${contentBottomPx}px)`;
};
const getEdgeFadeMask = (isOverflowing, fadePx) =>
  isOverflowing
    ? `linear-gradient(90deg, black 0%, black calc(100% - ${fadePx}px), transparent 100%)`
    : void 0;
const composeLineMasks = (...masks) => {
  const layers = masks.filter((mask) => Boolean(mask));
  if (layers.length === 0) {
    return void 0;
  }
  return __spreadValues(
    {
      WebkitMaskImage: layers.join(', '),
      maskImage: layers.join(', '),
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      WebkitMaskSize: '100% 100%',
      maskSize: '100% 100%',
    },
    layers.length > 1 ? { WebkitMaskComposite: 'source-in', maskComposite: 'intersect' } : {}
  );
};
export { composeLineMasks, getClippedTextMask, getEdgeFadeMask, getLineMask };
