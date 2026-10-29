// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
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
import { at } from './compat.mjs';
import { easeTemperaInOut, clamp01 } from './temperaMotion.mjs';
const IDLE_TEMPERA_TRANSITION_FRAME = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  alpha: 1,
  blur: 0,
  wipe: 0,
  wipeAngle: 0,
};
const resolveTemperaTransitionEffectFrame = (kind, phase, progress, flowAngle) => {
  const linear = clamp01(progress);
  const eased = easeTemperaInOut(linear);
  const flowX = Math.cos(flowAngle);
  const flowY = Math.sin(flowAngle);
  if (kind === 'block-wipe') {
    return __spreadProps(__spreadValues({}, IDLE_TEMPERA_TRANSITION_FRAME), {
      wipe: phase === 'exit' ? eased : 1 + eased,
      wipeAngle: flowAngle,
    });
  }
  if (kind === 'camera-pan') {
    const travel = 0.5;
    const offset = phase === 'exit' ? eased * travel : -(1 - eased) * travel;
    const alpha = phase === 'exit' ? 1 - clamp01((linear - 0.72) / 0.28) : clamp01(linear / 0.3);
    return __spreadProps(__spreadValues({}, IDLE_TEMPERA_TRANSITION_FRAME), {
      x: flowX * offset,
      y: flowY * offset,
      scale: 1 + (phase === 'exit' ? eased : 1 - eased) * 0.03,
      alpha,
      wipeAngle: flowAngle,
    });
  }
  const drift = (phase === 'exit' ? eased : eased - 1) * 0.09;
  const away = phase === 'exit' ? eased : 1 - eased;
  return __spreadProps(__spreadValues({}, IDLE_TEMPERA_TRANSITION_FRAME), {
    x: flowX * drift,
    y: flowY * drift,
    scale: 1 + away * 0.07,
    alpha: phase === 'exit' ? 1 - clamp01((linear - 0.55) / 0.45) : clamp01(linear / 0.45),
    blur: away * 6,
    wipeAngle: flowAngle,
  });
};
const resolveTemperaExitTransitionFrame = (paragraph, time, enabled) => {
  var _a, _b;
  const transition = paragraph.transitionOut;
  if (!enabled || !transition || time < transition.startTime) return IDLE_TEMPERA_TRANSITION_FRAME;
  const progress =
    (time - transition.startTime) / Math.max(transition.endTime - transition.startTime, 1e-3);
  const flowAngle =
    (_b = (_a = at(paragraph.shots, -1)) == null ? void 0 : _a.flowAngle) != null ? _b : 0;
  return resolveTemperaTransitionEffectFrame(transition.kind, 'exit', progress, flowAngle);
};
const resolveTemperaEnterTransitionFrame = (kind, timeSinceStart, duration, enabled, flowAngle) => {
  if (!enabled || !kind || timeSinceStart < 0 || timeSinceStart > duration) {
    return IDLE_TEMPERA_TRANSITION_FRAME;
  }
  return resolveTemperaTransitionEffectFrame(
    kind,
    'enter',
    timeSinceStart / Math.max(duration, 1e-3),
    flowAngle
  );
};
export {
  IDLE_TEMPERA_TRANSITION_FRAME,
  resolveTemperaEnterTransitionFrame,
  resolveTemperaExitTransitionFrame,
  resolveTemperaTransitionEffectFrame,
};
