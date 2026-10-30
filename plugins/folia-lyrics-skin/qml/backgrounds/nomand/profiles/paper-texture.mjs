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
    fragmentShader: 'paper-texture',
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
const paperTextureFragmentShader = 'paper-texture';
const defaultPreset = {
  name: 'Default',
  params: __spreadProps(__spreadValues({}, defaultObjectSizing), {
    fit: 'cover',
    scale: 0.6,
    speed: 0,
    frame: 0,
    colorFront: '#9fadbc',
    colorBack: '#ffffff',
    contrast: 0.3,
    roughness: 0.4,
    fiber: 0.3,
    fiberSize: 0.2,
    crumples: 0.3,
    crumpleSize: 0.35,
    folds: 0.65,
    foldCount: 5,
    fade: 0,
    drops: 0.2,
    seed: 5.8,
  }),
};
const PaperTexture = function PaperTextureImpl(_a) {
  var _b = _a,
    {
      speed: speed = defaultPreset.params.speed,
      frame = defaultPreset.params.frame,
      colorFront = defaultPreset.params.colorFront,
      colorBack = defaultPreset.params.colorBack,
      image = '',
      contrast = defaultPreset.params.contrast,
      roughness = defaultPreset.params.roughness,
      fiber = defaultPreset.params.fiber,
      crumples = defaultPreset.params.crumples,
      folds = defaultPreset.params.folds,
      drops = defaultPreset.params.drops,
      seed = defaultPreset.params.seed,
      fiberScale: fiberScale,
      fiberSize = fiberScale === void 0 ? defaultPreset.params.fiberSize : 0.2 / fiberScale,
      crumplesScale,
      crumpleSize = crumplesScale === void 0
        ? defaultPreset.params.crumpleSize
        : 0.2 / crumplesScale,
      blur,
      fade = blur === void 0 ? defaultPreset.params.fade : blur,
      foldsNumber,
      foldCount = foldsNumber === void 0 ? defaultPreset.params.foldCount : foldsNumber,
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
      'contrast',
      'roughness',
      'fiber',
      'crumples',
      'folds',
      'drops',
      'seed',
      // Reworked props
      'fiberScale',
      'fiberSize',
      'crumplesScale',
      'crumpleSize',
      'blur',
      'fade',
      'foldsNumber',
      'foldCount',
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
  const noiseTexture = typeof window !== 'undefined' && { u_noiseTexture: getShaderNoiseTexture() };
  const uniforms = __spreadProps(
    __spreadValues(
      {
        // Own uniforms
        u_image: image,
        u_colorFront: getShaderColorFromString(colorFront),
        u_colorBack: getShaderColorFromString(colorBack),
        u_contrast: contrast,
        u_roughness: roughness,
        u_fiber: fiber,
        u_fiberSize: fiberSize,
        u_crumples: crumples,
        u_crumpleSize: crumpleSize,
        u_foldCount: foldCount,
        u_folds: folds,
        u_fade: fade,
        u_drops: drops,
        u_seed: seed,
      },
      noiseTexture
    ),
    {
      // Sizing uniforms
      u_fit: ShaderFitOptions[fit],
      u_scale: scale,
      u_rotation: rotation,
      u_offsetX: offsetX,
      u_offsetY: offsetY,
      u_originX: originX,
      u_originY: originY,
      u_worldWidth: worldWidth,
      u_worldHeight: worldHeight,
    }
  );
  return /* @__PURE__ */ jsx(
    ShaderMount,
    __spreadProps(__spreadValues({}, props), {
      speed,
      frame,
      fragmentShader: paperTextureFragmentShader,
      mipmaps: ['u_image'],
      uniforms,
    })
  );
};
export { PaperTexture };
