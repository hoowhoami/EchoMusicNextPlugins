// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const nextPow2 = (value) => {
    let v = value + (value === 0 ? 1 : 0);
    return (
      (v -= 1),
      (v |= v >>> 1),
      (v |= v >>> 2),
      (v |= v >>> 4),
      (v |= v >>> 8),
      (v |= v >>> 16),
      v + 1
    );
  },
  texturePoolAxis = (cssSize, resolution) => nextPow2(Math.ceil(cssSize * resolution - 1e-6)),
  TEXTURE_POOL_MAX_RESOLUTION_DROP = 0.25,
  stepDownCandidate = (cssSize, resolution) => {
    const bucket = texturePoolAxis(cssSize, resolution);
    return bucket < 2 ? null : bucket / 2 / cssSize;
  },
  snapResolutionToTexturePool = (cssWidth, cssHeight, resolution, maxDrop = 0.25) => {
    if (![cssWidth, cssHeight, resolution].every((value) => Number.isFinite(value) && value > 0))
      return resolution;
    const lowest = resolution * (1 - Math.min(Math.max(maxDrop, 0), 1)),
      candidates = [
        stepDownCandidate(cssWidth, resolution),
        stepDownCandidate(cssHeight, resolution),
      ].filter(
        (candidate) =>
          candidate !== null && candidate > 0 && candidate < resolution && candidate >= lowest
      );
    let best = resolution,
      bestArea = texturePoolAxis(cssWidth, resolution) * texturePoolAxis(cssHeight, resolution);
    return (
      candidates.forEach((candidate) => {
        const area = texturePoolAxis(cssWidth, candidate) * texturePoolAxis(cssHeight, candidate);
        area >= bestArea || ((bestArea = area), (best = candidate));
      }),
      best
    );
  };
export { TEXTURE_POOL_MAX_RESOLUTION_DROP, snapResolutionToTexturePool, texturePoolAxis };
