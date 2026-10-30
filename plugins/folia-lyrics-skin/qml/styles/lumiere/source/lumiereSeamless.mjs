// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
import { flatMap } from '../../../shared/text/compat.mjs';
const mergeLumiereParagraphs = (paragraphs) => {
  if (paragraphs.length < 2) return [...paragraphs];
  const first = paragraphs[0];
  const last = paragraphs[paragraphs.length - 1];
  const sections = paragraphs.map((paragraph) => ({
    startTime: paragraph.startTime,
    endTime: paragraph.endTime,
    kind: paragraph.kind,
  }));
  return [
    {
      id: 'lumiere-seamless',
      index: 0,
      kind: first.kind,
      boundary: first.boundary,
      startTime: first.startTime,
      endTime: last.endTime,
      lyricEndTime: last.lyricEndTime,
      lineIndices: flatMap(paragraphs, (paragraph) => paragraph.lineIndices),
      lines: flatMap(paragraphs, (paragraph) => paragraph.lines),
      shots: flatMap(paragraphs, (paragraph) => paragraph.shots),
      transitionOut: null,
      opening: first.opening,
      sections,
    },
  ];
};
export { mergeLumiereParagraphs };
