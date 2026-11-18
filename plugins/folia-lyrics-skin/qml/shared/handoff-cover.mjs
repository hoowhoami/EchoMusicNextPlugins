// Folia a8da4437 useHandoffCover.ts pure state, AGPL-3.0-only.
export function keepHandoffCover(kept, songHandoff, shownSeed, shownCoverUrl) {
  const revocable =
    !songHandoff &&
    kept !== null &&
    kept.coverUrl.startsWith('blob:') &&
    kept.coverUrl !== shownCoverUrl;
  const still = kept && kept.seed === shownSeed && !revocable ? kept : null;
  if (still || !(songHandoff && songHandoff.coverUrl)) return still;
  return { seed: songHandoff.seed, coverUrl: songHandoff.coverUrl };
}
