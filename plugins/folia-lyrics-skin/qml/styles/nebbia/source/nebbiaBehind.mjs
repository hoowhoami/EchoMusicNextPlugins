// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaBehind.ts
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
import { BEAT_EFFECT_IDS } from './_shared/services/beatFx/beatEffects.mjs';
import nebbiaTuning from './tuning.mjs';
const nebbiaSeesThrough = (tuning, background, isPreview = false) =>
  tuning.behind === 'backdrop' ||
  (!isPreview && Boolean(background == null ? void 0 : background.transparent));
const nebbiaBackgroundConfig = (props) =>
  nebbiaSeesThrough(
    nebbiaTuning.read(props.visualizerTunings),
    props.background,
    props.isPreviewMode,
  )
    ? props.background
    : __spreadProps(__spreadValues({}, props.background), { transparent: true });
const nebbiaShowsBackground = (tunings) => nebbiaSeesThrough(nebbiaTuning.read(tunings), void 0);
const nebbiaBeatEffectOnScreen = (effectId, tunings) => {
  const tuning = nebbiaTuning.read(tunings);
  const aquarium = tuning.behind === 'aquarium';
  if (effectId === BEAT_EFFECT_IDS.nebbiaAquaBeat) return aquarium;
  if (effectId === BEAT_EFFECT_IDS.nebbiaDrizzleRide) return !aquarium || tuning.glass === 'rain';
  return true;
};
export {
  nebbiaBackgroundConfig,
  nebbiaBeatEffectOnScreen,
  nebbiaSeesThrough,
  nebbiaShowsBackground,
};
