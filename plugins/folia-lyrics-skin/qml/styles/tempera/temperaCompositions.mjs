// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
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
import { temperaHash01 } from './temperaRandom.mjs';
import {
  buildCrossRow,
  buildCrossingLines,
  buildHatchSpec,
  buildScribblePath,
  diamondPolygon,
  rectPolygon,
} from './temperaHatch.mjs';
import {
  drawConcentricDiamonds,
  drawCrossMarks,
  drawHatchFill,
  drawLines,
  drawPolygonFill,
  drawPolygonOutline,
  drawPolyline,
} from './temperaShapes.mjs';
import { TEMPERA_SPLIT_COMPOSITIONS } from './compositions/temperaSplitCompositions.mjs';
import { TEMPERA_BAND_COMPOSITIONS } from './compositions/temperaBandCompositions.mjs';
import { TEMPERA_FRAME_COMPOSITIONS } from './compositions/temperaFrameCompositions.mjs';
import { TEMPERA_POSTER_COMPOSITIONS } from './compositions/temperaPosterCompositions.mjs';
import { TEMPERA_SPARSE_COMPOSITIONS } from './compositions/temperaSparseCompositions.mjs';
import { TEMPERA_CINEMA_COMPOSITIONS } from './compositions/temperaCinemaCompositions.mjs';
import { TEMPERA_CHARM_COMPOSITIONS } from './compositions/temperaCharmCompositions.mjs';
import { TEMPERA_APERTURE_COMPOSITIONS } from './compositions/temperaApertureCompositions.mjs';
import { TEMPERA_SIGNAL_COMPOSITIONS } from './compositions/temperaSignalCompositions.mjs';
import { TEMPERA_CORRIDOR_COMPOSITIONS } from './compositions/temperaCorridorCompositions.mjs';
import { TEMPERA_MONOLITH_COMPOSITIONS } from './compositions/temperaMonolithCompositions.mjs';
import { TEMPERA_TERRAIN_COMPOSITIONS } from './compositions/temperaTerrainCompositions.mjs';
import { TEMPERA_MONOGATARI_COMPOSITIONS } from './compositions/temperaMonogatariCompositions.mjs';
import { resolveTemperaShotProfile } from './temperaShotProfiles.mjs';
const COMPOSITIONS = __spreadValues(
  __spreadValues(
    __spreadValues(
      __spreadValues(
        __spreadValues(
          __spreadValues(
            __spreadValues(
              __spreadValues(
                __spreadValues(
                  __spreadValues(
                    __spreadValues(
                      __spreadValues(
                        __spreadValues({}, TEMPERA_SPLIT_COMPOSITIONS),
                        TEMPERA_BAND_COMPOSITIONS
                      ),
                      TEMPERA_FRAME_COMPOSITIONS
                    ),
                    TEMPERA_POSTER_COMPOSITIONS
                  ),
                  TEMPERA_SPARSE_COMPOSITIONS
                ),
                TEMPERA_CINEMA_COMPOSITIONS
              ),
              TEMPERA_CHARM_COMPOSITIONS
            ),
            TEMPERA_APERTURE_COMPOSITIONS
          ),
          TEMPERA_SIGNAL_COMPOSITIONS
        ),
        TEMPERA_CORRIDOR_COMPOSITIONS
      ),
      TEMPERA_MONOLITH_COMPOSITIONS
    ),
    TEMPERA_TERRAIN_COMPOSITIONS
  ),
  TEMPERA_MONOGATARI_COMPOSITIONS
);
const resolveTemperaComposition = (kind) => {
  var _a;
  return (_a = COMPOSITIONS[kind]) != null ? _a : COMPOSITIONS['duo-split'];
};
const addCrossingLines = (ctx) => {
  const lines = buildCrossingLines(ctx.seed, 31, ctx.width, ctx.height, ctx.decor.crossCount);
  if (lines.length === 0) return;
  ctx.add(drawLines(ctx.pixi, lines, ctx.palette.tone4, 1.3, 0.6), {
    delay: 0.14,
    span: 0.6,
    enterDX: ctx.width * 0.25,
  });
};
const addMotif = (ctx) => {
  const { width, height, palette, decor } = ctx;
  const cornerX = temperaHash01(ctx.seed, 61, 7) > 0.5 ? width * 0.14 : width * 0.86;
  const cornerY = temperaHash01(ctx.seed, 63, 7) > 0.5 ? height * 0.18 : height * 0.82;
  switch (decor.motif) {
    case 'diamonds':
      ctx.add(drawConcentricDiamonds(ctx.pixi, cornerX, cornerY, 34, 34, 3, palette.tone4, 0.8), {
        delay: 0.34,
        drift: true,
      });
      return;
    case 'hatch-twin': {
      const spec = __spreadProps(__spreadValues({}, buildHatchSpec(ctx.seed, 67)), {
        angle: decor.hatchAngle,
      });
      [0, 1].forEach((index) => {
        const box = rectPolygon(cornerX - 34 + index * 46, cornerY - 26, 38, 38);
        ctx.add(
          drawHatchFill(
            ctx.pixi,
            box,
            index === 0
              ? spec
              : __spreadProps(__spreadValues({}, spec), { spacing: spec.spacing * 0.55 }),
            palette.tone4,
            0.75
          ),
          { delay: 0.34 + index * 0.05, grow: true }
        );
        ctx.add(drawPolygonOutline(ctx.pixi, box, palette.tone4, 1.2, 0.6), {
          delay: 0.38 + index * 0.05,
        });
      });
      return;
    }
    case 'band-cross':
      ctx.add(
        drawCrossMarks(
          ctx.pixi,
          buildCrossRow(
            ctx.seed,
            71,
            cornerX - width * 0.1,
            cornerY,
            5,
            width * 0.05,
            8,
            decor.hatchAngle * 0.4
          ),
          palette.tone4,
          2,
          0.8
        ),
        { delay: 0.34, span: 0.5 }
      );
      return;
    case 'poster-diamond':
      ctx.add(
        drawPolygonFill(
          ctx.pixi,
          diamondPolygon(
            cornerX < width / 2 ? -width * 0.04 : width * 1.04,
            cornerY,
            width * 0.14,
            height * 0.2
          ),
          palette.tone3,
          0.85
        ),
        { delay: 0.32, span: 0.55, enterDX: (cornerX < width / 2 ? -1 : 1) * width * 0.1 }
      );
      return;
    case 'doodle':
    default:
      ctx.add(
        drawPolyline(
          ctx.pixi,
          buildScribblePath(
            decor.scribbleSeed,
            73,
            cornerX,
            cornerY,
            Math.min(width, height) * 0.08,
            3
          ),
          palette.tone4,
          1.5,
          0.72
        ),
        { delay: 0.34, span: 0.6 }
      );
  }
};
const drawTemperaComposition = (ctx) => {
  resolveTemperaComposition(ctx.kind)(ctx);
  if (resolveTemperaShotProfile(ctx.kind).sharedDecor === false) return;
  addCrossingLines(ctx);
  if (ctx.showDecor) addMotif(ctx);
};
export { drawTemperaComposition, resolveTemperaComposition };
