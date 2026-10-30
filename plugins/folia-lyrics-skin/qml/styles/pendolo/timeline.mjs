// Derived from Folia a8da4437 (AGPL-3.0-only). See pendolo-reference.md.
const resolvePendoloFallbackAnchorIndex = (
  lines,
  currentLineIndex,
  lastValidLineIndex,
  hasObservedLine,
  currentTime
) => {
  var _a, _b;
  if (currentLineIndex >= 0 && currentLineIndex < lines.length) {
    return currentLineIndex;
  }
  if (!hasObservedLine) {
    return -1;
  }
  const finalLine = lines[lines.length - 1];
  const finalRenderEndTime =
    (_b =
      (_a = finalLine == null ? void 0 : finalLine.renderHints) == null
        ? void 0
        : _a.renderEndTime) != null
      ? _b
      : finalLine == null
        ? void 0
        : finalLine.endTime;
  if (finalRenderEndTime !== void 0 && currentTime > finalRenderEndTime) {
    return lines.length;
  }
  return lastValidLineIndex + 0.5;
};
const PENDOLO_VISIBLE_ARC_DEG = 110;
const PENDOLO_EDGE_FADE_DEG = 28;
const resolvePendoloRotatingLineOpacity = (baseAngleDeg, wheelRotationDeg, baseOpacity) => {
  const visibleAngleDeg = Math.abs(baseAngleDeg + wheelRotationDeg);
  if (visibleAngleDeg >= PENDOLO_VISIBLE_ARC_DEG) return 0;
  const edgeProgress = Math.min(
    1,
    (PENDOLO_VISIBLE_ARC_DEG - visibleAngleDeg) / PENDOLO_EDGE_FADE_DEG
  );
  return baseOpacity * edgeProgress;
};
export { resolvePendoloFallbackAnchorIndex, resolvePendoloRotatingLineOpacity };
