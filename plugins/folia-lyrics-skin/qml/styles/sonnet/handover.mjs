// createSonnetPixiRuntime.ts: SONNET_SONG_SWAP_MS / advanceSongSwap.
export const DURATION_MS = 560;
export function swapFrame(wallMs, startedAt) {
  const progress = (wallMs - startedAt) / DURATION_MS;
  return {
    stage: progress >= 0.35,
    commit: progress >= 0.5,
    finished: progress >= 1,
    alpha: progress >= 1 ? 0 : 1 - Math.abs(progress * 2 - 1),
  };
}
