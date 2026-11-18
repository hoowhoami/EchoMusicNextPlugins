// Copyright (c) 2026 chthollyphile. Derived from Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935; AGPL-3.0-only.
// Source: src/components/visualizer/visualizerSeedHash.ts
const hashVisualizerSeed = (value) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
const mixVisualizerSeed = (seed, salt) =>
  Math.imul((Math.trunc(seed) ^ salt) >>> 0, 2654435761) >>> 0;
const visualizerHash01 = (seed, index, salt) =>
  mixVisualizerSeed(seed + Math.imul(index + 1, 97), salt) / 4294967296;
const createVisualizerRng = (seed) => {
  let state = typeof seed === 'number' ? seed >>> 0 : hashVisualizerSeed(seed);
  return () => {
    state = (state + 1831565813) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const createVisualizerRngAt = (seed, skip) => {
  const state = typeof seed === 'number' ? seed >>> 0 : hashVisualizerSeed(seed);
  return createVisualizerRng((state + Math.imul(skip, 1831565813)) >>> 0);
};
export {
  createVisualizerRng,
  createVisualizerRngAt,
  hashVisualizerSeed,
  mixVisualizerSeed,
  visualizerHash01,
};
