// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { createRng } from '../lumiereRandom.mjs';
import { hexOf, mixRgb, WHITE } from '../color.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (126 ^ lumiereScaleMask) +
  Math.imul(41 ^ lumiereScaleMask, 57 ^ lumiereScaleMask) -
  ((126 ^ lumiereScaleMask) + Math.imul(41 ^ lumiereScaleMask, 57 ^ lumiereScaleMask));
const MAX_BURSTS = 14 + LUMIERE_NEUTRAL_OFFSET;
const BURST_DURATION = 0.6;
const SWEEP_STEP = 0.07;
const planBursts = (spec, lines, seed) => {
  const triggers = [];
  lines.forEach((line, lineIndex) => {
    var _a, _b;
    if (lineIndex < spec.offset || (lineIndex - spec.offset) % Math.max(1, spec.every) !== 0)
      return;
    const rng = createRng(`${seed}:burst:${lineIndex}`);
    const chosen = line.glyphs.filter(() => rng() < spec.density);
    if (chosen.length === 0 && line.glyphs.length > 0)
      chosen.push(line.glyphs[Math.floor(rng() * line.glyphs.length)]);
    const sweepStart = (_b = (_a = line.glyphs[0]) == null ? void 0 : _a.start) != null ? _b : 0;
    chosen.forEach((glyph, order) =>
      triggers.push({
        lineIndex,
        glyphIndex: glyph.glyphIndex,
        time: spec.mode === 'sweep' ? sweepStart + order * SWEEP_STEP : glyph.start,
        size: 0.7 + rng() * 0.6,
        dy: (rng() - 0.5) * 0.9,
      })
    );
  });
  return triggers.sort((a, b) => a.time - b.time);
};
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeOutExpo = (value) => {
  const t = clamp01(value);
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
};
const easeOutCubic = (value) => 1 - (1 - clamp01(value)) ** 3;
const burstLightBoost = (age) => (age < 0 ? 0 : 0.18 * Math.exp(-age / 0.1));
const createCrossBurst = (pixi, options) => {
  const { sprites } = options;
  const view = new pixi.Container();
  const pool = Array.from({ length: MAX_BURSTS }, () => {
    const holder = new pixi.Container();
    const make = (texture) => {
      const sprite = new pixi.Sprite(texture);
      sprite.anchor.set(0.5);
      holder.addChild(sprite);
      return sprite;
    };
    const ring = make(sprites.bokeh);
    const verticalGlow = make(sprites.streak);
    const horizontalGlow = make(sprites.streak);
    const verticalCore = make(sprites.streak);
    const horizontalCore = make(sprites.streak);
    const flash = make(sprites.dot);
    verticalGlow.rotation = Math.PI / 2;
    verticalCore.rotation = Math.PI / 2;
    holder.visible = false;
    view.addChild(holder);
    return { holder, flash, verticalGlow, verticalCore, horizontalGlow, horizontalCore, ring };
  });
  const update = (events) => {
    pool.forEach((burst, index) => {
      const event = events[index];
      if (!event || event.age < 0 || event.age > BURST_DURATION) {
        burst.holder.visible = false;
        return;
      }
      burst.holder.visible = true;
      const { age } = event;
      const L = event.length;
      const glowColor = hexOf(event.color);
      const coreColor = hexOf(mixRgb(event.color, WHITE, 0.75));
      const envelope = clamp01(age / 0.03) * Math.exp(-Math.max(0, age - 0.03) / 0.16);
      const spread = 1 + age * 2;
      burst.holder.position.set(event.x, event.y);
      const verticalLength = L * easeOutExpo(age / 0.08);
      for (const [sprite, thickness, alpha, tint] of [
        [burst.verticalGlow, L * 0.1 * spread, 0.6, glowColor],
        [burst.verticalCore, L * 0.02 * spread, 1, coreColor],
      ]) {
        sprite.position.set(0, -L * 0.2);
        sprite.width = Math.max(1, verticalLength);
        sprite.height = thickness;
        sprite.alpha = alpha * envelope;
        sprite.tint = tint;
      }
      const horizontalLength = L * 0.62 * easeOutExpo((age - 0.02) / 0.1);
      for (const [sprite, thickness, alpha, tint] of [
        [burst.horizontalGlow, L * 0.09 * spread, 0.55, glowColor],
        [burst.horizontalCore, L * 0.018 * spread, 0.95, coreColor],
      ]) {
        sprite.position.set(0, -L * 0.42);
        sprite.width = Math.max(1, horizontalLength);
        sprite.height = thickness;
        sprite.alpha = alpha * envelope * clamp01((age - 0.02) / 0.03);
        sprite.tint = tint;
      }
      const flashSize = L * (0.35 + age * 0.8);
      burst.flash.position.set(0, -L * 0.42);
      burst.flash.width = flashSize;
      burst.flash.height = flashSize;
      burst.flash.alpha = Math.exp(-age / 0.07);
      burst.flash.tint = coreColor;
      const ring = easeOutCubic(age / 0.4);
      const ringSize = L * 0.9 * ring;
      burst.ring.position.set(0, -L * 0.42);
      burst.ring.width = ringSize;
      burst.ring.height = ringSize;
      burst.ring.alpha = 0.35 * (1 - ring) * clamp01(age / 0.03);
      burst.ring.tint = glowColor;
    });
  };
  return {
    view,
    update,
    destroy: () => view.destroy({ children: true }),
  };
};
export { BURST_DURATION, MAX_BURSTS, burstLightBoost, createCrossBurst, planBursts };
