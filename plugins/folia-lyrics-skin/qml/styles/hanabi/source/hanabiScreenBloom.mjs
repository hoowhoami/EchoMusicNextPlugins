// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/hanabi/hanabiScreenBloom.ts
import { arrayAt, arrayFlatMap, fromEntries } from '../compat.mjs';
import { getLineRenderEndTime } from '../../../shared/renderHints.mjs';
const CHORUS_MERGE_GAP = 1.5;
const RAMP_IN_BEFORE = 0.5;
const RAMP_IN_AFTER = 0.3;
const RAMP_OUT_BEFORE = 0.2;
const RAMP_OUT_AFTER = 0.9;
const resolveHanabiChorusSpans = (lines) => {
  const spans = [];
  lines.forEach((line, index) => {
    if (!line.isChorus) return;
    const next = lines[index + 1];
    const endTime = next ? Math.max(line.startTime, next.startTime) : getLineRenderEndTime(line);
    const last = arrayAt(spans, -1);
    if (last && line.startTime - last.endTime < CHORUS_MERGE_GAP)
      last.endTime = Math.max(last.endTime, endTime);
    else spans.push({ startTime: line.startTime, endTime });
  });
  return spans;
};
const smooth = (value) => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};
const resolveHanabiChorusWeight = (spans, time) => {
  let weight = 0;
  for (const span of spans) {
    if (time < span.startTime - RAMP_IN_BEFORE) break;
    if (time > span.endTime + RAMP_OUT_AFTER) continue;
    const rampIn = smooth(
      (time - (span.startTime - RAMP_IN_BEFORE)) / (RAMP_IN_BEFORE + RAMP_IN_AFTER),
    );
    const rampOut =
      1 - smooth((time - (span.endTime - RAMP_OUT_BEFORE)) / (RAMP_OUT_BEFORE + RAMP_OUT_AFTER));
    weight = Math.max(weight, Math.min(rampIn, rampOut));
  }
  return weight;
};
const HANABI_SCREEN_BLOOM = {
  base: 0.45,
  chorus: 0.9,
};
const resolveHanabiScreenBloomStrength = (bloom, chorusBloom, chorusWeight) =>
  Math.max(0, bloom) * HANABI_SCREEN_BLOOM.base +
  Math.max(0, chorusBloom) * HANABI_SCREEN_BLOOM.chorus * chorusWeight;
export {
  HANABI_SCREEN_BLOOM,
  resolveHanabiChorusSpans,
  resolveHanabiChorusWeight,
  resolveHanabiScreenBloomStrength,
};
