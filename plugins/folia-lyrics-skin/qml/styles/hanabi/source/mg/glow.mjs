// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/mg/glow.ts
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
import { createBloomFilter } from '../../bloom.mjs';
const BASE = {
  strength: 1.1,
  threshold: 0.2,
  knee: 0.25,
  levels: 5,
  spread: 0.85,
  tint: [1, 0.96, 0.9],
};
const createHanabiGlow = (
  pixi,
  amount,
  quality = { resolution: null, levelDrop: 0 },
  padding = 48,
) => {
  var _a;
  const filter = createBloomFilter(
    pixi,
    __spreadProps(__spreadValues({}, BASE), {
      strength: BASE.strength * Math.max(0, amount),
      levels: Math.max(1, BASE.levels - quality.levelDrop),
      padding,
    }),
  );
  filter.resolution = (_a = quality.resolution) != null ? _a : 'inherit';
  return filter;
};
const setHanabiGlow = (filter, amount) => {
  filter.options.strength = BASE.strength * Math.max(0, amount);
};
export { createHanabiGlow, setHanabiGlow };
