// Derived from Folia a8da4437 (AGPL-3.0-only). See fume-reference.md.
import { splitLyricGraphemes as splitGraphemes } from '../../shared/text/unicode.mjs';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const mix = (from, to, amount) => from + (to - from) * amount;
const quadraticBezier = (from, control, to, amount) => {
  const normalized = clamp(amount, 0, 1);
  const inverse = 1 - normalized;
  return (
    inverse * inverse * from + 2 * inverse * normalized * control + normalized * normalized * to
  );
};
const easeOutCubic = (value) => 1 - Math.pow(1 - clamp(value, 0, 1), 3);
const easeInCubic = (value) => Math.pow(clamp(value, 0, 1), 3);
const easeInOutCubic = (value) => {
  const normalized = clamp(value, 0, 1);
  return normalized < 0.5
    ? 4 * normalized * normalized * normalized
    : 1 - Math.pow(-2 * normalized + 2, 3) / 2;
};
const resolveDelayedGlowEnvelope = (progress, peakProgress = 0.8) => {
  const normalized = clamp(progress, 0, 1);
  const clampedPeak = clamp(peakProgress, 0.05, 0.95);
  if (normalized <= clampedPeak) {
    return easeOutCubic(normalized / clampedPeak);
  }
  return 1 - easeInCubic((normalized - clampedPeak) / (1 - clampedPeak));
};
const isCJK = (text) => /[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text);
const hashString = (input) => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
const seeded = (seed) => {
  const hash = hashString(seed);
  return (hash % 1e4) / 1e4;
};
export {
  clamp,
  easeInCubic,
  easeInOutCubic,
  easeOutCubic,
  hashString,
  isCJK,
  mix,
  quadraticBezier,
  resolveDelayedGlowEnvelope,
  seeded,
  splitGraphemes,
};
