// Curve derived from Folia a8da4437 services/automix/handoffProgress.ts (AGPL-3.0-only).
const clamp01 = (value) => Math.max(0, Math.min(1, value));
// Folia's selectDisplay* holds A through the native mix. Only Monet's own
// song-handoff selector crosses early; a missing cue never invents a midpoint.
// A display-only repeat check, never transport authority. Missing metadata
// does not identify two distinct local files as the same song.
export function samePresentationSong(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  return !!(a.hash && b.hash && a.hash === b.hash);
}
export function resolveSongPresentation(native, mode, motionEnabled, progress) {
  const holding = !!(native && native.valid && native.phase !== 'completed');
  const followsCue =
    holding &&
    !samePresentationSong(native.outgoing, native.incoming) &&
    mode === 'monet' &&
    motionEnabled &&
    native.cueReady;
  const crossed = !!(followsCue && progress !== null && progress >= 0.5);
  return {
    holding,
    followsCue: !!followsCue,
    crossed,
  };
}
export const progressSince = (value, start) =>
  start >= 1 ? 1 : clamp01((value - start) / (1 - start));
export const mapTrackHandoffProgress = (timeProgress, crossover) => {
  const safeProgress = clamp01(timeProgress),
    safeCrossover = clamp01(crossover);
  const aligned =
    safeCrossover <= 0 || safeCrossover >= 1
      ? safeProgress
      : safeProgress <= safeCrossover
        ? (0.5 * safeProgress) / safeCrossover
        : 0.5 + (0.5 * (safeProgress - safeCrossover)) / (1 - safeCrossover);
  return aligned * aligned * (3 - 2 * aligned);
};
// Both coordinates are sampled from the one existing LyricClock. Native supplies
// the paired anchor, effective stretch ratio and gain-envelope cue; no wall clock.
export function pairedClock(native, sampleMs) {
  if (!native || !native.valid) return null;
  const completed = native.phase === 'completed';
  const delta =
    native.handedOver && native.hasIncomingPosition && !completed
      ? sampleMs - native.incomingPositionMs
      : 0;
  const outgoing = native.handedOver
    ? native.outgoingPositionMs + delta * native.outgoingTempoRatio
    : sampleMs;
  const elapsed = Math.max(
    0,
    Math.min(
      native.cueDurationMs,
      native.cueElapsedMs + delta / Math.max(0.001, native.outputSpeed)
    )
  );
  return {
    outgoingMs: Math.max(0, Math.min(native.outgoingEndMs || Infinity, outgoing)),
    incomingMs: native.hasIncomingPosition ? sampleMs : null,
    cueElapsedMs: elapsed,
    progress:
      native.cueReady && native.cueDurationMs > 0
        ? mapTrackHandoffProgress(elapsed / native.cueDurationMs, native.crossover)
        : null,
  };
}
