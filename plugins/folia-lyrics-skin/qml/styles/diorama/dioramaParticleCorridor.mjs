// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
var __defProp = Object.defineProperty;
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
  };
import { DIORAMA_STEP_DISTANCE, getFrame } from './cameraPath.mjs';
import { extendDioramaFrame } from './dioramaMoteField.mjs';
import { resolveGlobal } from './dioramaSequencer.mjs';
const DIORAMA_PARTICLE_CORRIDOR_RADIUS = 7.4,
  buildDioramaParticleCorridorSpan = (frame, nextFrame, pathStart, enabled) => {
    const start = __spreadValues({}, frame.position),
      end =
        nextFrame != null
          ? __spreadValues({}, nextFrame.position)
          : {
              x: start.x + frame.forward.x * DIORAMA_STEP_DISTANCE,
              y: start.y + frame.forward.y * DIORAMA_STEP_DISTANCE,
              z: start.z + frame.forward.z * DIORAMA_STEP_DISTANCE,
            };
    return {
      start,
      end,
      startRight: frame.right,
      endRight: nextFrame ? nextFrame.right : frame.right,
      startUp: frame.up,
      endUp: nextFrame ? nextFrame.up : frame.up,
      pathStart,
      enabled,
    };
  },
  buildDioramaParticleCorridorWindow = (sequencer, center, behind, ahead) => {
    const anchor = resolveGlobal(sequencer, center);
    if (!anchor) return [];
    const { segment } = anchor,
      first = segment.globalStart,
      last = segment.globalStart + segment.span - 1,
      frameAt = (index) => {
        const clamped = Math.min(Math.max(index, first), last);
        return extendDioramaFrame(getFrame(segment.frames, clamped - first), index - clamped);
      },
      spans = [];
    for (let i = center - behind; i <= center + ahead; i += 1)
      spans.push(buildDioramaParticleCorridorSpan(frameAt(i), frameAt(i + 1), i, !0));
    return spans;
  };
export {
  DIORAMA_PARTICLE_CORRIDOR_RADIUS,
  buildDioramaParticleCorridorSpan,
  buildDioramaParticleCorridorWindow,
};
