// Derived from Folia a8da4437 (AGPL-3.0-only). See pendolo-reference.md.
import { splitLyricGraphemes } from '../../shared/text/graphemeTiming.mjs';
const buildPendoloColorRuns = (text, graphemeStart, tokenColors, fallbackColor) => {
  const runs = [];
  splitLyricGraphemes(text).forEach((grapheme, localIndex) => {
    var _a;
    const color =
      (_a = tokenColors.get(String(graphemeStart + localIndex))) != null ? _a : fallbackColor;
    const previous = runs[runs.length - 1];
    if ((previous == null ? void 0 : previous.color) === color) {
      previous.text += grapheme;
      return;
    }
    runs.push({ key: `${graphemeStart + localIndex}-${color}`, text: grapheme, color });
  });
  return runs;
};
export { buildPendoloColorRuns };
