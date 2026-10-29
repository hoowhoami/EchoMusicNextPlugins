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
import { FlutedGlass } from './profiles/fluted-glass.mjs';
import { PaperTexture } from './profiles/paper-texture.mjs';
import { HalftoneDots } from './profiles/halftone-dots.mjs';
import { LensDistortion } from './profiles/lens-distortion.mjs';
import { ImageDithering } from './profiles/image-dithering.mjs';
import {
  getLensDistortionOverscan,
  getPaperTextureOverscan,
  NOMAND_LENS_SHAPE,
  NOMAND_PAPER_TEXTURE_SHAPE,
  resolveDaylightInversion,
  resolveHalftoneInversion,
} from './adjustments.mjs';
const PAPER_SHADER_CONTEXT_ATTRIBUTES = { antialias: false, depth: false };
const React = {
  createElement(type, props) {
    const next = Object.assign({}, props);
    delete next.key;
    return type(next);
  },
};
const resolveNomandSourceUrl = (coverUrl, monetBackgroundImage, tuning) => {
  var _a;
  return tuning.imageSource === 'uploaded-global'
    ? (_a = monetBackgroundImage == null ? void 0 : monetBackgroundImage.url) != null
      ? _a
      : coverUrl
    : coverUrl != null
      ? coverUrl
      : monetBackgroundImage == null
        ? void 0
        : monetBackgroundImage.url;
};
function profile(tuning, theme, isDaylight, sourceUrl) {
  const shaderRef = { current: null };
  const renderShader = () => {
    const commonProps = {
      width: '100%',
      height: '100%',
      ref: shaderRef,
      image: sourceUrl,
      fit: 'cover',
      minPixelRatio: 1,
      maxPixelCount: 1920 * 1080,
      webGlContextAttributes: PAPER_SHADER_CONTEXT_ATTRIBUTES,
      style: { width: '100%', height: '100%' },
    };
    switch (tuning.effect) {
      case 'fluted-glass':
        return /* @__PURE__ */ React.createElement(
          FlutedGlass,
          __spreadProps(
            __spreadValues(
              {
                key: `${sourceUrl}:fluted-glass`,
              },
              commonProps
            ),
            {
              colorBack: theme.backgroundColor,
              colorShadow: theme.secondaryColor,
              colorHighlight: theme.primaryColor,
              shadows: 0.25,
              size: tuning.flutedGlassSize,
              distortion: tuning.flutedGlassDistortion,
              blur: tuning.flutedGlassBlur,
              shape: 'lines',
              distortionShape: 'prism',
              highlights: 0.1,
              edges: 0.25,
            }
          )
        );
      case 'paper-texture':
        return /* @__PURE__ */ React.createElement(
          PaperTexture,
          __spreadProps(
            __spreadValues(
              __spreadValues(
                {
                  key: `${sourceUrl}:paper-texture`,
                },
                commonProps
              ),
              NOMAND_PAPER_TEXTURE_SHAPE
            ),
            {
              colorFront: theme.accentColor,
              colorBack: theme.backgroundColor,
              contrast: tuning.paperTextureContrast,
              roughness: tuning.paperTextureRoughness,
              fiber: tuning.paperTextureFiber,
              scale: getPaperTextureOverscan(
                tuning.paperTextureRoughness,
                tuning.paperTextureFiber
              ),
            }
          )
        );
      case 'halftone-dots':
        return /* @__PURE__ */ React.createElement(
          HalftoneDots,
          __spreadProps(
            __spreadValues(
              {
                key: `${sourceUrl}:halftone-dots`,
              },
              commonProps
            ),
            {
              colorBack: theme.backgroundColor,
              colorFront: theme.accentColor,
              size: tuning.halftoneDotsSize,
              radius: tuning.halftoneDotsRadius,
              contrast: tuning.halftoneDotsContrast,
              originalColors: tuning.halftoneDotsOriginalColors,
              inverted: resolveHalftoneInversion(
                tuning.halftoneDotsInverted,
                tuning.halftoneDotsOriginalColors,
                isDaylight
              ),
              grid: 'hex',
              type: 'gooey',
              grainMixer: 0.12,
              grainOverlay: 0.06,
              grainSize: 0.5,
            }
          )
        );
      case 'lens-distortion':
        return /* @__PURE__ */ React.createElement(
          LensDistortion,
          __spreadProps(
            __spreadValues(
              __spreadValues(
                {
                  key: `${sourceUrl}:lens-distortion`,
                },
                commonProps
              ),
              NOMAND_LENS_SHAPE
            ),
            {
              spread: tuning.lensDistortionSpread,
              dispersion: tuning.lensDistortionDispersion,
              lensBulge: tuning.lensDistortionBulge,
              scale: getLensDistortionOverscan(
                tuning.lensDistortionBulge,
                tuning.lensDistortionSpread
              ),
            }
          )
        );
      default:
        return /* @__PURE__ */ React.createElement(
          ImageDithering,
          __spreadProps(
            __spreadValues(
              {
                key: `${sourceUrl}:dithering`,
              },
              commonProps
            ),
            {
              colorBack: theme.backgroundColor,
              colorFront: theme.accentColor,
              colorHighlight: theme.primaryColor,
              originalColors: tuning.originalColors,
              inverted: resolveDaylightInversion(
                tuning.inverted,
                tuning.originalColors,
                isDaylight
              ),
              type: tuning.ditheringType,
              size: tuning.size,
              colorSteps: tuning.colorSteps,
            }
          )
        );
    }
  };
  return renderShader();
}
export { profile, resolveNomandSourceUrl };
