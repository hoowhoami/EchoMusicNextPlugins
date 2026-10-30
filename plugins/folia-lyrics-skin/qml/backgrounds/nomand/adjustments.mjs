// Folia a8da4437 / Paper0.0.80. See nomand-reference.md.
const MAX_OVERSCAN = 1.8;
const OVERSCAN_MARGIN = 0.01;
const REFERENCE_ASPECT = 16 / 9;
const NOMAND_PAPER_TEXTURE_SHAPE = {
  fiberSize: 0.2,
  crumples: 0.35,
  crumpleSize: 0.35,
  folds: 0.65,
  foldCount: 5,
  drops: 0.2,
  seed: 5.8,
};
const NOMAND_LENS_SHAPE = {
  perspective: 0.4,
  count: 20,
  focusCenter: 0.55,
  focusEdges: 0.8,
  swirl: 0.08,
  lensCircle: 0.1,
};
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const clampOverscan = (scale) => Math.min(MAX_OVERSCAN, Math.max(1, scale));
const applyOverscanMargin = (scale) => (scale <= 1 ? 1 : clampOverscan(scale + OVERSCAN_MARGIN));
const overscanForMargin = (margin) =>
  applyOverscanMargin(1 / (1 - 2 * Math.min(Math.max(margin, 0), 0.45)));
const resolveDaylightInversion = (inverted, originalColors, isDaylight) =>
  isDaylight && !originalColors ? !inverted : inverted;
const resolveHalftoneInversion = (inverted, originalColors, isDaylight) =>
  resolveDaylightInversion(!inverted, originalColors, isDaylight);
const getPaperTextureOverscan = (roughness, fiber) => {
  const { folds, crumples, drops } = NOMAND_PAPER_TEXTURE_SHAPE;
  const maxNormal =
    2 * folds + 1.5 * crumples + 0.2 * drops + 0.75 * clamp01(roughness) + 0.1 * clamp01(fiber);
  return overscanForMargin(0.02 * maxNormal);
};
const getLensDistortionOverscan = (bulge, spread) => {
  const outRadius = 0.5 * Math.hypot(REFERENCE_ASPECT, 1);
  const clampedSpread = clamp01(spread);
  const reach = 0.7 * Math.pow(clampedSpread, 1.3 + 2.7 * clampedSpread);
  const edgeReach = reach * (1 - NOMAND_LENS_SHAPE.focusEdges);
  const headroom = Math.max(0.35, 1 - edgeReach / outRadius);
  if (bulge <= 0) return applyOverscanMargin(1 / headroom);
  const bulgeAmount = Math.min(bulge, 1) * 1.4;
  const cornerPush = (scale) => {
    const cornerRn = (2 * outRadius) / scale;
    return Math.tan(cornerRn * bulgeAmount) / Math.tan(bulgeAmount) / cornerRn;
  };
  let low = Math.max(1, (2 * outRadius * bulgeAmount) / 1.45);
  if (low >= MAX_OVERSCAN || cornerPush(MAX_OVERSCAN) > MAX_OVERSCAN * headroom)
    return MAX_OVERSCAN;
  if (low === 1 && cornerPush(1) <= headroom) return applyOverscanMargin(1 / headroom);
  let high = MAX_OVERSCAN;
  for (let step = 0; step < 32; step += 1) {
    const mid = (low + high) / 2;
    if (cornerPush(mid) > mid * headroom) low = mid;
    else high = mid;
  }
  return applyOverscanMargin(high);
};
export {
  NOMAND_LENS_SHAPE,
  NOMAND_PAPER_TEXTURE_SHAPE,
  getLensDistortionOverscan,
  getPaperTextureOverscan,
  resolveDaylightInversion,
  resolveHalftoneInversion,
};
