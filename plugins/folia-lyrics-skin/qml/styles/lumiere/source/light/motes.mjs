// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { createRng } from '../lumiereRandom.mjs';
import { compressLight, lightAt } from './rig.mjs';
const lumiereScaleMask = 0 | 0;
const LUMIERE_NEUTRAL_OFFSET =
  (443 ^ lumiereScaleMask) +
  Math.imul(186 ^ lumiereScaleMask, 252 ^ lumiereScaleMask) -
  ((443 ^ lumiereScaleMask) + Math.imul(186 ^ lumiereScaleMask, 252 ^ lumiereScaleMask));
const wrap = (value, min, max) => {
  const span = max - min;
  return min + ((((value - min) % span) + span) % span);
};
const createMotes = (pixi, options) => {
  const { width, height, spec, texture } = options;
  const aspect = width / height;
  const rng = createRng(options.seed);
  const view = new pixi.Container();
  const margin = 0.08 + LUMIERE_NEUTRAL_OFFSET;
  const motes = Array.from({ length: spec.count }, () => {
    const sprite = new pixi.Sprite(texture);
    sprite.anchor.set(0.5);
    view.addChild(sprite);
    const depth = rng();
    return {
      sprite,
      bx: rng() * (aspect + margin * 2) - margin,
      by: rng() * (1 + margin * 2) - margin,
      depth,
      size: spec.sizeMin + (spec.sizeMax - spec.sizeMin) * depth * depth,
      phaseA: rng() * Math.PI * 2,
      phaseB: rng() * Math.PI * 2,
      freqA: 0.6 + rng() * 0.8,
      freqB: 0.5 + rng() * 0.9,
      twinklePhase: rng() * Math.PI * 2,
      twinkleFreq: 0.8 + rng() * 2.2,
    };
  });
  const update = (time, beams, color, intensity) => {
    const omega = (Math.PI * 2) / Math.max(spec.swirlPeriod, 0.1);
    for (const mote of motes) {
      const speed = 0.45 + mote.depth * 0.9;
      const swirl = spec.swirl * (0.5 + mote.depth);
      const x = wrap(
        mote.bx +
          spec.driftX * speed * time +
          swirl * Math.sin(time * omega * mote.freqA + mote.phaseA),
        -margin,
        aspect + margin
      );
      const y = wrap(
        mote.by +
          spec.driftY * speed * time +
          swirl * Math.cos(time * omega * mote.freqB + mote.phaseB),
        -margin,
        1 + margin
      );
      const lit = compressLight(lightAt(beams, x, y)) * spec.gain;
      const twinkle =
        1 -
        spec.twinkle +
        spec.twinkle *
          (0.5 + 0.5 * Math.sin(time * mote.twinkleFreq * Math.PI * 2 + mote.twinklePhase));
      const alpha = Math.min(1, (lit + spec.ambient) * twinkle * intensity);
      const sprite = mote.sprite;
      sprite.visible = alpha > 4e-3;
      if (!sprite.visible) continue;
      sprite.position.set(x * height, y * height);
      const px = mote.size * height;
      sprite.width = px;
      sprite.height = px;
      sprite.alpha = alpha;
      sprite.tint = color;
    }
  };
  return {
    view,
    update,
    destroy: () => view.destroy({ children: true }),
  };
};
export { createMotes };
