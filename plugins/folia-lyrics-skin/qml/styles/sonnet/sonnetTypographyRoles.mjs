// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { normalizeFontWeight } from './font-stacks.mjs';
const isSonnetEmphasisRole = (role) => role === 'hero' || role === 'semi-hero',
  resolveSonnetRoleFontWeight = (configuredFontWeight, role) => {
    const manualWeight = normalizeFontWeight(configuredFontWeight);
    return manualWeight !== null
      ? manualWeight
      : isSonnetEmphasisRole(role)
        ? 900
        : role === 'decoration'
          ? 300
          : 700;
  },
  getSonnetVisibleSegmentLength = (segment) =>
    segment.graphemes.filter((item) => item.char.trim().length > 0).length,
  scoreSonnetHeroSegment = (segment) => {
    const lengthScore = Math.min(getSonnetVisibleSegmentLength(segment), 8) * 14,
      durationScore = Math.min(2.5, Math.max(0, segment.endTime - segment.startTime)) * 18;
    return lengthScore + durationScore;
  },
  findSonnetHeroSegmentIndex = (segments) => {
    let bestIndex = segments.findIndex((segment) => segment.isWordLike),
      bestScore = -1 / 0;
    return (
      segments.forEach((segment, index) => {
        if (!segment.isWordLike || getSonnetVisibleSegmentLength(segment) === 0) return;
        const score = scoreSonnetHeroSegment(segment);
        score > bestScore && ((bestScore = score), (bestIndex = index));
      }),
      Math.max(0, bestIndex)
    );
  },
  SEMI_HERO_MIN_GAP = 2,
  SEMI_HERO_MIN_VISIBLE_LENGTH = 2,
  SEMI_HERO_MIN_LINE_WORDS = 4,
  SEMI_HERO_SCORE_RATIO = 0.35,
  SEMI_HERO_MULTI_WORD_COUNT = 9,
  findSonnetSemiHeroSegmentIndices = (segments, heroIndex) => {
    var _a;
    const hero = segments[heroIndex];
    if (!hero) return [];
    const wordLikeCount = segments.filter(
      (segment) => segment.isWordLike && getSonnetVisibleSegmentLength(segment) > 0
    ).length;
    if (wordLikeCount < SEMI_HERO_MIN_LINE_WORDS) return [];
    const threshold = scoreSonnetHeroSegment(hero) * SEMI_HERO_SCORE_RATIO,
      candidates = segments
        .map((segment, index) => ({ segment, index }))
        .filter(
          ({ segment, index }) =>
            index !== heroIndex &&
            segment.isWordLike &&
            getSonnetVisibleSegmentLength(segment) >= SEMI_HERO_MIN_VISIBLE_LENGTH &&
            Math.abs(index - heroIndex) >= SEMI_HERO_MIN_GAP &&
            scoreSonnetHeroSegment(segment) >= threshold
        );
    if (candidates.length === 0) return [];
    const bestOf = (list) =>
        list.reduce(
          (best, item) =>
            !best || scoreSonnetHeroSegment(item.segment) > scoreSonnetHeroSegment(best.segment)
              ? item
              : best,
          null
        ),
      heroLeansEarly = heroIndex <= (segments.length - 1) / 2,
      primarySide = candidates.filter(({ index }) =>
        heroLeansEarly ? index > heroIndex : index < heroIndex
      ),
      secondarySide = candidates.filter(({ index }) =>
        heroLeansEarly ? index < heroIndex : index > heroIndex
      ),
      picks = [],
      primary = (_a = bestOf(primarySide)) != null ? _a : bestOf(secondarySide);
    if (
      (primary && picks.push(primary.index), wordLikeCount >= SEMI_HERO_MULTI_WORD_COUNT && primary)
    ) {
      const secondary = bestOf(
        secondarySide.filter(({ index }) => Math.abs(index - primary.index) >= SEMI_HERO_MIN_GAP)
      );
      secondary && picks.push(secondary.index);
    }
    return picks.sort((first, second) => first - second);
  },
  findSonnetSemiHeroSegmentIndex = (segments, heroIndex) => {
    var _a;
    return (_a = findSonnetSemiHeroSegmentIndices(segments, heroIndex)[0]) != null ? _a : -1;
  };
export {
  findSonnetHeroSegmentIndex,
  findSonnetSemiHeroSegmentIndex,
  findSonnetSemiHeroSegmentIndices,
  getSonnetVisibleSegmentLength,
  isSonnetEmphasisRole,
  resolveSonnetRoleFontWeight,
  scoreSonnetHeroSegment,
};
