// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/station/layout.ts
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
const LEVEL = {
  road: 0,
  lot: 0.02,
  apron: 0.1,
};
const ROAD = {
  z0: 2.35,
  z1: 6,
  curb: 0.16,
  /** 两条车道的中线（靠左行驶）：近的一条往 +x，远的一条往 -x。各在两条边线与中线之间居中。 */
  lanes: [3.36, 4.99],
  /** 路缘在这两段断开，是出入口。 */
  gaps: [
    [-1.2, 0.8],
    [1.8, 3.6],
  ],
};
const CANOPY = {
  x0: 1.4,
  x1: 5.9,
  z0: -5.6,
  z1: -1.4,
  /** 罩棚底面与顶面。 */
  under: 3.85,
  top: 4.3,
  columns: [
    [2.05, -2.1],
    [5.25, -2.1],
    [2.05, -4.9],
    [5.25, -4.9],
  ],
};
const ISLANDS = {
  x0: 2.45,
  x1: 4.85,
  z: [-4.35, -2.75],
  width: 0.5,
  height: 0.16,
  pumps: [3.05, 4.25],
};
const APRON = {
  x0: 1.2,
  x1: 6,
  z0: -6,
  z1: 0.4,
};
const TRUCK = {
  rear: -5.85,
  front: 1.1,
  z0: -5.7,
  z1: -3.6,
  deck: 1,
  boxTop: 3.4,
  /** 货厢到这里为止，往前是车头。 */
  boxFront: -0.7,
  cabBack: -0.55,
  cabTop: 2.75,
};
const TRUCK_SCREEN = {
  x: (TRUCK.rear + TRUCK.boxFront) / 2,
  y: (TRUCK.deck + 0.22 + TRUCK.boxTop - 0.16) / 2,
  z: TRUCK.z1 + 0.03,
  width: TRUCK.boxFront - TRUCK.rear - 0.36,
  height: TRUCK.boxTop - 0.16 - (TRUCK.deck + 0.22),
};
const STALLS = {
  x: [-4.75, -2.85, -0.95],
  z: -0.3,
  width: 1.9,
  depth: 3.6,
};
const CAR = { length: 3.2, width: 1.42, height: 1.38 };
const PUMP_CAR = { x: 3.65, z: -0.95 };
const KEI_TRUCK = { x: 3.1, z: 1.1 };
const APRON_PROPS = {
  airPump: { x: 1.6, z: -0.75, width: 0.36, depth: 0.3 },
  bins: { x: 1.6, z: [-1.2, -1.57], size: 0.34 },
  tires: { x: 5.6, z: -2.9, radius: 0.37 },
};
const PYLON = { x: 5.35, z: 1.75, height: 4.1, width: 1 };
const MOTEL_SIGN = { x: -5.25, z: 1.85, height: 6.4 };
const LOT_LAMP = { x: 0.9, z: 1.85, height: 5, arm: 1.2 };
const STATION_VIEW = {
  azimuth: 25 * DEG,
  elevation: 30 * DEG,
  zoom: 1.48,
};
export {
  APRON,
  APRON_PROPS,
  CANOPY,
  CAR,
  DEG,
  ISLANDS,
  KEI_TRUCK,
  LEVEL,
  LOT_LAMP,
  MOTEL_SIGN,
  PUMP_CAR,
  PYLON,
  ROAD,
  STALLS,
  STATION_VIEW,
  TRUCK,
  TRUCK_SCREEN,
};
