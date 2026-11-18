// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/konbini/layout.ts
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
const DEG = Math.PI / 180;
const BASE = { half: 6, depth: 0.6, radius: 0.12 };
const LEVEL = {
  road: 0,
  lot: 0.12,
  floor: 0.16,
};
const ROAD = {
  inner: 2.2,
  outer: 5.5,
  curbWidth: 0.16,
  edgeLineInset: 0.24,
};
const STORE = {
  x0: -5.4,
  x1: 0.8,
  z0: -5.4,
  z1: 0.4,
  wall: 0.18,
  wallHeight: 3.2,
  roofTop: 3.42,
  parapetTop: 3.62,
  overhang: 0.12,
  /** 右面玻璃到这里为止，往后是实墙（后场、贩卖机靠着它）。 */
  rightGlassEnd: -2.6,
  /** 前面左端的实墙垛。 */
  frontPillarEnd: -4.6,
  glassBottom: 0.24,
  glassTop: 2.5,
};
const DOOR = {
  x0: -1.3,
  x1: 0.5,
  height: 2.2,
  panelWidth: 0.92,
  slide: 0.86,
};
const FASCIA = {
  y0: 2.6,
  y1: 3.28,
  depth: 0.16,
};
const BOARD = {
  cx: -2.2,
  cz: -2.65,
  faceWidth: 5.6,
  faceHeight: 2.3,
  y0: 4,
  /** 正面法线的方位角（与默认镜头一致）。 */
  azimuth: 45 * DEG,
};
const KONBINI_VIEW = {
  azimuth: 45 * DEG,
  elevation: 31 * DEG,
  zoom: 1.58,
};
const PROPS = {
  utilityPole: { x: -5.3, z: 1.96, height: 7.6 },
  streetLamp: { x: 5.74, z: -1.2, height: 5.2, arm: 1.3 },
  pylon: { x: 1.62, z: -5.4, height: 4.6 },
  curveMirror: { x: -1.2, z: 5.74, height: 2.7 },
  stopSign: { x: 1.95, z: 5.74, height: 2.4 },
  vending: { x: 0.82, z: [-3.25, -4.3], width: 1, depth: 0.74, height: 1.83 },
  bikeSlots: [
    { x: -4.5, z: 1.32 },
    { x: -2.85, z: 1.36 },
  ],
  trash: { x: -3.55, z: 0.68 },
  umbrellaStand: { x: -1.62, z: 0.68 },
  aFrame: { x: 0.95, z: 1.15 },
  groundAc: { x: -5.7, z: [-2, -3.1] },
  roofAc: [
    { x: -0.1, z: -4.75 },
    { x: -4.85, z: -0.35 },
  ],
};
const groundHeightAt = (x, z) => {
  if (
    x >= STORE.x0 - STORE.overhang &&
    x <= STORE.x1 + STORE.overhang &&
    z >= STORE.z0 - STORE.overhang &&
    z <= STORE.z1 + STORE.overhang
  ) {
    return STORE.roofTop;
  }
  const onRoad = (x > ROAD.inner && x < ROAD.outer) || (z > ROAD.inner && z < ROAD.outer);
  return onRoad ? LEVEL.road : LEVEL.lot;
};
export { BASE, BOARD, DEG, DOOR, FASCIA, KONBINI_VIEW, LEVEL, PROPS, ROAD, STORE, groundHeightAt };
