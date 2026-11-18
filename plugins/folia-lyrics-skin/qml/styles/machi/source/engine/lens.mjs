// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/lens.ts
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
} from '../../environment.mjs';
const MACHI_BASE_COC = 0.012;
const MACHI_REFERENCE_APERTURE = 8;
const resolveMachiLens = (tuning, zoom) => {
  const open = MACHI_REFERENCE_APERTURE / tuning.aperture;
  const depth = tuning.dofRange / Math.max(1e-3, zoom);
  return {
    focusBand: (3.4 * depth) / open,
    focusFalloff: (7.5 * depth) / Math.sqrt(open),
    coc: MACHI_BASE_COC * tuning.dof * open,
    tilt: MACHI_BASE_COC * Math.max(1, tuning.dof) * tuning.tiltShift,
  };
};
export { MACHI_BASE_COC, MACHI_REFERENCE_APERTURE, resolveMachiLens };
