// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { clamp01, easeTemperaEnter, easeTemperaInOut } from './temperaMotion.mjs';
import { temperaHash01 } from './temperaRandom.mjs';
const ALIGN_BANDS = {
  left: { from: 0.14, to: 0.32 },
  center: { from: 0.4, to: 0.6 },
  right: { from: 0.68, to: 0.86 },
  free: { from: 0.12, to: 0.88 },
};
const VERTICAL_ALIGN_BANDS = {
  top: { from: 0.14, to: 0.32 },
  center: { from: 0.4, to: 0.6 },
  bottom: { from: 0.68, to: 0.86 },
  free: { from: 0.12, to: 0.88 },
};
const resolveTemperaImagePlacement = (image, seed) => {
  var _a, _b;
  const horizontalBand = (_a = ALIGN_BANDS[image.align]) != null ? _a : ALIGN_BANDS.free;
  const verticalBand =
    (_b = VERTICAL_ALIGN_BANDS[image.verticalAlign]) != null ? _b : VERTICAL_ALIGN_BANDS.bottom;
  return {
    x:
      horizontalBand.from + (horizontalBand.to - horizontalBand.from) * temperaHash01(seed, 1, 251),
    y: verticalBand.from + (verticalBand.to - verticalBand.from) * temperaHash01(seed, 2, 257),
    scale: image.scale * (0.9 + temperaHash01(seed, 3, 263) * 0.2),
    rotation: (temperaHash01(seed, 4, 269) - 0.5) * 0.08,
    opacity: image.opacity,
    flip: temperaHash01(seed, 5, 271) > 0.5,
  };
};
const resolveTemperaShotImage = (pool, frequency, seed, previousId) => {
  if (pool.length === 0) return null;
  if (temperaHash01(seed, 6, 277) >= clamp01(frequency)) return null;
  const start = Math.floor(temperaHash01(seed, 7, 281) * pool.length) % pool.length;
  for (let offset = 0; offset < pool.length; offset += 1) {
    const candidate = pool[(start + offset) % pool.length];
    if (candidate.id !== previousId) return candidate;
  }
  return pool[start];
};
const buildTemperaImageLayer = (pixi, options) => {
  var _a;
  const back = new pixi.Container();
  const front = new pixi.Container();
  const flowX = Math.cos(options.flowAngle);
  const flowY = Math.sin(options.flowAngle);
  const carry = Math.max(options.width, options.height) * 0.09;
  const chosen = resolveTemperaShotImage(
    options.pool,
    options.frequency,
    options.seed,
    options.previousId
  );
  const texture = chosen ? options.textures.get(chosen.id) : void 0;
  if (!chosen || !texture) {
    return {
      back,
      front,
      updateTime: () => void 0,
      applyPool: () => void 0,
      chosenId: (_a = chosen == null ? void 0 : chosen.id) != null ? _a : null,
    };
  }
  const sprite = new pixi.Sprite(texture);
  sprite.anchor.set(0.5);
  (options.depth === 'front' ? front : back).addChild(sprite);
  const creepScale = 0.6 + temperaHash01(options.seed, 8, 283) * 0.8;
  let baseX = 0;
  let baseY = 0;
  let baseAlpha = 1;
  const place = (image) => {
    const placement = resolveTemperaImagePlacement(image, options.seed);
    const uniform = texture.height > 0 ? (options.height * placement.scale) / texture.height : 1;
    sprite.scale.set(uniform * (placement.flip ? -1 : 1), uniform);
    sprite.rotation = placement.rotation;
    baseX = placement.x * options.width;
    baseY = placement.y * options.height;
    baseAlpha = placement.opacity;
  };
  place(chosen);
  sprite.position.set(baseX, baseY);
  const applyPool = (pool) => {
    const next = pool.find((image) => image.id === chosen.id);
    if (next) place(next);
  };
  const updateTime = (time, shotStart, shotEnd, lyricEnd) => {
    const duration = Math.max(shotEnd - shotStart, 0.2);
    const paceDuration = Math.max((lyricEnd != null ? lyricEnd : shotEnd) - shotStart, 0.2);
    const progress = clamp01((time - shotStart) / duration);
    const creep = easeTemperaInOut(progress) * carry * 0.35 * creepScale;
    const enter = easeTemperaEnter((time - shotStart - paceDuration * 0.1) / (paceDuration * 0.5));
    sprite.alpha = baseAlpha * enter;
    sprite.visible = enter > 1e-3;
    sprite.position.set(baseX + flowX * creep, baseY + flowY * creep);
  };
  return { back, front, updateTime, applyPool, chosenId: chosen.id };
};
export { buildTemperaImageLayer, resolveTemperaImagePlacement, resolveTemperaShotImage };
