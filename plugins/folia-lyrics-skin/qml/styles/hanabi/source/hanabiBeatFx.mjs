// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/hanabiBeatFx.ts
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
import { resolveBeatFxAccentGain } from '../excluded-analysis.mjs';
import { burstPreset } from './catalog.mjs';
import { createRng } from './hanabiRandom.mjs';
const HANABI_BEAT_SHELL_LIFE = 1.8;
const BEAT_KINDS = ['botan', 'senrin', 'strobe', 'star', 'heart', 'ring'];
const DOWNBEAT_KINDS = ['kiku', 'ring', 'willow-ring', 'crossette', 'palm'];
const resolveHanabiBeatShell = (event, seed, strength, trackScale) => {
  const gain = resolveBeatFxAccentGain(event, trackScale);
  if (gain <= 0 || strength <= 0) return null;
  const key = `${seed}:beat:${Math.round(event.t * 1e3)}`;
  const random = createRng(key);
  const downbeat = event.kind === 'downbeat';
  const kinds = downbeat ? DOWNBEAT_KINDS : BEAT_KINDS;
  const kind = kinds[Math.floor(random() * kinds.length)];
  const colors = [0, 1, 2].map((k) => (k + Math.floor(random() * 5)) % 5);
  const size = (0.55 + 0.45 * gain) * (0.7 + 0.3 * strength);
  const spec = downbeat
    ? __spreadProps(__spreadValues({}, burstPreset(kind, colors)), {
        count: Math.round(80 * (0.5 + 0.5 * strength)),
        radius: 0.2 * size,
        duration: 1.7,
      })
    : __spreadProps(__spreadValues({}, burstPreset(kind, colors)), {
        count: Math.round(28 * (0.5 + 0.5 * strength)),
        radius: 0.09 * size,
        duration: 1.1,
        trail: 0.25,
      });
  return {
    t: event.t,
    downbeat,
    // 小烟花散在夜空上半部与两侧，大的开在上方中间一带；都在字底色块后面。
    sx: downbeat ? 0.2 + random() * 0.6 : 0.06 + random() * 0.88,
    sy: downbeat ? 0.12 + random() * 0.2 : 0.07 + random() * 0.36,
    spec,
    launch: downbeat,
    seed: key,
  };
};
const firstBeatAtOrAfter = (events, time) => {
  let low = 0;
  let high = events.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (events[middle].t < time) low = middle + 1;
    else high = middle;
  }
  return low;
};
const HANABI_BEAT_PULSE = {
  /** 每拍推近的比例与重拍额外推近的比例（强度 1 时）。 */
  zoom: 0.035,
  downbeatZoom: 0.045,
  /** 每拍左右交替摆的角度（度，跟 beatFxLive 的 getBeatFxRotationSign 换边）。 */
  kickDeg: 1.6,
};
const resolveHanabiBeatPulse = (k, d, rotationSign) => ({
  scale:
    1 + HANABI_BEAT_PULSE.zoom * Math.max(0, k) + HANABI_BEAT_PULSE.downbeatZoom * Math.max(0, d),
  rotation: ((HANABI_BEAT_PULSE.kickDeg * Math.PI) / 180) * Math.max(0, k) * rotationSign,
});
const rescaleBeatEnvelope = (envelope, clockStrength, ownStrength) =>
  clockStrength > 1e-3 ? (envelope / clockStrength) * ownStrength : 0;
export {
  HANABI_BEAT_PULSE,
  HANABI_BEAT_SHELL_LIFE,
  firstBeatAtOrAfter,
  rescaleBeatEnvelope,
  resolveHanabiBeatPulse,
  resolveHanabiBeatShell,
};
