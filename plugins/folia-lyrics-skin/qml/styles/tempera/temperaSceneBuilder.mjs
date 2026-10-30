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
import { resolveThemeFontStack, resolveThemeFontWeight } from './font-stacks.mjs';
import { buildWordColorRangesFromMatchers, prepareWordColorMatchers } from './word-colors.mjs';
import { hashTemperaSeed, temperaHash01 } from './temperaRandom.mjs';
import { easeTemperaEnter } from './temperaMotion.mjs';
import { resolveTemperaPalette } from './temperaPalette.mjs';
import { buildTemperaBlocks } from './temperaBlocks.mjs';
import { isTemperaLayoutSegment, resolveTemperaLayout } from './temperaLayout.mjs';
import {
  buildTemperaFragmentViews,
  buildTemperaTextViews,
  buildTemperaWatermark,
} from './temperaTextView.mjs';
import { createTemperaDifferenceFilter } from './temperaDifferenceFilter.mjs';
import {
  resolveTemperaPassResolution,
  resolveTemperaTransitionBlurResolution,
} from './temperaSceneFilters.mjs';
import { buildTemperaImageLayer } from './temperaImageLayer.mjs';
import {
  buildCrossRow,
  buildCrossingLines,
  buildDotGrid,
  buildHatchSpec,
  circlePolygon,
  rectPolygon,
} from './temperaHatch.mjs';
import {
  drawCrossMarks,
  drawHatchFill,
  drawLines,
  drawPolygonFill,
  drawPolygonOutline,
  drawSquareMarks,
} from './temperaShapes.mjs';
import { createSonnetPostProcessFilters } from '../sonnet/sonnetPostProcess.mjs';
const createTemperaTextFilter = (pixi, palette, inversion) => {
  if (!inversion && !palette.textGradient) return null;
  return createTemperaDifferenceFilter(pixi, {
    ink: palette.ink,
    paper: palette.paper,
    tint: palette.textGradient,
    inversion,
  });
};
const hasTemperaCreditsMetadata = (metadata) =>
  Boolean(
    (metadata.title && metadata.title.trim()) ||
    (metadata.artist && metadata.artist.trim()) ||
    (metadata.album && metadata.album.trim())
  );
const creditsCreep = (elapsed) => 1 - Math.exp(-Math.max(0, elapsed) / 7);
const CREDITS_DISC_COUNT = 3;
const buildTemperaCreditsPoster = (pixi, options) => {
  var _a, _b, _c;
  const { palette, metadata, width, height } = options;
  const { Container, Text, TextStyle } = pixi;
  const container = new Container();
  const filters = [];
  const items = [];
  const seed = hashTemperaSeed(
    `${(_a = metadata.title) != null ? _a : ''}|${(_b = metadata.artist) != null ? _b : ''}`
  );
  const diagonal = Math.hypot(width, height);
  const bleed = diagonal * 0.25;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const flip = temperaHash01(seed, 1, 229) > 0.5 ? 1 : -1;
  const gradient = palette.gradient
    ? { colors: palette.gradient, angle: temperaHash01(seed, 3, 197) * Math.PI * 2 }
    : null;
  const add = (node, item = {}) => {
    var _a2, _b2, _c2, _d, _e, _f, _g;
    items.push({
      node,
      baseX: node.x,
      baseY: node.y,
      baseAlpha: (_a2 = item.baseAlpha) != null ? _a2 : 1,
      enterDX: (_b2 = item.enterDX) != null ? _b2 : 0,
      enterDY: (_c2 = item.enterDY) != null ? _c2 : 0,
      delay: (_d = item.delay) != null ? _d : 0,
      driftX: (_e = item.driftX) != null ? _e : 0,
      driftY: (_f = item.driftY) != null ? _f : 0,
      grow: (_g = item.grow) != null ? _g : 0,
    });
    container.addChild(node);
  };
  container.addChild(
    drawPolygonFill(
      pixi,
      rectPolygon(-halfWidth - bleed, -halfHeight - bleed, width + bleed * 2, height + bleed * 2),
      palette.tone1,
      1,
      gradient
    )
  );
  const tones = [palette.tone2, palette.tone3, palette.tone4];
  const baseAngle = temperaHash01(seed, 4, 241) * Math.PI * 2;
  const hatchIndex =
    Math.floor(temperaHash01(seed, 5, 251) * CREDITS_DISC_COUNT) % CREDITS_DISC_COUNT;
  for (let index = 0; index < CREDITS_DISC_COUNT; index += 1) {
    const angle =
      baseAngle +
      (index * Math.PI * 2) / CREDITS_DISC_COUNT +
      (temperaHash01(seed, index, 257) - 0.5) * 0.7;
    const distance = diagonal * (0.58 + temperaHash01(seed, index, 263) * 0.14);
    const radius = distance + diagonal * (0.06 + temperaHash01(seed, index, 269) * 0.1);
    const polygon = circlePolygon(0, 0, radius, 72);
    const cx = Math.cos(angle) * distance;
    const cy = Math.sin(angle) * distance;
    const delay = 0.08 + index * 0.16;
    const travel = {
      enterDX: Math.cos(angle) * diagonal * 0.16,
      enterDY: Math.sin(angle) * diagonal * 0.16,
      driftX: -Math.cos(angle) * diagonal * 0.024,
      driftY: -Math.sin(angle) * diagonal * 0.024,
    };
    const place = (node, itemDelay) => {
      node.position.set(cx, cy);
      add(node, __spreadProps(__spreadValues({}, travel), { delay: itemDelay }));
    };
    place(drawPolygonFill(pixi, polygon, tones[index], 1, gradient), delay);
    if (index === hatchIndex) {
      place(
        drawHatchFill(pixi, polygon, buildHatchSpec(seed, 271), palette.paper, 0.28),
        delay + 0.06
      );
    }
    place(drawPolygonOutline(pixi, polygon, palette.ink, 2.4, 0.8), delay + 0.04);
  }
  const lines = buildCrossingLines(seed, 31, width, height, 2).map((line) => ({
    x1: line.x1 - halfWidth,
    y1: line.y1 - halfHeight,
    x2: line.x2 - halfWidth,
    y2: line.y2 - halfHeight,
  }));
  add(drawLines(pixi, lines, palette.tone4, 1.3, 0.6), { delay: 0.5, enterDX: width * 0.2 });
  if (options.tuning.showDecor) {
    const cornerX = halfWidth * 0.66 * flip;
    const cornerY = halfHeight * 0.62;
    add(
      drawCrossMarks(
        pixi,
        buildCrossRow(seed, 71, cornerX - width * 0.1, cornerY, 5, width * 0.05, 8),
        palette.tone4,
        2,
        0.8
      ),
      { delay: 0.62, enterDX: -width * 0.06 }
    );
    const box = rectPolygon(-cornerX - 19, -cornerY - 19, 38, 38);
    add(drawHatchFill(pixi, box, buildHatchSpec(seed, 67), palette.tone4, 0.7), {
      delay: 0.68,
      grow: 0.06,
    });
    add(drawPolygonOutline(pixi, box, palette.tone4, 1.2, 0.6), { delay: 0.72 });
  }
  const fontFamily = resolveThemeFontStack(options.theme);
  const fontWeight = String(resolveThemeFontWeight(options.theme, 600));
  const wrapWidth = Math.min(width * 0.72, diagonal * 0.52);
  const subtitle = [metadata.artist, metadata.album].filter(Boolean).join(' - ');
  const titleLayer = new Container();
  const titleSize = Math.max(26, Math.min(width, height) * 0.085 * options.lyricsFontScale);
  const buildLine = (text, size, offsetY, alpha) => {
    const node = new Text({
      text,
      style: new TextStyle({
        fontFamily,
        fontWeight,
        fontSize: size,
        fill: palette.ink,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: wrapWidth,
      }),
    });
    node.anchor.set(0.5);
    node.position.set(0, offsetY);
    node.alpha = alpha;
    titleLayer.addChild(node);
    return node;
  };
  const title = buildLine(
    ((_c = metadata.title) == null ? void 0 : _c.trim()) || '\u266A',
    titleSize,
    subtitle ? -titleSize * 0.35 : 0,
    1
  );
  if (subtitle)
    buildLine(subtitle, Math.max(14, titleSize * 0.34), title.height / 2 + titleSize * 0.22, 0.75);
  const titleFilter = createTemperaTextFilter(pixi, palette, options.tuning.textInversion);
  if (titleFilter) {
    titleLayer.filters = [titleFilter];
    filters.push(titleFilter);
  }
  add(titleLayer, { enterDY: diagonal * 0.03, delay: 0.78 });
  const updateTime = (elapsed) => {
    const creep = creditsCreep(elapsed);
    for (const item of items) {
      const enter = easeTemperaEnter((elapsed - item.delay) / 1.1);
      item.node.alpha = item.baseAlpha * enter;
      item.node.visible = enter > 1e-3;
      item.node.position.set(
        item.baseX + item.enterDX * (1 - enter) + item.driftX * creep,
        item.baseY + item.enterDY * (1 - enter) + item.driftY * creep
      );
      if (item.grow !== 0) item.node.scale.set(1 + item.grow * creep);
    }
  };
  updateTime(0);
  return { container, filters, updateTime };
};
const applyTemperaScenePostProcess = (pixi, container, tuning, seed, renderResolution) => {
  const filters = createSonnetPostProcessFilters(
    pixi,
    {
      lensDistortion: tuning.postProcessLensDistortion,
      lensDispersion: 0,
      noise: tuning.postProcessGrain * 0.35,
      contrast: tuning.postProcessContrast * 0.5,
      printEffects: {
        rgbShift: tuning.postProcessRgbShift,
        halftone: 0,
        vignette: tuning.postProcessVignette,
      },
    },
    seed
  );
  const resolution = resolveTemperaPassResolution(tuning, renderResolution);
  filters.forEach((filter) => {
    filter.resolution = resolution;
  });
  if (filters.length > 0) container.filters = filters;
  return filters;
};
const buildTemperaScene = (pixi, options, paragraph) => {
  const { Container, Graphics } = pixi;
  const width = Math.max(options.host.clientWidth, 320);
  const height = Math.max(options.host.clientHeight, 240);
  const container = new Container();
  const { tuning } = options;
  const palette = resolveTemperaPalette(options.theme, tuning, options.coverColors);
  const sceneSeed = hashTemperaSeed(`${options.programSeed}:${paragraph.id}`);
  const fontFamily = resolveThemeFontStack(options.theme);
  const fontWeight = resolveThemeFontWeight(options.theme, 600);
  const paperWash = new Graphics()
    .rect(0, 0, width, height)
    .fill({ color: pixi.Color.shared.setValue(palette.paper).toNumber(), alpha: 0.35 });
  paperWash.visible = tuning.showBlocks;
  container.addChild(paperWash);
  if (tuning.showBlocks) {
    const toneSpacing = Math.max(26, Math.sqrt((width * height) / 6e3));
    const screentone = drawSquareMarks(
      pixi,
      buildDotGrid(width, height, toneSpacing, 1.6),
      palette.tone4,
      0.05
    );
    container.addChild(screentone);
  }
  const postProcessFilters = [];
  const wordColorMatchers = prepareWordColorMatchers(options.theme.wordColors);
  const colorRangesByLine = new Map(
    paragraph.lines.map((line) => [
      line.sourceIndex,
      wordColorMatchers.length > 0
        ? buildWordColorRangesFromMatchers(line.line.fullText, wordColorMatchers)
        : [],
    ])
  );
  let lastImageId = null;
  const shots = paragraph.shots.map((shot, shotIndex) => {
    var _a;
    const shotContainer = new Container();
    const sliceSegments = shot.slices
      .map((slice) => {
        var _a2, _b;
        return {
          slice,
          segments:
            (_b =
              (_a2 = paragraph.lines.find((item) => item.sourceIndex === slice.lineIndex)) == null
                ? void 0
                : _a2.segments
                    .slice(slice.segmentStart, slice.segmentEnd)
                    .filter(isTemperaLayoutSegment)) != null
              ? _b
              : [],
        };
      })
      .filter((entry) => entry.segments.length > 0);
    const linesSegments = sliceSegments.map((entry) => entry.segments);
    const segmentColors = sliceSegments.map((entry) => {
      var _a2;
      const ranges = (_a2 = colorRangesByLine.get(entry.slice.lineIndex)) != null ? _a2 : [];
      return entry.segments.map((segment) => {
        var _a3, _b;
        return (_b =
          (_a3 = ranges.find(
            (range) =>
              range.startOffset < segment.endOffset && segment.startOffset < range.endOffset
          )) == null
            ? void 0
            : _a3.color) != null
          ? _b
          : null;
      });
    });
    const maxGraphemes = Math.max(
      3,
      ...linesSegments.map((segments) =>
        segments.reduce((sum, segment) => sum + segment.graphemes.length, 0)
      )
    );
    const baseFontSize =
      Math.max(34, Math.min(150, (width / Math.max(5, maxGraphemes * 1.05)) * 1.5)) *
      options.lyricsFontScale;
    const shotSeed = sceneSeed + shotIndex * 97;
    const blocks = buildTemperaBlocks(pixi, {
      kind: shot.kind,
      decor: shot.decor,
      palette,
      width,
      height,
      seed: shotSeed,
      showDecor: tuning.showDecor,
      flowAngle: shot.flowAngle,
    });
    blocks.container.visible = tuning.showBlocks;
    const images = buildTemperaImageLayer(pixi, {
      pool: tuning.layerImages,
      frequency: tuning.layerImageFrequency,
      depth: tuning.layerImageDepth,
      textures: options.imageTextures,
      width,
      height,
      seed: shotSeed,
      flowAngle: shot.flowAngle,
      previousId: lastImageId,
    });
    lastImageId = (_a = images.chosenId) != null ? _a : lastImageId;
    const watermarkLayer = new Container();
    const textLayer = new Container();
    const echoLayer = new Container();
    const keywordLayer = new Container();
    shotContainer.addChild(
      blocks.container,
      images.back,
      watermarkLayer,
      textLayer,
      echoLayer,
      keywordLayer,
      images.front
    );
    const placements = resolveTemperaLayout({
      lines: linesSegments,
      shotKind: shot.kind,
      width,
      height,
      baseFontSize,
      fontFamily,
      fontWeight,
      seed: shotSeed,
      segmentColors,
      settleStretch: tuning.glyphSettleStretch,
    });
    const glyphs = buildTemperaTextViews(pixi, {
      placements,
      palette,
      fontFamily,
      fontWeight,
      shadowEnabled: tuning.showDecor,
      echoCount: tuning.showDecor && !options.staticMode ? 2 : 0,
      textLayer,
      echoLayer,
      keywordLayer,
    });
    if (shot.decor.watermark && tuning.showDecor) {
      buildTemperaWatermark(pixi, {
        watermark: shot.decor.watermark,
        palette,
        fontFamily,
        fontWeight,
        baseFontSize,
        width,
        height,
        layer: watermarkLayer,
      });
    }
    if (shot.decor.fragments.length > 0 && tuning.showDecor) {
      buildTemperaFragmentViews(pixi, {
        fragments: shot.decor.fragments,
        palette,
        fontFamily,
        fontWeight,
        baseFontSize,
        width,
        height,
        layer: textLayer,
      });
    }
    const textFilter = createTemperaTextFilter(pixi, palette, tuning.textInversion);
    if (textFilter) {
      textLayer.filters = [textFilter];
      postProcessFilters.push(textFilter);
    }
    const revealDoneTime =
      glyphs.length > 0
        ? Math.max(...glyphs.map((glyph) => glyph.motion.settleTime))
        : shot.startTime;
    shotContainer.pivot.set(width / 2, height / 2);
    shotContainer.position.set(width / 2, height / 2);
    shotContainer.visible = false;
    container.addChild(shotContainer);
    return {
      shot,
      container: shotContainer,
      glyphs,
      blocks,
      images,
      baseX: shotContainer.x,
      baseY: shotContainer.y,
      textLayer,
      revealDoneTime,
    };
  });
  const baseFilters = [];
  if (tuning.postProcessEnabled && !options.staticMode) {
    const sceneFilters = applyTemperaScenePostProcess(
      pixi,
      container,
      tuning,
      sceneSeed,
      options.renderResolution
    );
    if (sceneFilters.length > 0) {
      container.filterArea = new pixi.Rectangle(0, 0, width, height);
      baseFilters.push(...sceneFilters);
      postProcessFilters.push(...sceneFilters);
    }
  }
  const transitionBlurFilter =
    tuning.enableTransitions && !options.staticMode
      ? new pixi.BlurFilter({
          strength: 0,
          quality: 1,
          kernelSize: 5,
          resolution: resolveTemperaTransitionBlurResolution(tuning, options.renderResolution),
        })
      : null;
  if (transitionBlurFilter) {
    transitionBlurFilter.repeatEdgePixels = true;
    postProcessFilters.push(transitionBlurFilter);
  }
  container.visible = false;
  return {
    paragraph,
    container,
    shots,
    palette,
    postProcessFilters,
    baseFilters,
    transitionBlurFilter,
    transitionBlurAttached: false,
    activeShotIndex: -1,
  };
};
export { buildTemperaCreditsPoster, buildTemperaScene, hasTemperaCreditsMetadata };
