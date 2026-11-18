// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/station/stationScene.ts
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
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
import {
  hashVisualizerSeed,
  visualizerHash01,
} from '../../_shared/components/visualizer/visualizerSeedHash.mjs';
import { MachiNobori } from '../../engine/actors/nobori.mjs';
import { resolveMachiCar } from '../../engine/actors/schedules.mjs';
import {
  createBaseClippingPlanes,
  createSoftEllipseTexture,
  MachiTraffic,
} from '../../engine/actors/traffic.mjs';
import { machiNeonGroup } from '../../engine/beatFx.mjs';
import { resolveMachiFlicker } from '../../engine/director.mjs';
import { MachiLightCones } from '../../engine/fx/lightCones.mjs';
import { MACHI_REFLECT_LAYER } from '../../engine/fx/reflection.mjs';
import { MachiSteam } from '../../engine/fx/steam.mjs';
import { MACHI_BASE } from '../../engine/geometry/plinth.mjs';
import { bakeStatic, group, withGeometryCache } from '../../engine/geometry/shapes.mjs';
import { seedIndex, vivid } from '../../engine/palette.mjs';
import {
  CANOPY,
  KEI_TRUCK,
  LEVEL,
  PUMP_CAR,
  ROAD,
  STALLS,
  STATION_VIEW,
  TRUCK,
  TRUCK_SCREEN,
} from './layout.mjs';
import { StationLights } from './stationLights.mjs';
import { resolveStationVariation } from './stationSeed.mjs';
import { StationSigns } from './stationSigns.mjs';
import {
  buildCanopy,
  buildIslands,
  buildLotLamp,
  buildMotelSign,
  buildPylon,
  buildStationGround,
  buildStationProps,
  stationFramingPoints,
} from './structures.mjs';
import { buildAdTruck, buildParkedCar } from './vehicles.mjs';
const CAR_COLORS = ['#e8eaee', '#aeb5bf', '#25292f', '#22385f', '#b8322e', '#2f5a48', '#d8cdb4'];
const TAXI_LIVERIES = [
  ['#f1c232', '#2b2f36'],
  ['#2a2d33', '#e8a23a'],
  ['#e9ecef', '#2f8a4f'],
  ['#2f6fb0', '#f1f1ec'],
];
const STATION_ART = {
  canopyFascia: '#f3f1eb',
  canopyTop: '#aeb4bc',
  canopyUnder: '#d4d7dd',
  canopyColumn: '#e5e3dd',
  canopyLight: '#eef4ff',
  pumpBody: '#ecebe6',
  truckBox: '#e9ecef',
  carGlass: '#1b2230',
  motelBack: '#1b333d',
  motelPole: '#bdb6a8',
  marker: '#ffae42',
};
const resolveStationArt = (_theme, seed, base) => {
  const variation = resolveStationVariation(seed, CAR_COLORS.length, TAXI_LIVERIES.length);
  const livery = TAXI_LIVERIES[variation.taxiLivery];
  return __spreadProps(__spreadValues({}, STATION_ART), {
    // 货车的车头用主题的副色，像一家运输公司的涂装。
    truckCab: vivid(base.brand[2], 0.5, 0.38, 0.5),
    taxiBody: livery[0],
    taxiTrim: livery[1],
    car0: CAR_COLORS[variation.carColors[0]],
    car1: CAR_COLORS[variation.carColors[1]],
    car2: CAR_COLORS[variation.carColors[2]],
    carPump: CAR_COLORS[variation.pumpColor],
    carKei: CAR_COLORS[(variation.keiColor + seedIndex(seed, 'kei', 2)) % CAR_COLORS.length],
  });
};
const STATION_GLOWS = {
  canopyLight: { key: 'canopyLight', level: 2.4 },
  pumpScreen: { key: 'led', level: 1.1 },
  marker: { key: 'marker', level: 1.8 },
  carHead: { key: 'streetLight', level: 2.2 },
  carTail: { key: 'stopRed', level: 1.6 },
  hazard: { key: 'marker', level: 2.4 },
  hazardIdle: { key: 'marker', level: 0.12 },
  vacant: { key: 'stopRed', level: 1.8 },
  lampHead: { key: 'streetLight', level: 3.2 },
  motelNeon: { key: 'neon', level: 1.6 },
};
const LANE_REACH = 8;
const STATION_LANES = [
  { from: [-LANE_REACH, ROAD.lanes[0]], to: [LANE_REACH, ROAD.lanes[0]] },
  { from: [LANE_REACH, ROAD.lanes[1]], to: [-LANE_REACH, ROAD.lanes[1]] },
];
const hazardOn = (time, seed) => {
  const window = 18;
  const index = Math.floor(time / window);
  const key = hashVisualizerSeed(`hazard:${seed}`);
  if (visualizerHash01(key, index, 33) > 0.5) return false;
  const local = time - index * window - visualizerHash01(key, index, 66) * 10;
  if (local < 0 || local > 6) return false;
  return Math.floor(local * 2.8) % 2 === 0;
};
const stationDrips = () => {
  const drips = [];
  for (let x = CANOPY.x0 + 0.2; x < CANOPY.x1; x += 0.45) {
    drips.push({
      x: x + (Math.random() - 0.5) * 0.1,
      z: CANOPY.z1 + 0.06,
      from: CANOPY.under - 0.02,
      to: LEVEL.apron,
      period: 1 + Math.random() * 1.6,
      phase: Math.random(),
    });
  }
  for (let z = CANOPY.z1; z > CANOPY.z0 + 0.3; z -= 0.5) {
    drips.push({
      x: CANOPY.x1 + 0.06,
      z: z + (Math.random() - 0.5) * 0.1,
      from: CANOPY.under - 0.02,
      to: LEVEL.apron,
      period: 1 + Math.random() * 1.6,
      phase: Math.random(),
    });
  }
  return drips;
};
class StationScene {
  constructor(context) {
    __publicField(this, 'context', context);
    __publicField(this, 'root', new THREE.Group());
    __publicField(this, 'framing');
    __publicField(this, 'weather');
    __publicField(this, 'reflectionPlaneY', 0.04);
    __publicField(this, 'rebuildsForSeed', true);
    __publicField(this, 'surfaces');
    __publicField(this, 'puddles');
    __publicField(
      this,
      'focusPoint',
      new THREE.Vector3(TRUCK_SCREEN.x, TRUCK_SCREEN.y, TRUCK_SCREEN.z),
    );
    __publicField(this, 'world', new THREE.Group());
    __publicField(this, 'lights');
    __publicField(this, 'signs');
    __publicField(this, 'traffic');
    __publicField(this, 'nobori');
    __publicField(this, 'lightCones');
    __publicField(this, 'steam');
    __publicField(this, 'textures', []);
    __publicField(this, 'glowA');
    __publicField(this, 'glowB');
    __publicField(this, 'variation');
    const { materials, blend, geometryCache } = context;
    const variation = resolveStationVariation(
      context.song.seed,
      CAR_COLORS.length,
      TAXI_LIVERIES.length,
    );
    this.variation = variation;
    materials.defineGlows(STATION_GLOWS);
    this.root.name = 'Station';
    const shadowTexture = createSoftEllipseTexture();
    this.textures.push(shadowTexture);
    const shadow = materials.track(
      new THREE.MeshBasicMaterial({
        color: 0,
        alphaMap: shadowTexture,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    const built = withGeometryCache(geometryCache, () => {
      const ground2 = buildStationGround(materials);
      const canopy2 = buildCanopy(materials);
      const pylon2 = buildPylon(materials);
      const motel2 = buildMotelSign(materials);
      const lamp2 = buildLotLamp(materials);
      const truck2 = buildAdTruck(materials, shadow);
      const andons2 = [];
      const cars = [];
      variation.stalls.forEach((kind, index) => {
        if (kind === 'empty') return;
        const car = buildParkedCar(
          materials,
          kind,
          kind === 'taxi' ? 'taxiBody' : `car${index}`,
          `Stall${index}`,
          shadow,
          index === variation.hazardStall,
        );
        car.group.position.set(STALLS.x[index], LEVEL.road, STALLS.z + 0.15);
        cars.push(car.group);
        if (car.andon) {
          andons2.push({
            position: car.andon.position.clone().add(car.group.position),
            rotationY: 0,
            width: car.andon.width,
            height: car.andon.height,
            role: andons2.length === 0 ? 'ticker' : 'credits',
          });
        }
      });
      if (variation.pumpCar) {
        const car = buildParkedCar(materials, 'sedan', 'carPump', 'PumpCar', shadow);
        car.group.position.set(PUMP_CAR.x, LEVEL.apron, PUMP_CAR.z);
        car.group.rotation.y = Math.PI / 2;
        cars.push(car.group);
      }
      if (variation.keiTruck) {
        const car = buildParkedCar(materials, 'kei', 'carKei', 'KeiTruck', shadow);
        car.group.position.set(KEI_TRUCK.x, LEVEL.road, KEI_TRUCK.z);
        car.group.rotation.y = -Math.PI / 2;
        cars.push(car.group);
      }
      return {
        ground: ground2,
        canopy: canopy2,
        pylon: pylon2,
        motel: motel2,
        lamp: lamp2,
        truck: truck2,
        andons: andons2,
        cars: group('Cars', ...cars),
        islands: buildIslands(materials),
        props: buildStationProps(materials),
      };
    });
    const { ground, canopy, pylon, motel, lamp, truck, andons } = built;
    this.world.name = 'Station/world';
    this.world.add(
      ground.group,
      canopy.group,
      built.islands,
      pylon.group,
      motel.group,
      lamp.group,
      truck.group,
      built.cars,
      built.props,
    );
    this.world.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
      const isGlow = object.material.name.startsWith('machi:glow');
      const isOccluder =
        !object.material.transparent &&
        (object.name.startsWith('Canopy/') || object.name === 'Truck/box');
      if (isGlow || isOccluder) object.layers.enable(MACHI_REFLECT_LAYER);
    });
    this.surfaces = { road: [ground.roadSurface], lot: ground.lotSurfaces };
    this.puddles = { offset: variation.puddleOffset, amount: variation.puddleAmount };
    bakeStatic(this.world);
    this.lights = new StationLights(blend, materials, lamp.head, motel.glow);
    this.signs = new StationSigns(materials, blend, {
      screen: {
        position: new THREE.Vector3(TRUCK_SCREEN.x, TRUCK_SCREEN.y, TRUCK_SCREEN.z),
        rotationY: 0,
        width: TRUCK_SCREEN.width,
        height: TRUCK_SCREEN.height,
      },
      andons,
      canopy: [canopy.signFront, canopy.signRight],
      pylon: pylon.faces,
      motel: { tall: motel.tall, name: motel.name, vacancy: motel.vacancy, bulbs: motel.bulbs },
    });
    this.signs.group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.layers.enable(MACHI_REFLECT_LAYER);
    });
    const clipping = createBaseClippingPlanes(MACHI_BASE.half);
    this.traffic = withGeometryCache(
      geometryCache,
      () => new MachiTraffic(materials, blend, clipping, STATION_LANES, LEVEL.road),
    );
    this.nobori = new MachiNobori(
      materials,
      [1.45, 1.95, 2.45].map((x) => ({ x, y: LEVEL.apron, z: 0.15, rotationY: 0.4 })),
    );
    this.lightCones = new MachiLightCones(materials, blend, [
      {
        apex: lamp.head,
        target: new THREE.Vector3(lamp.head.x - 0.4, LEVEL.road, lamp.head.z - 0.6),
        radius: 1.6,
        gain: 1,
      },
    ]);
    this.steam = new MachiSteam(materials, blend, [
      { position: truck.exhaust, puffs: 5, period: 3.2, size: 0.55 },
      {
        position: new THREE.Vector3(
          -2.6,
          LEVEL.road + 0.02,
          (ROAD.lanes[0] + ROAD.lanes[1]) / 2 + 0.4,
        ),
        puffs: 6,
        period: 4.6,
        size: 0.9,
      },
    ]);
    this.root.add(
      this.world,
      this.lights.group,
      this.signs.group,
      this.traffic.group,
      this.nobori.group,
      this.lightCones.mesh,
      this.steam.mesh,
    );
    this.weather = {
      half: MACHI_BASE.half,
      groundY: LEVEL.apron * 0.5,
      roofs: [
        {
          x0: CANOPY.x0 - 0.05,
          z0: CANOPY.z0 - 0.05,
          x1: CANOPY.x1 + 0.05,
          z1: CANOPY.z1 + 0.05,
          y: CANOPY.top,
        },
        { x0: TRUCK.rear, z0: TRUCK.z0, x1: TRUCK.boxFront, z1: TRUCK.z1, y: TRUCK.boxTop },
        { x0: TRUCK.cabBack, z0: TRUCK.z0, x1: TRUCK.front, z1: TRUCK.z1, y: TRUCK.cabTop },
      ],
      drips: stationDrips(),
      // 落进灯光里的雨丝被照亮：场地灯下、罩棚前、旅馆立牌旁。
      glints: [
        { position: new THREE.Vector3(lamp.head.x - 0.3, 2.4, lamp.head.z - 0.5), radius: 1.7 },
        {
          position: new THREE.Vector3((CANOPY.x0 + CANOPY.x1) / 2, 2, CANOPY.z1 + 0.6),
          radius: 2.2,
        },
        { position: motel.glow.clone(), radius: 1.6 },
      ],
      windYaw: variation.windYaw,
      windSlant: variation.windSlant,
    };
    this.framing = { points: stationFramingPoints(), view: __spreadValues({}, STATION_VIEW) };
    this.glowA = new THREE.Vector4(
      (CANOPY.x0 + CANOPY.x1) / 2,
      0,
      (CANOPY.z0 + CANOPY.z1) / 2 + 1,
      3.6,
    );
    this.glowB = new THREE.Vector4(lamp.head.x - 0.4, 0, lamp.head.z - 0.6, 2.3);
    this.syncColors();
    context.invalidateShadows();
  }
  setContent(content) {
    this.signs.setContent(content);
    const { palette } = content;
    this.nobori.paint({
      font: content.font,
      fallbacks: content.fallbacks,
      faces: [
        { background: palette.brand[0], ink: '#ffffff', text: '\u30BB\u30EB\u30D5' },
        {
          background: palette.brand[2],
          ink: '#ffffff',
          text: '\u6D17\u8ECA',
          icon: content.icons[0],
        },
        { background: palette.brand[1], ink: palette.signText, text: '\u706F\u6CB9' },
      ],
    });
  }
  /** 换歌（seed 不变）：只重画招牌；seed 变了运行时会重建整个场景（rebuildsForSeed）。 */
  swapSong(_song, content) {
    this.setContent(content);
  }
  direct(frame) {
    const { songTime, ambientTime, chorus, staticMode, environment, look } = frame;
    if (frame.targetChanged)
      this.signs.showBoard(frame.target, frame.lines, frame.immediate, frame.showText);
    else if (frame.preheat) this.signs.preheat(frame.preheat, frame.lines, frame.showText);
    const flicker = staticMode
      ? 1
      : resolveMachiFlicker(ambientTime + 1.7, `${frame.seed}:canopy`, 0.4);
    const lampFlicker = staticMode
      ? 1
      : resolveMachiFlicker(ambientTime + 4.2, `${frame.seed}:lamp`, 0.45);
    const lamp = look.streetLamps * (0.75 + 0.25 * lampFlicker);
    const { beat } = frame;
    const canopyLevel = (0.85 + 0.15 * flicker) * (1 + 0.08 * chorus) * look.artificial * beat.warm;
    const motelNeon = look.artificial * (0.8 + 0.2 * frame.flicker);
    this.lights.setLevels({
      canopy: canopyLevel,
      lamp,
      neon: motelNeon * beat.neon,
      screen: (1 - 0.8 * environment.daylight) * (1 + 0.2 * chorus),
      pools: (1 - 0.85 * environment.daylight) * (1 + beat.thump),
    });
    const materials = this.context.materials;
    materials.setGlowLevel('canopyLight', 0.4 + 0.6 * canopyLevel);
    materials.setGlowLevel('lampHead', 0.15 + 0.85 * look.streetLamps);
    materials.setGlowLevel('motelNeon', motelNeon * machiNeonGroup(beat, 2));
    materials.setGlowLevel('marker', 0.5 + 0.5 * look.artificial);
    materials.setGlowLevel('carHead', 0.12 + 0.88 * (1 - environment.daylight));
    materials.setGlowLevel('carTail', 0.3 + 0.7 * (1 - environment.daylight));
    materials.setGlowLevel(
      'hazard',
      !staticMode && this.variation.hazardStall >= 0 && hazardOn(ambientTime, frame.seed)
        ? 1
        : 0.06,
    );
    this.traffic.group.visible = !staticMode;
    this.traffic.update(ambientTime, frame.seed, frame.trafficChance);
    this.nobori.update(ambientTime, 0.35 + 0.65 * Math.min(1, frame.rain));
    this.lightCones.update(ambientTime, lamp * (1 - 0.6 * environment.daylight));
    this.steam.update(ambientTime, frame.atmosphere.wind);
    const night = 1 - 0.85 * environment.daylight;
    const atmosphere = frame.atmosphere;
    atmosphere.glowA.copy(this.glowA);
    atmosphere.glowB.copy(this.glowB);
    atmosphere.glowColorA
      .copy(this.context.blend.get('canopyLight'))
      .multiplyScalar(0.5 * canopyLevel * night);
    atmosphere.glowColorB
      .copy(this.context.blend.get('streetLight'))
      .multiplyScalar(0.42 * lamp * night);
    this.signs.update({
      songTime,
      ambientTime,
      delta: frame.delta,
      staticMode,
      chorus,
      audio: frame.audio,
      flicker: frame.flicker,
      artificial: look.artificial,
      lineIndex: frame.target.kind === 'line' ? frame.target.index : -1,
      beat,
    });
  }
  syncColors() {
    this.context.materials.syncColors();
    this.lights.sync();
    this.traffic.syncColors();
    this.lightCones.syncColors();
    this.steam.syncColors();
  }
  get busy() {
    return this.signs.busy;
  }
  nextCar(from, seed, chance) {
    for (let t = from; t < from + 120; t += 0.04) {
      const car = resolveMachiCar(t, seed, STATION_LANES, chance);
      if (car && Math.abs(car.distance - LANE_REACH) < 0.3) return t;
    }
    return null;
  }
  dispose() {
    const geometries = new Set(this.context.geometryCache.values());
    this.root.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.LineSegments ||
        object instanceof THREE.Points
      )
        geometries.add(object.geometry);
    });
    geometries.forEach((geometry) => geometry.dispose());
    this.lights.dispose();
    this.signs.dispose();
    this.traffic.dispose();
    this.nobori.dispose();
    this.lightCones.dispose();
    this.steam.dispose();
    this.textures.forEach((texture) => texture.dispose());
    this.context.materials.dispose();
    this.root.removeFromParent();
  }
}
const STATION_SCENE = {
  resolveArt: resolveStationArt,
  create: (context) => new StationScene(context),
};
export { STATION_SCENE };
