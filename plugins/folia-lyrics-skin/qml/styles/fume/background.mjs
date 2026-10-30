// Derived from Folia a8da4437 (AGPL-3.0-only). See fume-reference.md.
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
import { colorWithAlpha, mixColors } from '../cadenza/color.mjs';
import { rememberBounded } from './text-cache.mjs';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (from, to, amount) => from + (to - from) * amount;
const hashString = (input) => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
const seeded = (seed) => {
  const hash = hashString(seed);
  return (hash % 1e4) / 1e4;
};
const buildShapePath = (context, shape) => {
  var _a, _b;
  context.beginPath();
  if (shape.kind === 'ring') {
    const gapStart = (_a = shape.ringGapStart) != null ? _a : -Math.PI * 0.18;
    const gapSize = clamp(
      (_b = shape.ringGapSize) != null ? _b : Math.PI * 0.2,
      0.18,
      Math.PI * 0.6
    );
    context.lineCap = 'round';
    context.ellipse(
      0,
      0,
      shape.width * 0.5,
      shape.width * 0.5,
      0,
      gapStart + gapSize,
      gapStart + Math.PI * 2
    );
  } else {
    const size = shape.width;
    if (shape.kind === 'square') {
      context.rect(-size * 0.5, -size * 0.5, size, size);
    } else if (shape.kind === 'cross') {
      const arm = size * 0.3;
      context.moveTo(-arm, -size * 0.5);
      context.lineTo(arm, -size * 0.5);
      context.lineTo(arm, -arm);
      context.lineTo(size * 0.5, -arm);
      context.lineTo(size * 0.5, arm);
      context.lineTo(arm, arm);
      context.lineTo(arm, size * 0.5);
      context.lineTo(-arm, size * 0.5);
      context.lineTo(-arm, arm);
      context.lineTo(-size * 0.5, arm);
      context.lineTo(-size * 0.5, -arm);
      context.lineTo(-arm, -arm);
      context.closePath();
    } else {
      const outer = size * 0.5;
      const inner = size * 0.13;
      context.moveTo(0, -outer);
      context.lineTo(inner, -inner);
      context.lineTo(outer, 0);
      context.lineTo(inner, inner);
      context.lineTo(0, outer);
      context.lineTo(-inner, inner);
      context.lineTo(-outer, 0);
      context.lineTo(-inner, -inner);
      context.closePath();
    }
  }
};
const shapeLineGradients = /* @__PURE__ */ new WeakMap();
const traceShape = (context, shape) => {
  context.save();
  context.translate(shape.x, shape.y);
  context.rotate(shape.rotation);
  buildShapePath(context, shape);
  context.stroke();
  context.restore();
};
const normalizeBounds = (bounds, worldWidth, worldHeight) => ({
  left: clamp(Math.min(bounds.left, bounds.right), 0, worldWidth),
  top: clamp(Math.min(bounds.top, bounds.bottom), 0, worldHeight),
  right: clamp(Math.max(bounds.left, bounds.right), 0, worldWidth),
  bottom: clamp(Math.max(bounds.top, bounds.bottom), 0, worldHeight),
});
const choosePaperHaloAnchor = ({
  paperBounds,
  worldWidth,
  worldHeight,
  width,
  height,
  seedKey,
}) => {
  const insideChance = seeded(`${seedKey}:inside-chance`);
  if (insideChance < 0.22) {
    return {
      x: clamp(
        mix(
          paperBounds.left + width * 0.12,
          paperBounds.right - width * 0.12,
          seeded(`${seedKey}:inside-x`)
        ),
        0,
        worldWidth
      ),
      y: clamp(
        mix(
          paperBounds.top + height * 0.12,
          paperBounds.bottom - height * 0.12,
          seeded(`${seedKey}:inside-y`)
        ),
        0,
        worldHeight
      ),
    };
  }
  const side = Math.floor(seeded(`${seedKey}:side`) * 4) % 4;
  const overflowX = width * mix(0.16, 0.24, seeded(`${seedKey}:overflow-x`));
  const overflowY = height * mix(0.16, 0.24, seeded(`${seedKey}:overflow-y`));
  const spanJitterX = width * mix(-0.18, 0.18, seeded(`${seedKey}:span-jitter-x`));
  const spanJitterY = height * mix(-0.18, 0.18, seeded(`${seedKey}:span-jitter-y`));
  if (side === 0) {
    return {
      x: clamp(paperBounds.left - overflowX, 0, worldWidth),
      y: clamp(
        mix(
          paperBounds.top - height * 0.12,
          paperBounds.bottom + height * 0.12,
          seeded(`${seedKey}:y`)
        ) + spanJitterY,
        0,
        worldHeight
      ),
    };
  }
  if (side === 1) {
    return {
      x: clamp(paperBounds.right + overflowX, 0, worldWidth),
      y: clamp(
        mix(
          paperBounds.top - height * 0.12,
          paperBounds.bottom + height * 0.12,
          seeded(`${seedKey}:y`)
        ) + spanJitterY,
        0,
        worldHeight
      ),
    };
  }
  if (side === 2) {
    return {
      x: clamp(
        mix(
          paperBounds.left - width * 0.12,
          paperBounds.right + width * 0.12,
          seeded(`${seedKey}:x`)
        ) + spanJitterX,
        0,
        worldWidth
      ),
      y: clamp(paperBounds.top - overflowY, 0, worldHeight),
    };
  }
  return {
    x: clamp(
      mix(
        paperBounds.left - width * 0.12,
        paperBounds.right + width * 0.12,
        seeded(`${seedKey}:x`)
      ) + spanJitterX,
      0,
      worldWidth
    ),
    y: clamp(paperBounds.bottom + overflowY, 0, worldHeight),
  };
};
const buildFumeBackgroundScene = ({ viewport, world, paperBounds, seed }) => {
  if (viewport.width <= 0 || viewport.height <= 0 || world.width <= 0 || world.height <= 0) {
    return {
      width: Math.max(world.width, viewport.width, 1),
      height: Math.max(world.height, viewport.height, 1),
      shapes: [],
    };
  }
  const worldWidth = Math.max(world.width, viewport.width * 1.2);
  const worldHeight = Math.max(world.height, viewport.height * 1.2);
  const baseUnit = clamp(Math.min(viewport.width, viewport.height) * 0.72, 320, 760);
  const defaultPaperBounds = {
    left: worldWidth * 0.24,
    top: worldHeight * 0.18,
    right: worldWidth * 0.76,
    bottom: worldHeight * 0.82,
  };
  const resolvedPaperBounds = normalizeBounds(
    paperBounds != null ? paperBounds : defaultPaperBounds,
    worldWidth,
    worldHeight
  );
  const shapeKinds = ['ring', 'square', 'cross', 'ring', 'square', 'cross'];
  const shapeCount = worldWidth > worldHeight ? 8 : 7;
  const sparkBands = ['treble', 'vocal', 'mid', 'treble', 'lowMid'];
  const sparkCount = worldWidth > worldHeight ? 12 : 9;
  const sparkAreaLeft = worldWidth * 0.2;
  const sparkAreaRight = worldWidth * 0.8;
  const sparkAreaTop = worldHeight * 0.18;
  const sparkAreaBottom = worldHeight * 0.82;
  const sparkAreaWidth = sparkAreaRight - sparkAreaLeft;
  const sparkAreaHeight = sparkAreaBottom - sparkAreaTop;
  const sparkColumns = Math.ceil(Math.sqrt(sparkCount * (worldWidth / Math.max(worldHeight, 1))));
  const sparkRows = Math.ceil(sparkCount / sparkColumns);
  const sparkCellWidth = sparkAreaWidth / sparkColumns;
  const sparkCellHeight = sparkAreaHeight / sparkRows;
  const baseShapes = Array.from({ length: shapeCount }).map((_, index) => {
    const localSeed = `${seed != null ? seed : 'fume'}:${worldWidth}:${worldHeight}:${index}`;
    const kind = shapeKinds[index % shapeKinds.length];
    const width = baseUnit * mix(0.82, 1.36, seeded(`${localSeed}:size`));
    const height = width;
    const anchor = choosePaperHaloAnchor({
      paperBounds: resolvedPaperBounds,
      worldWidth,
      worldHeight,
      width,
      height,
      seedKey: localSeed,
    });
    return {
      id: `fume-bg-${index}`,
      kind,
      x: anchor.x,
      y: anchor.y,
      width,
      height,
      rotation: mix(-Math.PI * 0.2, Math.PI * 0.2, seeded(`${localSeed}:rotation`)),
      rotationSpeed: mix(-0.045, 0.045, seeded(`${localSeed}:rotation-speed`)),
      strokeWidth: mix(0.25, 2.1, seeded(`${localSeed}:stroke-width`)),
      opacity: mix(0.01, 0.16, seeded(`${localSeed}:opacity`)),
      color: seeded(`${localSeed}:color`) > 0.5 ? 'accent' : 'secondary',
      depth: seeded(`${localSeed}:depth`),
      ringGapStart:
        kind === 'ring' ? mix(-Math.PI, Math.PI, seeded(`${localSeed}:gap-start`)) : void 0,
      ringGapSize:
        kind === 'ring'
          ? mix(Math.PI * 0.12, Math.PI * 0.24, seeded(`${localSeed}:gap-size`))
          : void 0,
    };
  });
  const sparkShapes = Array.from({ length: sparkCount }).map((_, index) => {
    const localSeed = `${seed != null ? seed : 'fume'}:${worldWidth}:${worldHeight}:spark:${index}`;
    const width = baseUnit * mix(0.1, 0.24, seeded(`${localSeed}:size`));
    const column = index % sparkColumns;
    const row = Math.floor(index / sparkColumns);
    const jitterX = mix(-0.32, 0.32, seeded(`${localSeed}:jitter-x`)) * sparkCellWidth;
    const jitterY = mix(-0.32, 0.32, seeded(`${localSeed}:jitter-y`)) * sparkCellHeight;
    const x = clamp(
      sparkAreaLeft + (column + 0.5) * sparkCellWidth + jitterX,
      sparkAreaLeft,
      sparkAreaRight
    );
    const y = clamp(
      sparkAreaTop + (row + 0.5) * sparkCellHeight + jitterY,
      sparkAreaTop,
      sparkAreaBottom
    );
    return {
      id: `fume-spark-${index}`,
      kind: 'spark',
      x,
      y,
      width,
      height: width,
      rotation: mix(-Math.PI, Math.PI, seeded(`${localSeed}:rotation`)),
      rotationSpeed: mix(-0.18, 0.18, seeded(`${localSeed}:rotation-speed`)),
      strokeWidth: mix(0.75, 1.7, seeded(`${localSeed}:stroke-width`)),
      opacity: mix(0.08, 0.22, seeded(`${localSeed}:opacity`)),
      color: seeded(`${localSeed}:color`) > 0.5 ? 'accent' : 'secondary',
      depth: seeded(`${localSeed}:depth`),
      audioBand: sparkBands[index % sparkBands.length],
    };
  });
  const shapes = [...baseShapes, ...sparkShapes].sort((left, right) => left.depth - right.depth);
  return {
    width: worldWidth,
    height: worldHeight,
    shapes,
  };
};
const lineGradients = /* @__PURE__ */ new WeakMap();
const LINE_GRADIENT_LIMIT = 256;
const drawFumeBackground = ({
  context,
  scene,
  theme,
  time = 0,
  audioLevels,
  parallax,
  objectOpacityMultiplier = 1,
}) => {
  var _a;
  const resolvedObjectOpacityMultiplier = clamp(objectOpacityMultiplier, 0, 2);
  let gradients = lineGradients.get(context);
  if (!gradients) {
    gradients = /* @__PURE__ */ new Map();
    lineGradients.set(context, gradients);
  }
  const createLineGradient = (shape, opacity) => {
    const key = `${shape.width}|${shape.height}|${opacity}|${theme.secondaryColor}|${theme.accentColor}`;
    const cached = gradients.get(key);
    if (cached) return cached;
    const gradient = context.createLinearGradient(
      -shape.width * 0.55,
      -shape.height * 0.28,
      shape.width * 0.55,
      shape.height * 0.28
    );
    gradient.addColorStop(0, colorWithAlpha(theme.secondaryColor, opacity * 0.18));
    gradient.addColorStop(
      0.28,
      colorWithAlpha(mixColors(theme.secondaryColor, theme.accentColor, 0.24), opacity * 0.58)
    );
    gradient.addColorStop(
      0.54,
      colorWithAlpha(mixColors(theme.secondaryColor, theme.accentColor, 0.62), opacity * 0.92)
    );
    gradient.addColorStop(1, colorWithAlpha(theme.accentColor, opacity * 0.7));
    return rememberBounded(gradients, key, gradient, LINE_GRADIENT_LIMIT);
  };
  const lineGradientsOf = (sceneShape, shape, opacity) => {
    const kept = shapeLineGradients.get(sceneShape);
    if (
      kept &&
      kept.context === context &&
      kept.secondaryColor === theme.secondaryColor &&
      kept.accentColor === theme.accentColor &&
      kept.opacity === opacity &&
      kept.width === shape.width &&
      kept.height === shape.height
    ) {
      return kept;
    }
    const made = {
      context,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      opacity,
      width: shape.width,
      height: shape.height,
      base: createLineGradient(shape, opacity * 0.56),
      top: createLineGradient(shape, opacity),
    };
    shapeLineGradients.set(sceneShape, made);
    return made;
  };
  const drawGradientGeometry = (sceneShape, shape, opacity) => {
    const baseWidth = Math.max(shape.strokeWidth * 0.28, 0.14);
    const topWidth = Math.max(shape.strokeWidth * 0.92, 0.78);
    const gradients2 = lineGradientsOf(sceneShape, shape, opacity);
    buildShapePath(context, shape);
    context.strokeStyle = gradients2.base;
    context.lineWidth = baseWidth;
    context.shadowBlur = 0;
    context.shadowColor = 'transparent';
    context.stroke();
    context.strokeStyle = gradients2.top;
    context.lineWidth = topWidth;
    context.shadowBlur = 0;
    context.shadowColor = 'transparent';
    context.stroke();
  };
  for (const shape of scene.shapes) {
    const bandValue = shape.audioBand
      ? audioLevels == null
        ? void 0
        : audioLevels[shape.audioBand]
      : void 0;
    const audioScale =
      bandValue === void 0 ? 1 : mix(0.95, 1.45, clamp((bandValue - 10) / 190, 0, 1));
    const audioOpacityBoost =
      bandValue === void 0 ? 1 : mix(0.85, 1.55, clamp((bandValue - 10) / 190, 0, 1));
    context.save();
    context.lineWidth = shape.strokeWidth;
    const shapeColor = shape.color === 'accent' ? theme.accentColor : theme.secondaryColor;
    const layerResponse = mix(0.58, 1.16, shape.depth);
    const parallaxStrength = (_a = parallax == null ? void 0 : parallax.strength) != null ? _a : 1;
    const parallaxOffsetX = parallax
      ? (parallax.cameraX - parallax.originX) * (1 - layerResponse) * parallaxStrength
      : 0;
    const parallaxOffsetY = parallax
      ? (parallax.cameraY - parallax.originY) * (1 - layerResponse) * parallaxStrength
      : 0;
    const renderedShape = __spreadProps(__spreadValues({}, shape), {
      x: shape.x + parallaxOffsetX,
      y: shape.y + parallaxOffsetY,
      width: shape.width * audioScale,
      height: shape.height * audioScale,
      rotation: shape.rotation + time * shape.rotationSpeed,
    });
    if (shape.kind === 'spark') {
      context.strokeStyle = colorWithAlpha(
        shapeColor,
        clamp(shape.opacity * audioOpacityBoost * resolvedObjectOpacityMultiplier, 0, 0.42)
      );
      context.lineWidth = shape.strokeWidth;
      context.shadowBlur = 10 * audioScale;
      context.shadowColor = colorWithAlpha(
        shapeColor,
        shape.opacity * audioOpacityBoost * 0.75 * resolvedObjectOpacityMultiplier
      );
      traceShape(context, renderedShape);
    } else {
      context.translate(renderedShape.x, renderedShape.y);
      context.rotate(renderedShape.rotation);
      drawGradientGeometry(
        shape,
        renderedShape,
        clamp(shape.opacity * audioOpacityBoost * resolvedObjectOpacityMultiplier, 0, 0.42)
      );
    }
    context.restore();
  }
};
export { buildFumeBackgroundScene, drawFumeBackground };
