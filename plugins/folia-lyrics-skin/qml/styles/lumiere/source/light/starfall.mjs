// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { createRng } from '../lumiereRandom.mjs';
import { compressLight, lightAt } from './rig.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (62 ^ lumiereScaleMask) +
  Math.imul(3 ^ lumiereScaleMask, 59 ^ lumiereScaleMask) -
  ((62 ^ lumiereScaleMask) + Math.imul(3 ^ lumiereScaleMask, 59 ^ lumiereScaleMask));
const starfallIgnition = (spec) => spec.opening * (0.45 + LUMIERE_NEUTRAL_OFFSET);
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeOutCubic = (value) => 1 - (1 - clamp01(value)) ** 3;
const createStarfall = (pixi, options) => {
  const { width, height, spec } = options;
  const aspect = width / height;
  const rng = createRng(`${options.seed}:starfall`);
  const view = new pixi.Container();
  const trails = new pixi.Container();
  const points = new pixi.Container();
  view.addChild(trails, points);
  const makeTrail = () => {
    const trail = new pixi.Sprite(options.streak);
    trail.anchor.set(1, 0.5);
    trail.rotation = Math.PI / 2;
    trails.addChild(trail);
    return trail;
  };
  const stars = Array.from({ length: spec.stars }, () => {
    const bright = rng() < 0.08;
    const sprite = new pixi.Sprite(bright ? options.star : options.dot);
    sprite.anchor.set(0.5);
    points.addChild(sprite);
    return {
      sprite,
      trail: makeTrail(),
      x: rng() * aspect,
      // 上密下疏。
      y: 0.02 + rng() ** 1.7 * 0.9,
      fromY: -0.05 - rng() * 0.25,
      // 倾泻：大多数在开场前段落下，少数拖到后段。
      delay: spec.opening * (0.02 + 0.7 * rng() ** 1.4),
      fall: 0.45 + rng() * 0.7,
      size: bright ? 0.018 + rng() * 0.02 : 3e-3 + rng() * 6e-3,
      bright,
      twinklePhase: rng() * Math.PI * 2,
      twinkleFreq: 0.4 + rng() * 1.8,
    };
  });
  const drops = Array.from({ length: spec.rain }, () => {
    const sprite = new pixi.Sprite(options.dot);
    sprite.anchor.set(0.5);
    points.addChild(sprite);
    const spread = (rng() + rng() + rng() - 1.5) / 1.5;
    return {
      sprite,
      trail: makeTrail(),
      x: aspect * (0.5 + spread * spec.rainSpread * 0.5),
      period: (1.25 / Math.max(spec.rainSpeed, 0.01)) * (0.7 + rng() * 0.6),
      phase: rng(),
      size: 3e-3 + rng() * 5e-3,
      sway: (rng() - 0.5) * 0.02,
    };
  });
  const place = (sprite, trail, x, y, size, alpha, speed, color) => {
    sprite.visible = alpha > 4e-3;
    trail.visible = sprite.visible && speed > 0.05;
    if (!sprite.visible) return;
    sprite.position.set(x * height, y * height);
    sprite.width = size * height;
    sprite.height = size * height;
    sprite.alpha = alpha;
    sprite.tint = color;
    if (trail.visible) {
      trail.position.set(x * height, y * height);
      trail.width = Math.min(0.25, speed * 0.09) * height;
      trail.height = Math.max(1.5, size * height * 0.7);
      trail.alpha = alpha * 0.6;
      trail.tint = color;
    }
  };
  const update = (local, time, beams, color, fade) => {
    for (const star of stars) {
      const progress = (local - star.delay) / star.fall;
      if (progress <= 0) {
        star.sprite.visible = false;
        star.trail.visible = false;
        continue;
      }
      const eased = easeOutCubic(progress);
      const y = star.fromY + (star.y - star.fromY) * eased;
      const speed =
        progress < 1 ? ((star.y - star.fromY) * 3 * (1 - progress) ** 2) / star.fall : 0;
      const landedAt = star.delay + star.fall;
      const flash = local >= landedAt ? Math.exp(-(local - landedAt) / 0.25) : 0;
      const twinkle =
        0.55 + 0.45 * Math.sin(time * star.twinkleFreq * Math.PI * 2 + star.twinklePhase);
      const lit = compressLight(lightAt(beams, star.x, y));
      const base = progress < 1 ? 0.9 : (star.bright ? 0.7 : 0.45) * twinkle;
      const alpha = clamp01((base + lit * 0.8 + flash) * spec.brightness * fade);
      place(star.sprite, star.trail, star.x, y, star.size * (1 + flash * 1.5), alpha, speed, color);
    }
    const rainIn = clamp01((local - spec.opening * 0.6) / 1.5);
    for (const drop of drops) {
      const cycle = (time / drop.period + drop.phase) % 1;
      const y = -0.1 + cycle * 1.25;
      const x = drop.x + Math.sin(time * 0.7 + drop.phase * 6) * drop.sway;
      const lit = compressLight(lightAt(beams, x, y));
      const edge = clamp01(cycle / 0.08) * clamp01((1 - cycle) / 0.15);
      const alpha = clamp01((0.18 + lit * 1.1) * edge * rainIn * fade * spec.brightness);
      place(drop.sprite, drop.trail, x, y, drop.size, alpha, 1.25 / drop.period, color);
    }
  };
  return {
    view,
    update,
    destroy: () => view.destroy({ children: true }),
  };
};
export { createStarfall, starfallIgnition };
