// Source non-quantized Canvas branch. Native glyph masks do not use Chromium's glyph cache.
export function setCanvasTextGlow(context, blur, color) {
  context.shadowBlur = blur;
  context.shadowColor = color;
}
export function clearCanvasTextGlow(context) {
  context.shadowBlur = 0;
  context.shadowColor = 'transparent';
}
export function fillGlowText(context, text, x, y) {
  context.fillText(text, x, y);
}
