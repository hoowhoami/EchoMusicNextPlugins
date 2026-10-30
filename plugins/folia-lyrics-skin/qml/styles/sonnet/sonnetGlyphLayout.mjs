// Derived from Folia a8da4437 (AGPL-3.0-only). See sonnet-reference.md.
import { codePoints } from '../../shared/text/codepoints.mjs';
import { isSonnetEmphasisRole } from './sonnetTypographyRoles.mjs';
const resolveSonnetGlyphMotionDuration = (window) => {
    const shotDuration = Math.max(1e-3, window.endTime - window.startTime),
      preferred = Math.min(1.8, Math.max(0.65, shotDuration * 0.42));
    return Math.min(preferred, shotDuration * 0.72);
  },
  buildSonnetGlyphLayout = (segment, placement, fontSize, measureGlyph, motionWindow) => {
    const fallbackChars = codePoints(segment.text),
      graphemes = segment.graphemes.length
        ? segment.graphemes
        : fallbackChars.map((char, index) => ({
            char,
            startTime:
              segment.startTime +
              ((segment.endTime - segment.startTime) * index) / Math.max(1, fallbackChars.length),
            endTime:
              segment.startTime +
              ((segment.endTime - segment.startTime) * (index + 1)) /
                Math.max(1, fallbackChars.length),
          })),
      advances = graphemes.map((item) =>
        placement.vertical ? fontSize * 0.9 : Math.max(fontSize * 0.2, measureGlyph(item.char))
      ),
      totalAdvance = advances.reduce((sum, advance) => sum + advance, 0),
      motionDuration = resolveSonnetGlyphMotionDuration(motionWindow);
    let cursor = -totalAdvance / 2;
    return graphemes.map((grapheme, index) => {
      const advance = advances[index],
        localX = placement.vertical ? 0 : cursor + advance / 2,
        localY = placement.vertical ? cursor + advance / 2 : 0;
      cursor += advance;
      const cosine = Math.cos(placement.rotation),
        sine = Math.sin(placement.rotation),
        stagger = index % 2 === 0 ? -1 : 1,
        startTime = grapheme.startTime,
        settleTime = startTime + motionDuration;
      return {
        char: grapheme.char,
        baseX: placement.x + localX * cosine - localY * sine,
        baseY: placement.y + localX * sine + localY * cosine,
        enterX: placement.enterX + (placement.vertical ? stagger * fontSize * 0.28 : 0),
        enterY: placement.enterY + (placement.vertical ? 0 : stagger * fontSize * 0.24),
        entryRotation: stagger * (isSonnetEmphasisRole(placement.role) ? 0.055 : 0.035),
        startTime,
        settleTime: Math.max(startTime, settleTime),
      };
    });
  };
export { buildSonnetGlyphLayout, resolveSonnetGlyphMotionDuration };
