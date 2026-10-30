// Preparation runs entirely in a WorkerScript. Native widths/ICU pieces are explicit immutable inputs.
import { configure, discoveredTexts, release } from './pretext-adapter.mjs';
import { prepareWithSegments, clearCache } from './pretext.mjs';
import { buildPreparedState } from './prepared-state.mjs';
import { splitGraphemes, clamp } from './envelopes.mjs';
import { resolveThemeFontStack, resolveThemeFontWeight } from './font-stacks.mjs';
import { normalize } from './input.mjs';
export { normalize };
export function fontSize(width, line, scale) {
  const count = splitGraphemes(line.fullText).length || 1;
  const words = line.words.length || 1;
  return clamp(
    clamp(
      clamp(width * 0.086, 34, 94) -
        (count > 12 ? Math.min((count - 12) * 1.8, 34) : 0) -
        (words > 7 ? Math.min((words - 7) * 1.5, 18) : 0),
      28,
      104
    ) * scale,
    24,
    132
  );
}
function validate(line) {
  if (line.fullText.length > 8192 || line.words.length > 128)
    throw new Error('Cadenza text exceeds native budget (8192 UTF16 / 128 words)');
}
export function discover(line, context, pieces) {
  validate(line);
  clearCache();
  configure(normalize(line.fullText), pieces, [], true);
  try {
    const fontPx = fontSize(context.viewport.width, line, context.tuning.fontScale);
    const font =
      resolveThemeFontWeight(context.theme, 700) +
      ' ' +
      fontPx +
      'px ' +
      resolveThemeFontStack(context.theme);
    prepareWithSegments(line.fullText, font);
    return { texts: discoveredTexts(), fontPx };
  } finally {
    release();
    clearCache();
  }
}
export function complete(line, context, pieces, measurements) {
  validate(line);
  clearCache();
  configure(normalize(line.fullText), pieces, measurements, false);
  try {
    const result = buildPreparedState(line, context);
    if (result && result.placements.length > 128)
      throw new Error('Cadenza wrapped fragments exceed native budget (128)');
    return result;
  } finally {
    release();
    clearCache();
  }
}
