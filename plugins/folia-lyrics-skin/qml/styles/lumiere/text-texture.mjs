// Exact source Pixi credit-label paint: wrapping/advance/ink come from native font queries.
import { sourceTextPainter } from './pixi-text-paint.mjs';
import { createCanvas } from './canvas.mjs';
import { optimalTextureSize } from '../sonnet/filters/kernel.mjs';
export function textTexture(node, resolution, registeredScreens) {
  const measured = node.metrics,
    style = node.style,
    key = JSON.stringify([node.text, style, measured, resolution, registeredScreens]);
  if (node._lumiereTexture && node._lumiereTexture.key === key) return node._lumiereTexture;
  const padding = style.padding || 0,
    width = Math.ceil(Math.ceil(Math.max(1, measured.width) + padding * 2) * resolution),
    height = Math.ceil(Math.ceil(Math.max(1, measured.height) + padding * 2) * resolution),
    size = optimalTextureSize(width, height, 1, registeredScreens),
    canvas = createCanvas();
  canvas.width = size.width;
  canvas.height = size.height;
  sourceTextPainter._renderTextToCanvas(
    style,
    padding,
    resolution,
    { canvas, context: canvas.getContext('2d') },
    Object.assign({}, measured, {
      fontProperties: {
        ascent: measured.fontAscent,
        descent: measured.fontDescent,
        fontSize: measured.fontAscent + measured.fontDescent,
      },
    })
  );
  const value = {
    key,
    source: {
      id: 'text-' + node.id,
      kind: 'canvas',
      width: size.width / resolution,
      height: size.height / resolution,
      pixelWidth: size.width,
      pixelHeight: size.height,
      resolution,
      resource: canvas,
    },
    frame: { x: 0, y: 0, width: width / resolution, height: height / resolution },
  };
  node._lumiereTexture = value;
  return value;
}
