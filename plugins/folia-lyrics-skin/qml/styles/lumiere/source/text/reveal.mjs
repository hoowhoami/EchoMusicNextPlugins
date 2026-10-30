// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { buildLineGraphemeTimeline } from '../../../../shared/text/graphemeTiming.mjs';
const buildGlyphTimings = (line) =>
  buildLineGraphemeTimeline(line).map((timing) => ({
    start: timing.startTime,
    end: timing.endTime,
  }));
const clamp01 = (value) => Math.min(1, Math.max(0, value));
const glyphProgress = (timing, time) =>
  clamp01((time - timing.start) / Math.max(timing.end - timing.start, 0.08));
const flashEnvelope = (timing, time, decay = 0.5, attack = 0.15) => {
  const age = time - timing.start;
  if (age <= 0) return 0;
  if (age < attack) {
    const t = age / attack;
    return t * t * (3 - 2 * t);
  }
  return Math.exp(-(age - attack) / decay);
};
export { buildGlyphTimings, flashEnvelope, glyphProgress };
