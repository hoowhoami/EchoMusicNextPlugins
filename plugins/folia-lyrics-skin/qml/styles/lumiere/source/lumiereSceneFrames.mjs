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
import { findLumiereParagraphIndexAtTime } from './lumiereProgram.mjs';
import { LUMIERE_TRANSITIONS, resolveLumiereEnterDuration } from './lumiereTransitions.mjs';
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
const exitFrameOf = (program, index, time) => {
  var _a;
  const out = (_a = program.paragraphs[index]) == null ? void 0 : _a.transitionOut;
  if (!out || time < out.startTime) return { alpha: 1, scale: 1, blur: 0 };
  const progress = (time - out.startTime) / Math.max(out.endTime - out.startTime, 1e-3);
  const frame = LUMIERE_TRANSITIONS[out.kind].resolveFrame('exit', progress);
  return out.kind === 'lights-out' ? __spreadProps(__spreadValues({}, frame), { alpha: 1 }) : frame;
};
const resolveLumiereSceneFrames = (program, time, transitionsEnabled) => {
  if (program.paragraphs.length === 0) return { activeIndex: -1, layers: [] };
  const activeIndex = findLumiereParagraphIndexAtTime(program, time);
  if (!transitionsEnabled) {
    return { activeIndex, layers: [{ index: activeIndex, alpha: 1, scale: 1, blur: 0 }] };
  }
  const paragraph = program.paragraphs[activeIndex];
  const current = exitFrameOf(program, activeIndex, time);
  const layers = [];
  const previousOut = activeIndex > 0 ? program.paragraphs[activeIndex - 1].transitionOut : null;
  if (previousOut) {
    const enterDuration = resolveLumiereEnterDuration(
      previousOut.kind,
      previousOut.startTime,
      previousOut.endTime
    );
    const progress = (time - paragraph.startTime) / enterDuration;
    if (progress >= 0 && progress < 1) {
      const enter = LUMIERE_TRANSITIONS[previousOut.kind].resolveFrame('enter', progress);
      const weight = smooth(progress);
      const peak = exitFrameOf(program, activeIndex - 1, previousOut.endTime);
      if (peak.alpha * (1 - weight) > 2e-3) {
        layers.push({
          index: activeIndex - 1,
          alpha: peak.alpha * (1 - weight),
          scale: peak.scale,
          blur: peak.blur,
        });
      }
      layers.push({
        index: activeIndex,
        alpha: Math.min(enter.alpha, weight) * current.alpha,
        scale: enter.scale * current.scale,
        blur: Math.max(enter.blur, current.blur),
      });
      return { activeIndex, layers };
    }
  }
  layers.push(__spreadValues({ index: activeIndex }, current));
  return { activeIndex, layers };
};
export { resolveLumiereSceneFrames };
