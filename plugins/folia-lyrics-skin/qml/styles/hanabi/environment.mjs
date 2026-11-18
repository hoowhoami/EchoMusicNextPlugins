import { SourceCanvas } from '../lumiere/canvas.mjs';
export const document = {
  createElement(kind) {
    if (kind !== 'canvas') throw new Error('Only immutable canvas preparation is supported');
    return new SourceCanvas();
  },
};
export const OffscreenCanvas = undefined;
export const globalThis = { devicePixelRatio: 1 };
