// Folia a8da4437 useVisPlaygroundPreviewPlayback.ts. Preview signals only.
// AGPL-3.0-only; this module never observes or controls a real player.
import { getLineRenderEndTime } from '../shared/renderHints.mjs';
export function findLineIndex(lines, time) {
  for (let index = lines.length - 1; index >= 0; --index) {
    const line = lines[index];
    if (!line || time < line.startTime) continue;
    if (time <= getLineRenderEndTime(line)) return index;
  }
  return -1;
}
export function initialState(mode, duration) {
  return {
    timeSeconds: duration > 0 ? (mode === 'fume' ? 18.4 : 0) % duration : 0,
    previousTickMs: null,
  };
}
export function pause(state) {
  return { timeSeconds: state.timeSeconds, previousTickMs: null };
}
export function advance(state, now, duration) {
  const previous = state.previousTickMs === null ? now : state.previousTickMs;
  return {
    timeSeconds: (state.timeSeconds + (now - previous) / 1000) % duration,
    previousTickMs: now,
  };
}
export function levelsAt(now) {
  const wave = (offset, speed, floor, amplitude) =>
    floor + (Math.sin(now * speed + offset) * 0.5 + 0.5) * amplitude;
  const spectrum = new Array(64);
  for (let index = 0; index < spectrum.length; index++) {
    const normalizedIndex = index / Math.max(1, spectrum.length - 1);
    const lowShape = Math.exp(-normalizedIndex * 2.4);
    const harmonic =
      Math.sin(now * 0.0027 + normalizedIndex * Math.PI * 3.4) * 0.18 +
      Math.sin(now * 0.0052 + normalizedIndex * Math.PI * 11.5) * 0.08;
    const shimmer = Math.sin(now * 0.0018 + normalizedIndex * Math.PI * 1.2) * 0.12;
    const amplitude = Math.max(0, Math.min(1, lowShape * 0.8 + 0.08 + harmonic + shimmer));
    spectrum[index] = Math.round(amplitude * 255);
  }
  return {
    audioPower: wave(0.2, 0.0024, 0.16, 0.18),
    bass: wave(0.9, 0.0032, 0.14, 0.2),
    lowMid: wave(1.7, 0.0028, 0.12, 0.16),
    mid: wave(2.6, 0.0023, 0.1, 0.14),
    vocal: wave(3.4, 0.0038, 0.16, 0.22),
    treble: wave(4.2, 0.0046, 0.08, 0.14),
    spectrum,
  };
}
