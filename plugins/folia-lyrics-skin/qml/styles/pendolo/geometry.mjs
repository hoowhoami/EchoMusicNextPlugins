// Derived from Folia a8da4437 (AGPL-3.0-only). See pendolo-reference.md.
import { prepareWithSegments, layoutWithLines } from './pretext.mjs';
function calculatePendoloWheelLayout(
  lines,
  targetLineIndex,
  escapementAngleOffsetRad,
  viewportWidth,
  viewportHeight,
  tuning,
  radiusOffsetPx = 0,
  lineBlockHeights
) {
  var _a, _b, _c, _d, _e, _f, _g;
  const centerX = viewportWidth * tuning.wheelCenterX;
  const centerY = viewportHeight * tuning.wheelCenterY;
  const baseRadius = Math.min(viewportWidth, viewportHeight) * tuning.arcRadius + radiusOffsetPx;
  const totalArcRad = (tuning.arcAngleDeg * Math.PI) / 180;
  const visibleWindowCount = 9;
  const angleStepRad = totalArcRad / Math.max(1, visibleWindowCount - 1);
  const isIntegerTarget = Number.isInteger(targetLineIndex);
  const activeIndex =
    isIntegerTarget && targetLineIndex >= 0 && targetLineIndex < lines.length
      ? targetLineIndex
      : -1;
  const hasActive = activeIndex >= 0;
  const items = [];
  const centerRef = Math.max(
    0,
    Math.min(lines.length - 1, Math.floor(targetLineIndex >= 0 ? targetLineIndex : 0))
  );
  const windowStart = Math.max(0, centerRef - 8);
  const windowEnd = Math.min(lines.length - 1, centerRef + 8);
  const visualAngles = /* @__PURE__ */ new Map();
  if (
    Number.isInteger(targetLineIndex) &&
    targetLineIndex >= windowStart &&
    targetLineIndex <= windowEnd
  ) {
    const activeIndex2 = targetLineIndex;
    visualAngles.set(activeIndex2, 0);
    for (let index = activeIndex2 + 1; index <= windowEnd; index += 1) {
      const previousHeight =
        (_a = lineBlockHeights == null ? void 0 : lineBlockHeights[index - 1]) != null ? _a : 0;
      const currentHeight =
        (_b = lineBlockHeights == null ? void 0 : lineBlockHeights[index]) != null ? _b : 0;
      const spacing = Math.max(
        angleStepRad,
        (previousHeight + currentHeight + 24) / (2 * baseRadius)
      );
      visualAngles.set(index, ((_c = visualAngles.get(index - 1)) != null ? _c : 0) + spacing);
    }
    for (let index = activeIndex2 - 1; index >= windowStart; index -= 1) {
      const nextHeight =
        (_d = lineBlockHeights == null ? void 0 : lineBlockHeights[index + 1]) != null ? _d : 0;
      const currentHeight =
        (_e = lineBlockHeights == null ? void 0 : lineBlockHeights[index]) != null ? _e : 0;
      const spacing = Math.max(angleStepRad, (nextHeight + currentHeight + 24) / (2 * baseRadius));
      visualAngles.set(index, ((_f = visualAngles.get(index + 1)) != null ? _f : 0) - spacing);
    }
  }
  for (let i = windowStart; i <= windowEnd; i++) {
    const line = lines[i];
    if (!line) continue;
    const distanceIndex = i - targetLineIndex;
    const rawAngleRad =
      ((_g = visualAngles.get(i)) != null ? _g : distanceIndex * angleStepRad) +
      escapementAngleOffsetRad;
    if (Math.abs(rawAngleRad) >= Math.PI / 2) continue;
    const x = centerX + baseRadius * Math.cos(rawAngleRad);
    const y = centerY + baseRadius * Math.sin(rawAngleRad);
    const isActive = hasActive && i === activeIndex;
    const absDistance = Math.abs(distanceIndex);
    const alpha = Math.max(
      0.12,
      Math.pow(Math.cos(rawAngleRad * 0.75), 2.5) * (1 - absDistance * 0.18)
    );
    const scale = isActive ? tuning.activeScale : Math.max(0.7, 1 - absDistance * 0.08);
    items.push({
      line,
      index: i,
      angleRad: rawAngleRad,
      angleDeg: (rawAngleRad * 180) / Math.PI,
      x,
      y,
      isActive,
      distanceFromActive: absDistance,
      alpha,
      scale,
    });
  }
  return items;
}
function measurePendoloLineWidth(text, fontSpec) {
  var _a, _b;
  if (!text) return 0;
  try {
    const prepared = prepareWithSegments(text, fontSpec);
    const layout = layoutWithLines(prepared, 2e3, 32);
    return (_b = (_a = layout.lines[0]) == null ? void 0 : _a.width) != null ? _b : 0;
  } catch (e) {
    return text.length * 16;
  }
}
export { calculatePendoloWheelLayout, measurePendoloLineWidth };
