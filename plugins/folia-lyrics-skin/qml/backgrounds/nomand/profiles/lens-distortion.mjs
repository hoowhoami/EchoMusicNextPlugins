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
const window = {};
const getShaderNoiseTexture = () => true;
const ShaderMount = 0;
const jsx = (_, props) => {
  const result = {
    uniforms: props.uniforms,
    fragmentShader: 'lens-distortion',
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
const lensDistortionFragmentShader = 'lens-distortion';
const lensDistortionMeta = { maxSamples: 50 };
const defaultPreset = {
  name: 'Default',
  params: __spreadProps(__spreadValues({}, defaultObjectSizing), {
    scale: 1,
    fit: 'contain',
    speed: 0,
    frame: 0,
    spread: 0.6,
    bias: 1,
    angle: 0,
    perspective: 0.1,
    count: 35,
    dispersion: 1,
    dispersionShift: 0,
    dispersionColor: 0.6,
    focusCenter: 0.8,
    focusEdges: 1,
    swirl: 0.35,
    noise: 0,
    noiseFrequency: 0.25,
    noiseOffset: 0,
    lensBulge: 0,
    lensCircle: 0,
    grainMixer: 0,
    grainOverlay: 0,
    imageX: 0,
    imageY: 0,
  }),
};
const LensDistortion = function LensDistortionImpl(_a) {
  var _b = _a,
    {
      speed: speed = defaultPreset.params.speed,
      frame = defaultPreset.params.frame,
      image = '',
      spread = defaultPreset.params.spread,
      bias = defaultPreset.params.bias,
      angle = defaultPreset.params.angle,
      perspective = defaultPreset.params.perspective,
      count = defaultPreset.params.count,
      dispersion = defaultPreset.params.dispersion,
      dispersionShift = defaultPreset.params.dispersionShift,
      dispersionColor = defaultPreset.params.dispersionColor,
      focusCenter = defaultPreset.params.focusCenter,
      focusEdges = defaultPreset.params.focusEdges,
      swirl = defaultPreset.params.swirl,
      noise = defaultPreset.params.noise,
      noiseFrequency = defaultPreset.params.noiseFrequency,
      noiseOffset = defaultPreset.params.noiseOffset,
      lensBulge = defaultPreset.params.lensBulge,
      lensCircle = defaultPreset.params.lensCircle,
      grainMixer = defaultPreset.params.grainMixer,
      grainOverlay = defaultPreset.params.grainOverlay,
      imageX = defaultPreset.params.imageX,
      imageY = defaultPreset.params.imageY,
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
      'image',
      'spread',
      'bias',
      'angle',
      'perspective',
      'count',
      'dispersion',
      'dispersionShift',
      'dispersionColor',
      'focusCenter',
      'focusEdges',
      'swirl',
      'noise',
      'noiseFrequency',
      'noiseOffset',
      'lensBulge',
      'lensCircle',
      'grainMixer',
      'grainOverlay',
      'imageX',
      'imageY',
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
    u_spread: spread,
    u_bias: bias,
    u_angle: angle,
    u_perspective: perspective,
    u_count: count,
    u_dispersion: dispersion,
    u_dispersionShift: dispersionShift,
    u_dispersionColor: dispersionColor,
    u_focusCenter: focusCenter,
    u_focusEdges: focusEdges,
    u_swirl: swirl,
    u_noise: noise,
    u_noiseFrequency: noiseFrequency,
    u_noiseOffset: noiseOffset,
    u_lensBulge: lensBulge,
    u_lensCircle: lensCircle,
    u_grainMixer: grainMixer,
    u_grainOverlay: grainOverlay,
    u_imageX: imageX,
    u_imageY: imageY,
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
      fragmentShader: lensDistortionFragmentShader,
      mipmaps: ['u_image'],
      uniforms,
    })
  );
};
export { LensDistortion };
