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
    fragmentShader: 'fluted-glass',
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
const flutedGlassFragmentShader = 'fluted-glass';
const GlassDistortionShapes = { prism: 1, lens: 2, contour: 3, cascade: 4, flat: 5 };
const GlassGridShapes = { lines: 1, linesIrregular: 2, wave: 3, zigzag: 4, pattern: 5 };
const defaultPreset = {
  name: 'Default',
  params: __spreadProps(__spreadValues({}, defaultObjectSizing), {
    fit: 'cover',
    speed: 0,
    frame: 0,
    colorBack: '#00000000',
    colorShadow: '#000000',
    colorHighlight: '#ffffff',
    shadows: 0.25,
    size: 0.5,
    angle: 0,
    distortionShape: 'prism',
    highlights: 0.1,
    shape: 'lines',
    distortion: 0.5,
    shift: 0,
    blur: 0,
    edges: 0.25,
    stretch: 0,
    margin: 0,
    marginLeft: 0,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
    grainMixer: 0,
    grainOverlay: 0,
  }),
};
const FlutedGlass = function FlutedGlassImpl(_a) {
  var _b = _a,
    {
      speed: speed = defaultPreset.params.speed,
      frame = defaultPreset.params.frame,
      colorBack = defaultPreset.params.colorBack,
      colorShadow = defaultPreset.params.colorShadow,
      colorHighlight = defaultPreset.params.colorHighlight,
      image = '',
      shadows = defaultPreset.params.shadows,
      angle = defaultPreset.params.angle,
      distortion = defaultPreset.params.distortion,
      distortionShape = defaultPreset.params.distortionShape,
      highlights = defaultPreset.params.highlights,
      shape = defaultPreset.params.shape,
      shift = defaultPreset.params.shift,
      blur = defaultPreset.params.blur,
      edges = defaultPreset.params.edges,
      margin,
      marginLeft = margin != null ? margin : defaultPreset.params.marginLeft,
      marginRight = margin != null ? margin : defaultPreset.params.marginRight,
      marginTop = margin != null ? margin : defaultPreset.params.marginTop,
      marginBottom = margin != null ? margin : defaultPreset.params.marginBottom,
      grainMixer = defaultPreset.params.grainMixer,
      grainOverlay = defaultPreset.params.grainOverlay,
      stretch = defaultPreset.params.stretch,
      count: count,
      size = count === void 0
        ? defaultPreset.params.size
        : Math.pow(1 / (count * 1.6), 1 / 6) / 0.7 - 0.5,
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
      'colorBack',
      'colorShadow',
      'colorHighlight',
      'image',
      'shadows',
      'angle',
      'distortion',
      'distortionShape',
      'highlights',
      'shape',
      'shift',
      'blur',
      'edges',
      'margin',
      'marginLeft',
      'marginRight',
      'marginTop',
      'marginBottom',
      'grainMixer',
      'grainOverlay',
      'stretch',
      // integer `count` was deprecated in favor of the normalized `size` param
      'count',
      'size',
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
    u_colorBack: getShaderColorFromString(colorBack),
    u_colorShadow: getShaderColorFromString(colorShadow),
    u_colorHighlight: getShaderColorFromString(colorHighlight),
    u_shadows: shadows,
    u_size: size,
    u_angle: angle,
    u_distortion: distortion,
    u_shift: shift,
    u_blur: blur,
    u_edges: edges,
    u_stretch: stretch,
    u_distortionShape: GlassDistortionShapes[distortionShape],
    u_highlights: highlights,
    u_shape: GlassGridShapes[shape],
    u_marginLeft: marginLeft,
    u_marginRight: marginRight,
    u_marginTop: marginTop,
    u_marginBottom: marginBottom,
    u_grainMixer: grainMixer,
    u_grainOverlay: grainOverlay,
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
  };
  return /* @__PURE__ */ jsx(
    ShaderMount,
    __spreadProps(__spreadValues({}, props), {
      speed,
      frame,
      fragmentShader: flutedGlassFragmentShader,
      mipmaps: ['u_image'],
      uniforms,
    })
  );
};
export { FlutedGlass };
