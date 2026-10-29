// Folia a8da4437 playbackNeighbors.ts pure manual-navigation rules (AGPL-3.0-only).
export function nextQueueIndex(queueLength, currentIndex, loopMode) {
  if (queueLength <= 0) return -1;
  if (currentIndex < 0) return 0;
  if (currentIndex < queueLength - 1) return currentIndex + 1;
  return loopMode === 'all' ? 0 : -1;
}
export function prevQueueIndex(queueLength, currentIndex, loopMode) {
  if (currentIndex > 0) return currentIndex - 1;
  return loopMode === 'all' ? queueLength - 1 : -1;
}
