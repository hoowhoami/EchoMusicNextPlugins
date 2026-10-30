// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
const ATTACK_SECONDS = 0.06;
const RELEASE_SECONDS = 0.25;
const normalizeLumiereAudioValue = (value, rawScale) => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(1, rawScale ? value / 255 : value);
};
const smoothLumiereAudioValue = (current, target, dt) => {
  const tau = target > current ? ATTACK_SECONDS : RELEASE_SECONDS;
  const k = 1 - Math.exp(-Math.max(0, dt) / tau);
  return current + (target - current) * k;
};
const createLumiereAudioSampler = (initial) => {
  let sources = initial;
  let rawScale = false;
  let lastMs = 0;
  const frame = { bass: 0, treble: 0, power: 0 };
  const read = (value) => {
    var _a;
    const raw = (_a = value == null ? void 0 : value.get()) != null ? _a : 0;
    if (raw > 1) rawScale = true;
    return raw;
  };
  return {
    frame,
    setSources: (next) => {
      if (next.audioPower === sources.audioPower && next.audioBands === sources.audioBands) return;
      sources = next;
      rawScale = false;
    },
    sample: (nowMs, paused) => {
      const dt = lastMs > 0 ? Math.min(0.1, (nowMs - lastMs) / 1e3) : 1;
      lastMs = nowMs;
      if (paused) {
        frame.bass = 0;
        frame.treble = 0;
        frame.power = 0;
        return;
      }
      const bass = read(sources.audioBands.bass);
      const treble = read(sources.audioBands.treble);
      const power = read(sources.audioPower);
      frame.bass = smoothLumiereAudioValue(
        frame.bass,
        normalizeLumiereAudioValue(bass, rawScale),
        dt
      );
      frame.treble = smoothLumiereAudioValue(
        frame.treble,
        normalizeLumiereAudioValue(treble, rawScale),
        dt
      );
      frame.power = smoothLumiereAudioValue(
        frame.power,
        normalizeLumiereAudioValue(power, rawScale),
        dt
      );
    },
  };
};
export { createLumiereAudioSampler, normalizeLumiereAudioValue, smoothLumiereAudioValue };
