// Match precisely the inputs sent to native shaping. Color, anchors and poses
// remain on each source primitive and never invalidate an identical glyph mask.
export function textIdentity(resource) {
  return JSON.stringify([
    resource.metrics.lines,
    resource.style.fontSize,
    Number(resource.style.fontWeight) || 400,
    resource.style.letterSpacing || 0,
    resource.metrics.strokeWidth,
  ]);
}
