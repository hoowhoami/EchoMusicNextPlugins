// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/hanabiTransitions.ts
import { arrayAt, arrayFlatMap, fromEntries } from '../compat.mjs';
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
import { easeSeptic } from './timeline.mjs';
const HANABI_TRANSITION_KINDS = ['ascend', 'flash', 'bloom'];
const ease = easeSeptic;
const launch = (p) => (p <= 0 ? 0 : p >= 1 ? 1 + 2 * (p - 1) : p * p * p * (2 - p));
const frame = (partial) =>
  __spreadValues({ alpha: 1, scale: 1, blur: 0, y: 0, rotation: 0 }, partial);
const resolveFrame = (kind, phase, progress) => {
  const p = Math.max(0, phase === 'exit' ? progress : Math.min(1, progress));
  if (kind === 'ascend') {
    if (phase === 'exit') {
      const e = launch(p);
      return frame({
        y: 0.32 * e,
        blur: 10 * Math.min(e, 1),
        alpha: 1 - 0.7 * ease((p - 0.5) / 0.5),
        rotation: 0.55 * e,
      });
    }
    const k2 = launch(1 - p);
    return frame({ y: -0.26 * k2, blur: 10 * k2, alpha: 1 - 0.7 * k2, rotation: -0.5 * k2 });
  }
  if (kind === 'flash') {
    const near = phase === 'exit' ? ease(p) : 1 - ease(p);
    return frame({
      scale: 1 + 0.05 * near,
      blur: 9 * near * near,
      alpha: 1 - 0.55 * near * near,
      rotation: (phase === 'exit' ? 0.12 : -0.12) * near,
    });
  }
  if (phase === 'exit') {
    const e = ease(p);
    return frame({ scale: 1 + 0.18 * e, blur: 5 * e, alpha: 1 - e, rotation: 0.3 * e });
  }
  const k = 1 - ease(p);
  return frame({ scale: 1 - 0.08 * k, blur: 4 * k, alpha: 1 - k, rotation: -0.25 * k });
};
const HANABI_TRANSITIONS = fromEntries(
  HANABI_TRANSITION_KINDS.map((kind) => [
    kind,
    {
      kind,
      duration: (gap) =>
        kind === 'flash'
          ? Math.min(0.5, Math.max(0.28, gap > 0 ? gap * 0.4 : 0.35))
          : Math.min(1.1, Math.max(0.5, gap > 0 ? gap * 0.6 : 0.8)),
      enterClamp: kind === 'flash' ? [0.2, 0.45] : [0.4, 0.9],
      resolveFrame: (phase, progress) => resolveFrame(kind, phase, progress),
    },
  ]),
);
const resolveHanabiEnterDuration = (kind, startTime, endTime) => {
  const [min, max] = HANABI_TRANSITIONS[kind].enterClamp;
  return Math.max(min, Math.min(max, endTime - startTime));
};
const chooseHanabiTransition = (seed, paragraphIndex, previous) => {
  let hash = 0;
  for (const char of `${seed}:${paragraphIndex}:hanabi-transition`)
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  const roll = Math.abs(hash);
  if (previous !== 'ascend' && roll % 2 === 0) return 'ascend';
  const choices = HANABI_TRANSITION_KINDS.filter((kind) => kind !== previous && kind !== 'ascend');
  return choices[(roll >> 1) % choices.length];
};
export {
  HANABI_TRANSITIONS,
  HANABI_TRANSITION_KINDS,
  chooseHanabiTransition,
  resolveHanabiEnterDuration,
};
