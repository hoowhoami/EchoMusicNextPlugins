// Folia a8da4437 / Paper0.0.80. See nomand-reference.md.
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = function (value) {
  const result = Object.create(null);
  Object.getOwnPropertyNames(value)
    .concat(Object.getOwnPropertySymbols(value))
    .forEach(function (key) {
      result[key] = Object.getOwnPropertyDescriptor(value, key);
    });
  return result;
};
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
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0) target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop)) target[prop] = source[prop];
    }
  return target;
};
import { getShaderColorFromString } from '../colors.mjs';
const window = {};
const getShaderNoiseTexture = () => true;
const ShaderMount = 0;
const jsx = (_, props) => {
  const result = {
    uniforms: props.uniforms,
    fragmentShader: 'halftone-dots',
    speed: props.speed,
    frame: props.frame,
    minPixelRatio: props.minPixelRatio,
    maxPixelCount: props.maxPixelCount,
  };
  if (props.mipmaps) result.mipmaps = props.mipmaps;
  return result;
};
const { defaultObjectSizing, ShaderFitOptions } = {
  ShaderFitOptions: { none: 0, contain: 1, cover: 2 },
  defaultObjectSizing: {
    fit: 'contain',
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  },
  defaultPatternSizing: {
    fit: 'none',
    scale: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    originX: 0.5,
    originY: 0.5,
    worldWidth: 0,
    worldHeight: 0,
  },
};
const halftoneDotsFragmentShader = 'halftone-dots';
const HalftoneDotsGrids = { square: 0, hex: 1 };
const HalftoneDotsTypes = { classic: 0, gooey: 1, holes: 2, soft: 3 };
const defaultPreset = {
  name: 'Default',
  params: __spreadProps(__spreadValues({}, defaultObjectSizing), {
    fit: 'cover',
    speed: 0,
    frame: 0,
    colorBack: '#f2f1e8',
    colorFront: '#2b2b2b',
    size: 0.5,
    radius: 1.25,
    contrast: 0.4,
    originalColors: false,
    inverted: false,
    grainMixer: 0.2,
    grainOverlay: 0.2,
    grainSize: 0.5,
    grid: 'hex',
    type: 'gooey',
  }),
};
const HalftoneDots = function HalftoneDotsImpl(_a) {
  var _b = _a,
    {
      speed: speed = defaultPreset.params.speed,
      frame = defaultPreset.params.frame,
      colorFront = defaultPreset.params.colorFront,
      colorBack = defaultPreset.params.colorBack,
      image = '',
      size = defaultPreset.params.size,
      radius = defaultPreset.params.radius,
      contrast = defaultPreset.params.contrast,
      originalColors = defaultPreset.params.originalColors,
      inverted = defaultPreset.params.inverted,
      grainMixer = defaultPreset.params.grainMixer,
      grainOverlay = defaultPreset.params.grainOverlay,
      grainSize = defaultPreset.params.grainSize,
      grid = defaultPreset.params.grid,
      type = defaultPreset.params.type,
      fit: fit = defaultPreset.params.fit,
      scale = defaultPreset.params.scale,
      rotation = defaultPreset.params.rotation,
      originX = defaultPreset.params.originX,
      originY = defaultPreset.params.originY,
      offsetX = defaultPreset.params.offsetX,
      offsetY = defaultPreset.params.offsetY,
      worldWidth = defaultPreset.params.worldWidth,
      worldHeight = defaultPreset.params.worldHeight,
    } = _b,
    props = __objRest(_b, [
      // Own props
      'speed',
      'frame',
      'colorFront',
      'colorBack',
      'image',
      'size',
      'radius',
      'contrast',
      'originalColors',
      'inverted',
      'grainMixer',
      'grainOverlay',
      'grainSize',
      'grid',
      'type',
      // Sizing props
      'fit',
      'scale',
      'rotation',
      'originX',
      'originY',
      'offsetX',
      'offsetY',
      'worldWidth',
      'worldHeight',
    ]);
  const uniforms = {
    // Own uniforms
    u_image: image,
    u_colorFront: getShaderColorFromString(colorFront),
    u_colorBack: getShaderColorFromString(colorBack),
    u_size: size,
    u_radius: radius,
    u_contrast: contrast,
    u_originalColors: originalColors,
    u_inverted: inverted,
    u_grainMixer: grainMixer,
    u_grainOverlay: grainOverlay,
    u_grainSize: grainSize,
    u_grid: HalftoneDotsGrids[grid],
    u_type: HalftoneDotsTypes[type],
    // Sizing uniforms
    u_fit: ShaderFitOptions[fit],
    u_rotation: rotation,
    u_scale: scale,
    u_offsetX: offsetX,
    u_offsetY: offsetY,
    u_originX: originX,
    u_originY: originY,
    u_worldWidth: worldWidth,
    u_worldHeight: worldHeight,
  };
  return /* @__PURE__ */ jsx(
    ShaderMount,
    __spreadProps(__spreadValues({}, props), {
      speed,
      frame,
      fragmentShader: halftoneDotsFragmentShader,
      uniforms,
    })
  );
};
export { HalftoneDots };
