// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
const buildSonnetIconParticleIndices = (iconCount, particleCount, seed) => {
    const safeIconCount = Math.max(0, Math.floor(iconCount)),
      safeParticleCount = Math.max(0, Math.floor(particleCount));
    if (safeIconCount === 0) return Array.from({ length: safeParticleCount }, () => null);
    const iconParticleCount = Math.min(
      safeParticleCount,
      Math.max(Math.ceil(safeParticleCount / 4), safeIconCount)
    );
    let emittedIconCount = 0;
    return Array.from({ length: safeParticleCount }, (_, index) => {
      const previousBand = Math.floor((index * iconParticleCount) / safeParticleCount);
      if (Math.floor(((index + 1) * iconParticleCount) / safeParticleCount) === previousBand)
        return null;
      const iconIndex =
        (((seed + emittedIconCount) % safeIconCount) + safeIconCount) % safeIconCount;
      return ((emittedIconCount += 1), iconIndex);
    });
  },
  resolveSonnetIconEntryPhase = (index, iconCount) => {
    const safeCount = Math.max(0, Math.floor(iconCount));
    return safeCount <= 1
      ? 0.12
      : 0.04 + (Math.min(safeCount - 1, Math.max(0, Math.floor(index))) / (safeCount - 1)) * 0.82;
  },
  resolveSonnetIconEntryDuration = (sceneDuration, preferredDuration) => {
    const safeSceneDuration = Math.max(0.01, sceneDuration);
    return Math.min(
      Math.max(0.01, preferredDuration),
      Math.max(0.08, safeSceneDuration * 0.18),
      safeSceneDuration
    );
  },
  resolveSonnetIconEntryDelay = (entryPhase, sceneDuration, entryDuration) =>
    Math.min(1, Math.max(0, entryPhase)) * Math.max(0, sceneDuration - entryDuration),
  buildSonnetIconTextureKey = (name, color, strokeWidth, size, resolution) =>
    `${name}|${color}|${strokeWidth}|${size}|${resolution}`;
export {
  buildSonnetIconParticleIndices,
  buildSonnetIconTextureKey,
  resolveSonnetIconEntryDelay,
  resolveSonnetIconEntryDuration,
  resolveSonnetIconEntryPhase,
};
