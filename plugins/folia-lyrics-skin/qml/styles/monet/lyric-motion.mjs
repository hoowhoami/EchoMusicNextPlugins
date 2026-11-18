// Derived from Folia a8da4437 (AGPL-3.0-only). See monet-reference.md.
const MONET_SCROLL_SPRING = { stiffness: 142, damping: 28, mass: 0.82 };
const MONET_SCALE_SPRING = { stiffness: 150, damping: 30, mass: 0.78 };
const clampMonetProgress = (value) => Math.min(1, Math.max(0, value));
function resolveMonetGlow(time, start, end, lineEnd) {
  if (time <= start) return 0;
  const rise = Math.max(1e-3, end - start) * 1.18;
  const peak = start + rise;
  const tail = Math.max(lineEnd, end + 1.05);
  if (time <= peak) {
    const progress = clampMonetProgress((time - start) / rise);
    return progress * progress * (3 - 2 * progress);
  }
  const remaining = 1 - clampMonetProgress((time - peak) / Math.max(0.18, tail - peak));
  return remaining * remaining * (3 - 2 * remaining);
}
function resolveMonetFillWidth(time, start, end, offsets, timings) {
  var _a, _b, _c, _d, _e;
  const width = (_a = offsets[offsets.length - 1]) != null ? _a : 0;
  if (time <= start) return 0;
  if (time >= end) return width;
  const count = Math.min(timings.length, offsets.length - 1);
  if (count > 0) {
    for (let i = 0; i < count; i++) {
      const timing = timings[i];
      const timingStart = Math.max(start, timing.startTime);
      const timingEnd = Math.max(timingStart, timing.endTime);
      if (time < timingStart) return offsets[i];
      if (time <= timingEnd) {
        const progress = (time - timingStart) / Math.max(1e-3, timingEnd - timingStart);
        return offsets[i] + (offsets[i + 1] - offsets[i]) * progress;
      }
    }
    return (_b = offsets[count]) != null ? _b : width;
  }
  const index =
    clampMonetProgress((time - start) / Math.max(1e-3, end - start)) * (offsets.length - 1);
  const whole = Math.floor(index);
  return (
    ((_c = offsets[whole]) != null ? _c : width) +
    (((_d = offsets[whole + 1]) != null ? _d : width) -
      ((_e = offsets[whole]) != null ? _e : width)) *
      (index - whole)
  );
}
function resolveMonetTone(status, offset) {
  if (status === 'active') return { alpha: 1, scale: 1, blur: 0, baseAlpha: 0.34 };
  const distance = Math.max(Math.abs(offset), 1);
  const waiting = status === 'waiting';
  return {
    alpha: waiting
      ? Math.max(0.36, 0.72 - (distance - 1) * 0.18)
      : Math.max(0.28, 0.52 - (distance - 1) * 0.12),
    scale: Math.max(0.68, 0.72 * Math.pow(0.9, distance - 1)),
    blur: waiting
      ? distance === 1
        ? 0.7
        : 1.8 + (distance - 2) * 0.8
      : 1.1 + (distance - 1) * 0.7,
    baseAlpha: waiting ? 0.46 : 0.36,
  };
}
export {
  MONET_SCALE_SPRING,
  MONET_SCROLL_SPRING,
  clampMonetProgress,
  resolveMonetFillWidth,
  resolveMonetGlow,
  resolveMonetTone,
};
