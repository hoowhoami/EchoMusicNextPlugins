// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { hashVisualizerSeed } from './visualizerSeedHash.mjs';
const createRng = (seed) => {
  let state = typeof seed === 'number' ? seed >>> 0 : hashVisualizerSeed(seed);
  return () => {
    state = (state + 1831565813) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const createRngAt = (seed, skip) => {
  const state = typeof seed === 'number' ? seed >>> 0 : hashVisualizerSeed(seed);
  return createRng((state + Math.imul(skip, 1831565813)) >>> 0);
};
export { createRng, createRngAt };
