// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/tuningDefinition.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  Intl,
} from '../../../../environment.mjs';
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
const modNumber = (min, max, step) =>
  step === void 0 ? { type: 'number', min, max } : { type: 'number', min, max, step };
const MOD_SWITCH = { type: 'boolean' };
const modChoice = (options) => ({ type: 'choice', options });
const numberWithin = (value, fallback, min, max) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
const defineVisualizerTuning = (definition) =>
  __spreadProps(__spreadValues({}, definition), {
    read: (bundle) => {
      var _a;
      return (_a = bundle == null ? void 0 : bundle[definition.mode]) != null
        ? _a
        : definition.defaults;
    },
  });
const defineBackgroundTuning = (definition) => definition;
export {
  MOD_SWITCH,
  defineBackgroundTuning,
  defineVisualizerTuning,
  modChoice,
  modNumber,
  numberWithin,
};
