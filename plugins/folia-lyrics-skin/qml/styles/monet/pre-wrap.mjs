// Monet's DOM spans use pre-wrap; pretext rich-inline intentionally remains normal.
// Use only the pinned public text-layout API. Timed words remain atomic inline boxes.
import { prepareWithSegments, layoutNextLine } from './pretext.mjs';
import { normalize } from './native-measure.mjs';

export function preWrapParts(text) {
  return normalize(text).split('\n');
}
export function layoutPreWrap(items, width) {
  const rows = [];
  let fragments = [],
    occupied = 0;
  function finish(force) {
    if (force || fragments.length || occupied > 0) rows.push({ fragments, width: occupied });
    fragments = [];
    occupied = 0;
  }
  function append(index, text, advance) {
    // Whitespace still occupies its measured advance, but needs no empty glyph delegate.
    if (!/^[ \t]*$/.test(text))
      fragments.push({ itemIndex: index, text, x: occupied, occupiedWidth: advance });
    occupied += advance;
  }
  for (let index = 0; index < items.length; ++index) {
    const item = items[index];
    if (item.box) {
      if (occupied > 0 && item.box.boxWidth > width - occupied) finish(false);
      append(index, item.text, item.box.boxWidth);
      continue;
    }
    const parts = preWrapParts(item.text);
    for (let partIndex = 0; partIndex < parts.length; ++partIndex) {
      if (partIndex > 0) finish(true);
      const text = parts[partIndex];
      if (!text) continue;
      const prepared = prepareWithSegments(text, item.font, { whiteSpace: 'pre-wrap' });
      let cursor = { segmentIndex: 0, graphemeIndex: 0 };
      while (true) {
        const line = layoutNextLine(prepared, cursor, Math.max(1, width - occupied));
        if (!line) break;
        // A word that fits a fresh row must not be broken merely because an
        // earlier inline box used the available tail. Preserve the core's CJK,
        // BiDi and grapheme boundaries rather than splitting source characters.
        if (
          occupied > 0 &&
          cursor.segmentIndex === 0 &&
          cursor.graphemeIndex === 0 &&
          line.end.segmentIndex === 0 &&
          line.end.graphemeIndex > 0
        ) {
          finish(false);
          continue;
        }
        if (
          line.end.segmentIndex === cursor.segmentIndex &&
          line.end.graphemeIndex === cursor.graphemeIndex
        )
          throw new Error('Monet pre-wrap cursor did not advance');
        append(index, line.text, line.width);
        cursor = line.end;
        if (!layoutNextLine(prepared, cursor, Number.POSITIVE_INFINITY)) break;
        finish(false);
      }
    }
  }
  finish(false);
  return rows;
}
