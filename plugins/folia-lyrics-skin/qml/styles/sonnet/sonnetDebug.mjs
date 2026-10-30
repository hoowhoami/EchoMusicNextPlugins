// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty,
  __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
    key in obj
      ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value })
      : (obj[key] = value),
  __spreadValues = (a, b) => {
    for (var prop in b || (b = {})) __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  };
import { resolveSonnetFrameLocalDimensions } from './sonnetFrameDecor.mjs';
import {
  SONNET_THEMED_GEO_VARIANT_START,
  SONNET_THEMED_GEO_VARIANTS,
} from './sonnetThemedShotMg.mjs';
import {
  SONNET_OPEN_GEO_VARIANT_START,
  SONNET_OPEN_GEO_VARIANTS,
} from './sonnetOpenFrameShotMg.mjs';
import { SONNET_ADDITIONAL_GEO_VARIANT_START } from './sonnetAdditionalShotMg.mjs';
import {
  SONNET_EXTENDED_GEO_VARIANT_START,
  SONNET_EXTENDED_GEO_VARIANTS,
} from './sonnetExtendedShotMg.mjs';
import { SONNET_BACKGROUND_MG_VARIANTS } from './sonnetBackgroundMgVariants.mjs';
import { SONNET_BACKGROUND_DECOR_VARIANTS } from './sonnetBackgroundDecor.mjs';
import { SONNET_FIXED_GEO_VARIANTS } from './sonnetFixedGeoVariants.mjs';
const DEBUG_SONNET_MEASURED_BOUNDS = !1,
  ROLE_COLORS = {
    hero: 16729190,
    'semi-hero': 16755200,
    support: 4508927,
    decoration: 8947848,
  },
  buildSonnetMeasuredBoundsDebug = (pixi, placements) => {
    const layer = new pixi.Container();
    return (
      (layer.visible = DEBUG_SONNET_MEASURED_BOUNDS),
      DEBUG_SONNET_MEASURED_BOUNDS &&
        placements.forEach((placement) => {
          var _a;
          const color = (_a = ROLE_COLORS[placement.role]) != null ? _a : 16777215,
            local = resolveSonnetFrameLocalDimensions(placement),
            box = new pixi.Graphics()
              .rect(-local.width / 2, -local.height / 2, local.width, local.height)
              .stroke({ color, width: 1.5, alpha: 0.9 })
              .circle(0, 0, 2.5)
              .fill({ color, alpha: 0.9 });
          (box.position.set(placement.x, placement.y),
            (box.rotation = placement.rotation),
            layer.addChild(box));
        }),
      layer
    );
  },
  sonnetDebugState = {
    activeShot: null,
    paragraphIndex: -1,
  },
  resolveSonnetGeoVariantLabel = (variant) => {
    if (variant >= SONNET_EXTENDED_GEO_VARIANT_START) {
      const name = SONNET_EXTENDED_GEO_VARIANTS[variant - SONNET_EXTENDED_GEO_VARIANT_START];
      return name ? `extended #${variant} ${name}` : `extended #${variant}`;
    }
    if (variant >= SONNET_OPEN_GEO_VARIANT_START) {
      const name = SONNET_OPEN_GEO_VARIANTS[variant - SONNET_OPEN_GEO_VARIANT_START];
      return name ? `open #${variant} ${name}` : `open #${variant}`;
    }
    if (variant >= SONNET_THEMED_GEO_VARIANT_START) {
      const name = SONNET_THEMED_GEO_VARIANTS[variant - SONNET_THEMED_GEO_VARIANT_START];
      return name ? `themed #${variant} ${name}` : `themed #${variant}`;
    }
    return variant >= SONNET_ADDITIONAL_GEO_VARIANT_START
      ? `additional #${variant}`
      : `core #${variant}`;
  },
  labelFor = (prefix, names, variant) => {
    const name = names[variant];
    return name ? `${prefix} #${variant} ${name}` : `${prefix} #${variant}`;
  },
  createSonnetShotDebugInfo = (options) => ({
    programSeed: options.programSeed,
    paragraphId: options.paragraphId,
    paragraphKind: options.paragraphKind,
    shotId: options.shot.id,
    shotKind: options.shot.kind,
    shotIndex: options.shotIndex,
    shotCount: options.shotCount,
    lineIndices: [...options.shot.lineIndices],
    startTime: options.shot.startTime,
    endTime: options.shot.endTime,
    camera: __spreadValues({}, options.shot.camera),
    baseFontSize: options.baseFontSize,
    wordCount: options.wordCount,
    geoVariant: options.geoVariant,
    geoVariantLabel:
      options.geoVariant === null ? null : resolveSonnetGeoVariantLabel(options.geoVariant),
    backgroundMgLabel: labelFor('bgMG', SONNET_BACKGROUND_MG_VARIANTS, options.backgroundMgVariant),
    fixedGeoLabel:
      options.fixedGeoVariant === null
        ? null
        : labelFor('fixedGeo', SONNET_FIXED_GEO_VARIANTS, options.fixedGeoVariant),
    backgroundDecorLabel: labelFor(
      'decor',
      SONNET_BACKGROUND_DECOR_VARIANTS,
      options.backgroundDecorVariant
    ),
    segments: options.placements.map((placement) => {
      var _a;
      return {
        text:
          (_a = options.segmentTexts[placement.segmentIndex]) != null ? _a : placement.displayText,
        role: placement.role,
        x: placement.x,
        y: placement.y,
        width: placement.measuredWidth,
        height: placement.measuredHeight,
        fontScale: placement.fontScale,
        vertical: placement.vertical,
      };
    }),
  });
export {
  DEBUG_SONNET_MEASURED_BOUNDS,
  buildSonnetMeasuredBoundsDebug,
  createSonnetShotDebugInfo,
  resolveSonnetGeoVariantLabel,
  sonnetDebugState,
};
