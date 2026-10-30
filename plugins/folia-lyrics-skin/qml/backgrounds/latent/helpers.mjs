// Generated Folia a8da4437, AGPL-3.0-only.
const MAX_SHADER_PIXELS = 1280 * 720;
const PAUSED_SPEED_SCALE = 0.12;
const PAUSE_EASE_MS = 300;
const normalizeAudio = (value) => Math.min(1, Math.max(0, value / 255));
const clampShaderSpeed = (value) => Math.min(2, Math.max(0, value));
const clampAudioAmount = (value) => Math.min(1, Math.max(0, value));
const easeTowards = (current, target, amount) => current + (target - current) * amount;
const resolveLatentBroadbandEnergy = (bass, lowMid, mid, vocal, treble) => {
  const broadbandEnergy =
    normalizeAudio(bass) * 0.22 +
    normalizeAudio(lowMid) * 0.18 +
    normalizeAudio(mid) * 0.22 +
    normalizeAudio(vocal) * 0.28 +
    normalizeAudio(treble) * 0.1;
  return Math.pow(broadbandEnergy, 0.55);
};
const resolveLatentOnsetPulse = (currentEnergy, previousEnergy, previousPulse) =>
  Math.max(previousPulse * 0.84, clampAudioAmount((currentEnergy - previousEnergy) * 7));
const resolveLatentBeatSpeedTarget = (broadbandEnergy, onsetPulse) =>
  clampAudioAmount(broadbandEnergy * 0.42 + onsetPulse * 0.85);
const resolveLatentAudioSpeedTarget = (broadbandEnergy, onsetPulse, enhancedBeatResponse) =>
  enhancedBeatResponse
    ? resolveLatentBeatSpeedTarget(broadbandEnergy, onsetPulse)
    : clampAudioAmount(broadbandEnergy);
const resolveLatentShaderSpeed = (baseSpeed, audioSpeed, audioAmount, paused) =>
  clampShaderSpeed(
    paused ? baseSpeed * PAUSED_SPEED_SCALE : easeTowards(baseSpeed, audioSpeed, audioAmount)
  );
const resolveLatentShaderColors = (coverColors, theme, colorSource) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i;
  const primary = (_a = coverColors[0]) != null ? _a : theme.secondaryColor;
  if (colorSource === 'cover-only') {
    const secondary2 = (_b = coverColors[1]) != null ? _b : primary;
    const tertiary2 = (_c = coverColors[2]) != null ? _c : secondary2;
    const quaternary2 = (_d = coverColors[3]) != null ? _d : primary;
    const quinary = (_e = coverColors[4]) != null ? _e : secondary2;
    const senary = (_f = coverColors[5]) != null ? _f : tertiary2;
    return {
      ditheringBack: tertiary2,
      ditheringFront: primary,
      mesh: [primary, secondary2, tertiary2, quaternary2, quinary, senary],
    };
  }
  const secondary = (_g = coverColors[1]) != null ? _g : theme.primaryColor;
  const tertiary = (_h = coverColors[2]) != null ? _h : primary;
  const quaternary = (_i = coverColors[3]) != null ? _i : secondary;
  return {
    ditheringBack: theme.backgroundColor,
    ditheringFront: primary,
    mesh: [primary, secondary, tertiary, quaternary, theme.backgroundColor, theme.accentColor],
  };
};
export {
  resolveLatentAudioSpeedTarget,
  resolveLatentBeatSpeedTarget,
  resolveLatentBroadbandEnergy,
  resolveLatentOnsetPulse,
  resolveLatentShaderColors,
  resolveLatentShaderSpeed,
};
