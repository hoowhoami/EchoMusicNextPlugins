// Folia a8da4437 original WAAPI track, AGPL-3.0-only.
import { buildMonetDriftTrack } from './source-drift.mjs';

export const MONET_DRIFT_IDENTITY = Object.freeze({ xPercent: 0, yPercent: 0, scale: 1 });

export function prepareMonetDrift(strength) {
  const source = buildMonetDriftTrack(strength);
  return {
    durationMs: source.durationMs,
    minScale: source.minScale,
    maxTravelPercent: source.maxTravelPercent,
    frames: source.keyframes.map((frame) => {
      const values = /^translate3d\(([-\d.]+)%, ([-\d.]+)%, 0\) scale\(([-\d.]+)\)$/.exec(
        frame.transform
      );
      if (!values) throw new Error('Unexpected original Monet drift transform');
      return { xPercent: Number(values[1]), yPercent: Number(values[2]), scale: Number(values[3]) };
    }),
  };
}

// Original WAAPI offsets are implicit and uniformly spaced. Preserve its linear interpolation.
export function sampleMonetDrift(track, phase) {
  const at = Math.max(0, Math.min(track.frames.length - 1, phase));
  const index = Math.floor(at);
  const from = track.frames[index];
  const to = track.frames[Math.min(index + 1, track.frames.length - 1)];
  const amount = at - index;
  return {
    xPercent: from.xPercent * (1 - amount) + to.xPercent * amount,
    yPercent: from.yPercent * (1 - amount) + to.yPercent * amount,
    scale: from.scale * (1 - amount) + to.scale * amount,
  };
}
