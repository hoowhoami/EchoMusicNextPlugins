// Pixi8.21.0 MIT. See PIXI-TEXT-LICENSE.txt.
import {
  collapseSpaces,
  collapseNewlines,
  tokenize,
  isNewline,
  trimRight,
  isBreakingSpace,
  getCharacterGroups,
} from './pixi-tokenization.mjs';
const contextSettings = {
  willReadFrequently: !0,
};
function getFromCache(key, letterSpacing, cache, context, measureTextFn) {
  let width = cache[key];
  return (
    typeof width != 'number' &&
      ((width = measureTextFn(key, letterSpacing, context) + letterSpacing), (cache[key] = width)),
    width
  );
}
function wordWrap(
  text,
  style,
  canvas,
  measureTextFn,
  canBreakWordsFn,
  canBreakCharsFn,
  wordWrapSplitFn
) {
  const context = canvas.getContext('2d', contextSettings);
  context.font = style._fontString;
  let width = 0,
    line = '';
  const linesArray = [],
    cache = /* @__PURE__ */ Object.create(null),
    { letterSpacing, whiteSpace } = style,
    shouldCollapseSpaces = collapseSpaces(whiteSpace),
    shouldCollapseNewlines = collapseNewlines(whiteSpace);
  let canPrependSpaces = !shouldCollapseSpaces;
  const wordWrapWidth = style.wordWrapWidth + letterSpacing,
    tokens = tokenize(text);
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    if (isNewline(token)) {
      if (!shouldCollapseNewlines) {
        (linesArray.push(trimRight(line)),
          (canPrependSpaces = !shouldCollapseSpaces),
          (line = ''),
          (width = 0));
        continue;
      }
      token = ' ';
    }
    if (shouldCollapseSpaces) {
      const currIsBreakingSpace = isBreakingSpace(token),
        lastIsBreakingSpace = isBreakingSpace(line[line.length - 1]);
      if (currIsBreakingSpace && lastIsBreakingSpace) continue;
    }
    const tokenWidth = getFromCache(token, letterSpacing, cache, context, measureTextFn);
    if (tokenWidth > wordWrapWidth)
      if (
        (line !== '' && (linesArray.push(trimRight(line)), (line = ''), (width = 0)),
        canBreakWordsFn(token, style.breakWords))
      ) {
        const charGroups = getCharacterGroups(
          token,
          style.breakWords,
          wordWrapSplitFn,
          canBreakCharsFn
        );
        for (const char of charGroups) {
          const characterWidth = getFromCache(char, letterSpacing, cache, context, measureTextFn);
          (characterWidth + width > wordWrapWidth &&
            (linesArray.push(trimRight(line)), (canPrependSpaces = !1), (line = ''), (width = 0)),
            (line += char),
            (width += characterWidth));
        }
      } else
        (line.length > 0 && (linesArray.push(trimRight(line)), (line = ''), (width = 0)),
          linesArray.push(trimRight(token)),
          (canPrependSpaces = !1),
          (line = ''),
          (width = 0));
    else
      (tokenWidth + width > wordWrapWidth &&
        ((canPrependSpaces = !1), linesArray.push(trimRight(line)), (line = ''), (width = 0)),
        (line.length > 0 || !isBreakingSpace(token) || canPrependSpaces) &&
          ((line += token), (width += tokenWidth)));
  }
  const trimmedLine = trimRight(line);
  return (
    trimmedLine.length > 0 && linesArray.push(trimmedLine),
    linesArray.join(`
`)
  );
}
export { wordWrap };
