// Pixi8.21.0 MIT. See PIXI-TEXT-LICENSE.txt.
const NEWLINES = [10, 13],
  NEWLINES_SET = new Set(NEWLINES),
  BREAKING_SPACES = [
    9, 32, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8200, 8201, 8202, 8287, 12288,
  ],
  BREAKING_SPACES_SET = new Set(BREAKING_SPACES),
  COLLAPSIBLE_SPACES = [9, 32],
  COLLAPSIBLE_SPACES_SET = new Set(COLLAPSIBLE_SPACES),
  BREAK_AFTER_CHARS = [45, 8208, 8211, 8212, 173],
  BREAK_AFTER_CHARS_SET = new Set(BREAK_AFTER_CHARS),
  NEWLINE_SPLIT_REGEX = /(\r\n|\r|\n)/,
  NEWLINE_MATCH_REGEX = /(?:\r\n|\r|\n)/;
function isNewline(char) {
  return typeof char != 'string' ? !1 : NEWLINES_SET.has(char.charCodeAt(0));
}
function isBreakingSpace(char, _nextChar) {
  return typeof char != 'string' ? !1 : BREAKING_SPACES_SET.has(char.charCodeAt(0));
}
function isCollapsibleSpace(char) {
  return typeof char != 'string' ? !1 : COLLAPSIBLE_SPACES_SET.has(char.charCodeAt(0));
}
function isBreakAfterChar(char) {
  return typeof char != 'string' ? !1 : BREAK_AFTER_CHARS_SET.has(char.charCodeAt(0));
}
function collapseSpaces(whiteSpace) {
  return whiteSpace === 'normal' || whiteSpace === 'pre-line';
}
function collapseNewlines(whiteSpace) {
  return whiteSpace === 'normal';
}
function trimRight(text) {
  if (typeof text != 'string') return '';
  let i = text.length - 1;
  for (; i >= 0 && isBreakingSpace(text[i]);) i--;
  return i < text.length - 1 ? text.slice(0, i + 1) : text;
}
function tokenize(text) {
  const tokens = [],
    tokenChars = [];
  if (typeof text != 'string') return tokens;
  for (let i = 0; i < text.length; i++) {
    const char = text[i],
      nextChar = text[i + 1];
    if (isBreakingSpace(char, nextChar) || isNewline(char)) {
      (tokenChars.length > 0 && (tokens.push(tokenChars.join('')), (tokenChars.length = 0)),
        char === '\r' &&
        nextChar ===
          `
`
          ? (tokens.push(`\r
`),
            i++)
          : tokens.push(char));
      continue;
    }
    (tokenChars.push(char),
      isBreakAfterChar(char) &&
        nextChar &&
        !isBreakingSpace(nextChar) &&
        !isNewline(nextChar) &&
        (tokens.push(tokenChars.join('')), (tokenChars.length = 0)));
  }
  return (tokenChars.length > 0 && tokens.push(tokenChars.join('')), tokens);
}
function getCharacterGroups(token, breakWords, splitFn, canBreakCharsFn) {
  const characters = splitFn(token),
    groups = [];
  for (let j = 0; j < characters.length; j++) {
    let char = characters[j],
      lastChar = char,
      k = 1;
    for (; characters[j + k];) {
      const nextChar = characters[j + k];
      if (!canBreakCharsFn(lastChar, nextChar, token, j, breakWords))
        ((char += nextChar), (lastChar = nextChar), k++);
      else break;
    }
    ((j += k - 1), groups.push(char));
  }
  return groups;
}
export {
  BREAKING_SPACES,
  BREAKING_SPACES_SET,
  BREAK_AFTER_CHARS,
  BREAK_AFTER_CHARS_SET,
  COLLAPSIBLE_SPACES,
  COLLAPSIBLE_SPACES_SET,
  NEWLINES,
  NEWLINES_SET,
  NEWLINE_MATCH_REGEX,
  NEWLINE_SPLIT_REGEX,
  collapseNewlines,
  collapseSpaces,
  getCharacterGroups,
  isBreakAfterChar,
  isBreakingSpace,
  isCollapsibleSpace,
  isNewline,
  tokenize,
  trimRight,
};
