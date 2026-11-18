// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/types.ts
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
const MACHI_SCENE_IDS = ['konbini', 'station', 'kowloon'];
const MACHI_TIMES_OF_DAY = ['auto', 'day', 'dusk', 'night'];
const MACHI_WEATHERS = ['auto', 'clear', 'rain', 'snow', 'fog'];
const MACHI_CAMERA_MODES = ['default', 'custom'];
const MACHI_FOCUS_MODES = ['center', 'lyrics', 'manual'];
const MACHI_VIEW_LIMITS = {
  azimuth: { min: -75, max: 75 },
  elevation: { min: -12, max: 40 },
  zoom: { min: 0.5, max: 2.8 },
  panX: { min: -5, max: 5 },
  panZ: { min: -5, max: 5 },
};
const MACHI_DOF_LIMITS = {
  aperture: { min: 1.4, max: 16 },
  dof: { min: 0, max: 2 },
  dofRange: { min: 0.3, max: 3 },
  tiltShift: { min: 0, max: 1 },
  focusOffset: { min: -10, max: 10 },
};
const MACHI_APERTURE_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16];
const MACHI_MOTION_SPEED_LIMITS = { min: 0.25, max: 3 };
const MACHI_RENDER_SCALES = [1, 0.75, 0.5];
const MACHI_ANTIALIAS_MODES = ['off', 'fxaa', 'smaa', 'ssaa'];
const MACHI_FOLLOW_GLOBAL = 'global';
const MACHI_DETAIL_LEVELS = ['off', 'low', 'high'];
const MACHI_QUALITY_REVISION = 2;
const MACHI_QUALITY_PRESET_IDS = ['high', 'balanced', 'low'];
const MACHI_QUALITY_PRESETS = {
  high: {
    renderScale: MACHI_FOLLOW_GLOBAL,
    antialias: MACHI_FOLLOW_GLOBAL,
    shadows: 'high',
    reflections: 'high',
    glow: true,
  },
  balanced: {
    renderScale: MACHI_FOLLOW_GLOBAL,
    antialias: 'fxaa',
    shadows: 'low',
    reflections: 'low',
    glow: true,
  },
  low: { renderScale: 0.75, antialias: 'off', shadows: 'off', reflections: 'off', glow: false },
};
const DEFAULT_MACHI_QUALITY = __spreadProps(__spreadValues({}, MACHI_QUALITY_PRESETS.high), {
  adaptive: true,
  revision: MACHI_QUALITY_REVISION,
});
const DEFAULT_MACHI_VIEW = { azimuth: 0, elevation: 0, zoom: 1, panX: 0, panZ: 0 };
const DEFAULT_MACHI_VIEWS = {
  konbini: DEFAULT_MACHI_VIEW,
  station: DEFAULT_MACHI_VIEW,
  kowloon: DEFAULT_MACHI_VIEW,
};
const DEFAULT_MACHI_TUNING = {
  scene: 'auto',
  timeOfDay: 'auto',
  weather: 'auto',
  camera: 'default',
  views: DEFAULT_MACHI_VIEWS,
  motion: false,
  motionSpeed: 1,
  aperture: 8,
  dof: 1,
  dofRange: 1,
  tiltShift: 0.3,
  focus: 'center',
  focusOffset: 0,
  simulatedBeat: true,
  quality: DEFAULT_MACHI_QUALITY,
};
export {
  DEFAULT_MACHI_QUALITY,
  DEFAULT_MACHI_TUNING,
  DEFAULT_MACHI_VIEW,
  DEFAULT_MACHI_VIEWS,
  MACHI_ANTIALIAS_MODES,
  MACHI_APERTURE_STOPS,
  MACHI_CAMERA_MODES,
  MACHI_DETAIL_LEVELS,
  MACHI_DOF_LIMITS,
  MACHI_FOCUS_MODES,
  MACHI_FOLLOW_GLOBAL,
  MACHI_MOTION_SPEED_LIMITS,
  MACHI_QUALITY_PRESETS,
  MACHI_QUALITY_PRESET_IDS,
  MACHI_QUALITY_REVISION,
  MACHI_RENDER_SCALES,
  MACHI_SCENE_IDS,
  MACHI_TIMES_OF_DAY,
  MACHI_VIEW_LIMITS,
  MACHI_WEATHERS,
};
