// Derived from Folia a8da4437 (AGPL-3.0-only). See pendolo-reference.md.
import { layoutWithLines, prepareWithSegments } from './pretext.mjs';
import { splitLyricGraphemes } from '../../shared/text/graphemeTiming.mjs';
const buildPendoloTextLayout = (text, fontSpec, maxWidth, lineHeight) => {
  const prepared = prepareWithSegments(text || ' ', fontSpec, {
    whiteSpace: 'pre-wrap',
  });
  const layout = layoutWithLines(prepared, Math.max(1, maxWidth), lineHeight);
  let graphemeCursor = 0;
  const lines = layout.lines.map((line) => {
    const graphemeCount = splitLyricGraphemes(line.text).length;
    const result = {
      text: line.text,
      width: line.width,
      graphemeStart: graphemeCursor,
      graphemeEnd: graphemeCursor + graphemeCount,
    };
    graphemeCursor += graphemeCount;
    return result;
  });
  return {
    lines,
    lineHeight,
    height: Math.max(lines.length, 1) * lineHeight,
  };
};
export { buildPendoloTextLayout };
