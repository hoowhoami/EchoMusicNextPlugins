// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
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
export { hashVisualizerSeed, mixVisualizerSeed, visualizerHash01 };
