import { buildHarmonyTextParts, resolveWordColor } from './kernel.mjs';
export function voiceKey(vocal) {
  return JSON.stringify([
    vocal.startTime,
    vocal.endTime,
    vocal.text,
    vocal.words,
    vocal.translation,
    vocal.romanization,
    vocal.alternateTexts,
  ]);
}
export function clusterPaints(vocal, metric, width, wordColors, accent, secondary) {
  if (!metric) return [];
  const parts = buildHarmonyTextParts(vocal);
  let offset = 0;
  const ranges = parts.map((part) => {
    const value = {
      start: offset,
      end: offset + part.text.length,
      color: part.word
        ? resolveWordColor(part.word.text, wordColors, accent, { cjkMatchMode: 'exact' })
        : secondary,
    };
    offset = value.end;
    return value;
  });
  const rows = new Map();
  for (const g of metric.graphemes) {
    let row = rows.get(g.y);
    if (!row) {
      row = { first: Infinity, last: -Infinity };
      rows.set(g.y, row);
    }
    row.first = Math.min(row.first, g.x, g.x + g.advance);
    row.last = Math.max(row.last, g.x, g.x + g.advance);
  }
  const seen = new Set(),
    result = [];
  for (const g of metric.graphemes) {
    if (seen.has(g.clusterStart)) continue;
    seen.add(g.clusterStart);
    const range = ranges.find((part) => part.start <= g.clusterStart && g.clusterStart < part.end),
      row = rows.get(g.y);
    result.push({
      key: 'voice',
      start: g.clusterStart,
      x: (width - (row.last - row.first)) / 2 - row.first,
      y: 0,
      color: range ? range.color : secondary,
    });
  }
  return result;
}
