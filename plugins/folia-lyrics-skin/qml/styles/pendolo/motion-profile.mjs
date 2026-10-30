// Derived from Folia a8da4437 (AGPL-3.0-only). See pendolo-reference.md.
const PENDOLO_MOTION_PROFILES = {
  calm: {
    balanceSpeedMultiplier: 0.72,
    balanceAmplitudeMultiplier: 0.58,
    bassResponseMultiplier: 0.62,
    escapementSpringMultiplier: 0.72,
    escapementDampingMultiplier: 1.2,
    chorusHaloOpacity: 0.22,
    chorusHaloScale: 1.012,
    chorusGlowMultiplier: 0.72,
    chorusTransitionDuration: 0.52,
  },
  normal: {
    balanceSpeedMultiplier: 1,
    balanceAmplitudeMultiplier: 1,
    bassResponseMultiplier: 1,
    escapementSpringMultiplier: 1,
    escapementDampingMultiplier: 1,
    chorusHaloOpacity: 0.34,
    chorusHaloScale: 1.026,
    chorusGlowMultiplier: 1,
    chorusTransitionDuration: 0.42,
  },
  chaotic: {
    balanceSpeedMultiplier: 1.3,
    balanceAmplitudeMultiplier: 1.42,
    bassResponseMultiplier: 1.38,
    escapementSpringMultiplier: 1.3,
    escapementDampingMultiplier: 0.84,
    chorusHaloOpacity: 0.5,
    chorusHaloScale: 1.045,
    chorusGlowMultiplier: 1.42,
    chorusTransitionDuration: 0.3,
  },
};
const resolvePendoloMotionProfile = (intensity) =>
  intensity === 'calm' || intensity === 'chaotic'
    ? PENDOLO_MOTION_PROFILES[intensity]
    : PENDOLO_MOTION_PROFILES.normal;
const resolvePendoloChorusPresentation = (isChorus, isPlaybackActive, profile) => {
  const isActive = Boolean(isChorus && isPlaybackActive);
  return {
    isActive,
    accentMix: isActive ? 0.58 : 0.32,
    haloOpacity: isActive ? profile.chorusHaloOpacity : 0,
    haloScale: isActive ? profile.chorusHaloScale : 1,
    glowMultiplier: isActive ? profile.chorusGlowMultiplier : 0,
    transitionDuration: profile.chorusTransitionDuration,
  };
};
export { resolvePendoloChorusPresentation, resolvePendoloMotionProfile };
