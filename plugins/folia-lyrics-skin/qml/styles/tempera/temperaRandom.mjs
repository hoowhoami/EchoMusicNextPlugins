// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.
import { hashVisualizerSeed } from './seed-hash.mjs';
import {
  hashVisualizerSeed as hashVisualizerSeed2,
  mixVisualizerSeed,
  visualizerHash01,
} from './seed-hash.mjs';
const chooseWithoutRepeat = (choices, seed, previous) => {
  const start = hashVisualizerSeed(seed) % choices.length;
  for (let offset = 0; offset < choices.length; offset += 1) {
    const candidate = choices[(start + offset) % choices.length];
    if (candidate !== previous) return candidate;
  }
  return choices[start];
};
export {
  chooseWithoutRepeat,
  hashVisualizerSeed2 as hashTemperaSeed,
  mixVisualizerSeed as mixTemperaSeed,
  visualizerHash01 as temperaHash01,
};
