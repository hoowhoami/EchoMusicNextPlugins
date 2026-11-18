// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/hanabiSceneFrames.ts
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
import { findHanabiParagraphIndexAtTime } from './hanabiProgram.mjs';
import { HANABI_TRANSITIONS, resolveHanabiEnterDuration } from './hanabiTransitions.mjs';
const IDLE = { alpha: 1, scale: 1, blur: 0, y: 0, rotation: 0 };
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
const exitFrameOf = (program, index, time, beyondBoundary = false) => {
  var _a;
  const out = (_a = program.paragraphs[index]) == null ? void 0 : _a.transitionOut;
  if (!out || time < out.startTime) return IDLE;
  const progress = (time - out.startTime) / Math.max(out.endTime - out.startTime, 1e-3);
  return HANABI_TRANSITIONS[out.kind].resolveFrame(
    'exit',
    beyondBoundary ? progress : Math.min(progress, 1),
  );
};
const resolveHanabiSceneFrames = (program, time, transitionsEnabled) => {
  if (program.paragraphs.length === 0) return { activeIndex: -1, layers: [] };
  const activeIndex = findHanabiParagraphIndexAtTime(program, time);
  if (!transitionsEnabled)
    return { activeIndex, layers: [__spreadValues({ index: activeIndex }, IDLE)] };
  const paragraph = program.paragraphs[activeIndex];
  const current = exitFrameOf(program, activeIndex, time);
  const layers = [];
  const previousOut = activeIndex > 0 ? program.paragraphs[activeIndex - 1].transitionOut : null;
  if (previousOut) {
    const enterDuration = resolveHanabiEnterDuration(
      previousOut.kind,
      previousOut.startTime,
      previousOut.endTime,
    );
    const progress = (time - paragraph.startTime) / enterDuration;
    if (progress >= 0 && progress < 1) {
      const enter = HANABI_TRANSITIONS[previousOut.kind].resolveFrame('enter', progress);
      const weight = smooth(progress);
      const leaving = exitFrameOf(program, activeIndex - 1, time, true);
      if (leaving.alpha * (1 - weight) > 2e-3) {
        layers.push(
          __spreadProps(__spreadValues({ index: activeIndex - 1 }, leaving), {
            alpha: leaving.alpha * (1 - weight),
          }),
        );
      }
      layers.push({
        index: activeIndex,
        alpha: Math.min(enter.alpha, weight) * current.alpha,
        scale: enter.scale * current.scale,
        blur: Math.max(enter.blur, current.blur),
        y: enter.y + current.y,
        rotation: enter.rotation + current.rotation,
      });
      return { activeIndex, layers };
    }
  }
  layers.push(__spreadValues({ index: activeIndex }, current));
  return { activeIndex, layers };
};
export { resolveHanabiSceneFrames };
