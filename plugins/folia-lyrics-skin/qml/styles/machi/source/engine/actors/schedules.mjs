// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/actors/schedules.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../../environment.mjs';
import {
  hashVisualizerSeed,
  visualizerHash01,
} from '../../_shared/components/visualizer/visualizerSeedHash.mjs';
const MACHI_CAR_SPEED = 6.5;
const CAR_WINDOW = 9.5;
const laneLength = (lane) => Math.hypot(lane.to[0] - lane.from[0], lane.to[1] - lane.from[1]);
const resolveMachiCar = (time, seed, lanes, chance = 0.62) => {
  if (lanes.length === 0) return null;
  const key = hashVisualizerSeed(`car:${seed}`);
  const window = Math.floor(time / CAR_WINDOW);
  for (const index of [window, window - 1]) {
    if (visualizerHash01(key, index, 17) > chance) continue;
    const start = index * CAR_WINDOW + visualizerHash01(key, index, 34) * (CAR_WINDOW * 0.5);
    const local = time - start;
    const lane = Math.floor(visualizerHash01(key, index, 51) * lanes.length);
    if (local < 0 || local > laneLength(lanes[lane]) / MACHI_CAR_SPEED) continue;
    return {
      lane,
      distance: local * MACHI_CAR_SPEED,
      colorIndex: Math.floor(visualizerHash01(key, index, 68) * 1e3),
    };
  }
  return null;
};
export { MACHI_CAR_SPEED, resolveMachiCar };
