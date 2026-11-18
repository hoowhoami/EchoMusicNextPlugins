// Folia a8da4437 AGPL-3.0-only. See docs/folia/monet-background-reference.md.
const DRIFT_LOOP_SECONDS = 240;
const DRIFT_LATTICE_POINTS = 76;
const DRIFT_SAMPLE_COUNT = 156;
const DRIFT_MAX_TRAVEL_PERCENT = 3.4;
const DRIFT_BREATH_AMPLITUDE = 0.035;
const DRIFT_OVERSCAN_MARGIN = 0.01;
const DRIFT_SEED_X = 12.9898;
const DRIFT_SEED_Y = 78.233;
const DRIFT_SEED_SCALE = 39.425;
const wrap = (value, modulus) => ((value % modulus) + modulus) % modulus;
const hash = (lattice, seed) => {
  const value = Math.sin(lattice * 127.1 + seed * 311.7) * 43758.5453;
  return value - Math.floor(value);
};
const smoothstep = (t) => t * t * (3 - 2 * t);
const periodicNoise = (t, points, seed) => {
  const cell = Math.floor(t);
  const from = hash(wrap(cell, points), seed);
  const to = hash(wrap(cell + 1, points), seed);
  return from + (to - from) * smoothstep(t - cell);
};
const periodicFbm = (t, seed) => {
  const base = periodicNoise(t, DRIFT_LATTICE_POINTS, seed);
  const detail = periodicNoise(t * 2, DRIFT_LATTICE_POINTS * 2, seed + 17.31);
  return (base * 0.68 + detail * 0.32) * 2 - 1;
};
const normalize = (samples) => {
  const peak = samples.reduce((acc, value) => Math.max(acc, Math.abs(value)), 0);
  return peak > 0 ? samples.map((value) => value / peak) : samples;
};
const buildMonetDriftTrack = (strength) => {
  const clamped = Math.min(1, Math.max(0, strength));
  const travelPercent = DRIFT_MAX_TRAVEL_PERCENT * clamped;
  const minScale = 1 + (travelPercent / 100) * 2 + DRIFT_OVERSCAN_MARGIN;
  const breath = DRIFT_BREATH_AMPLITUDE * clamped;
  const rawX = [];
  const rawY = [];
  const rawScale = [];
  for (let index = 0; index <= DRIFT_SAMPLE_COUNT; index += 1) {
    const t = (DRIFT_LATTICE_POINTS * index) / DRIFT_SAMPLE_COUNT;
    rawX.push(periodicFbm(t, DRIFT_SEED_X));
    rawY.push(periodicFbm(t, DRIFT_SEED_Y));
    rawScale.push(periodicFbm(t, DRIFT_SEED_SCALE));
  }
  const x = normalize(rawX);
  const y = normalize(rawY);
  const scale = normalize(rawScale);
  const keyframes = x.map((offsetX, index) => ({
    transform: `translate3d(${(offsetX * travelPercent).toFixed(4)}%, ${(y[index] * travelPercent).toFixed(4)}%, 0) scale(${(minScale + breath * ((scale[index] + 1) / 2)).toFixed(5)})`,
  }));
  return {
    keyframes,
    durationMs: DRIFT_LOOP_SECONDS * 1e3,
    maxTravelPercent: travelPercent,
    minScale,
  };
};
export { buildMonetDriftTrack };
