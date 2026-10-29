// pretext 0.0.9 normal whitespace normalization; no browser/word-boundary approximation.
export function normalize(text) {
  return text.replace(/[ \t\n\r\f]+/g, ' ').replace(/^ | $/g, '');
}
