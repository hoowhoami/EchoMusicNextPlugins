// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const resolveSonnetCameraTrackingGlyphs = (glyphs) =>
    glyphs.filter((glyph) => glyph.isBackgroundShape !== !0),
  resolveSonnetSegmentCameraFocus = (glyphs, time, trackingFactor = 0.5) => {
    if (glyphs.length === 0) return { x: 0, y: 0 };
    const first = glyphs[0],
      last = glyphs[glyphs.length - 1],
      segCenterX = (first.baseX + last.baseX) / 2,
      segCenterY = (first.baseY + last.baseY) / 2,
      applyFactor = (exactX, exactY) => ({
        x: segCenterX + (exactX - segCenterX) * trackingFactor,
        y: segCenterY + (exactY - segCenterY) * trackingFactor,
      });
    if (time <= first.startTime) return applyFactor(first.baseX, first.baseY);
    if (time >= last.startTime) return applyFactor(last.baseX, last.baseY);
    for (let index = 0; index < glyphs.length - 1; index += 1) {
      const current = glyphs[index],
        next = glyphs[index + 1];
      if (time < current.startTime || time > next.startTime) continue;
      const progress =
        (time - current.startTime) / Math.max(1e-3, next.startTime - current.startTime);
      return applyFactor(
        current.baseX + (next.baseX - current.baseX) * progress,
        current.baseY + (next.baseY - current.baseY) * progress
      );
    }
    return applyFactor(first.baseX, first.baseY);
  };
export { resolveSonnetCameraTrackingGlyphs, resolveSonnetSegmentCameraFocus };
