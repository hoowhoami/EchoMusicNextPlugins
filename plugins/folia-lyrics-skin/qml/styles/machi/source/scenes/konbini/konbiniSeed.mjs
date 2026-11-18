// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/scenes/konbini/konbiniSeed.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../../environment.mjs';
import { createVisualizerRng } from '../../_shared/components/visualizer/visualizerSeedHash.mjs';
const resolveKonbiniVariation = (seed) => {
  const random = createVisualizerRng(`machi:${seed}`);
  const pick = (min, max) => min + (max - min) * random();
  return {
    bikeSlot: random() < 0.5 ? 0 : 1,
    secondBike: random() < 0.45,
    bikeYaw: pick(-0.12, 0.12),
    umbrellaInStand: random() < 0.75,
    openUmbrella: random() < 0.35,
    posterLayout: Math.floor(random() * 3),
    windYaw: pick(-0.6, 0.6),
    windSlant: pick(0.06, 0.2),
    puddleOffset: [pick(-40, 40), pick(-40, 40)],
    puddleAmount: pick(0.45, 0.75),
    doorPhase: pick(0, 1),
    doorInterval: pick(22, 40),
    fanSpeed: pick(1.6, 3.2),
    shelfSeed: Math.floor(random() * 4294967295),
  };
};
export { resolveKonbiniVariation };
