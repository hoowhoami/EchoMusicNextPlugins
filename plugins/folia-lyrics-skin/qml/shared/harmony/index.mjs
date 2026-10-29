// Exact source-active interval selection with a bounded maximum-end tree.
import { resolveHarmonySnapshotFromVocals } from './runtime.mjs';
function word(value, offset) {
  const result = {
    text: value.text,
    startTime: (value.start_ms + offset) / 1000,
    endTime: (value.start_ms + offset + Math.max(0, value.duration_ms)) / 1000,
  };
  if (Array.isArray(value.syllables))
    result.syllables = value.syllables.map((part) => word(part, offset));
  return result;
}
export function backgroundRow(row, offset) {
  return (row.backgroundVocals || []).map((value) => {
    const vocal = {
      text: value.lineText,
      startTime: value.startMs / 1000,
      endTime: (value.startMs + Math.max(0, value.durationMs)) / 1000,
      words: (value.words || []).map((part) => word(part, offset)),
      translation: value.translation || '',
      romanization: value.romanization || '',
    };
    if (typeof value.agentId === 'string') vocal.agentId = value.agentId;
    if (Array.isArray(value.alternateTexts)) vocal.alternateTexts = value.alternateTexts;
    return vocal;
  });
}
export function buildHarmonyIndex(vocals) {
  const sorted = vocals.slice().sort((a, b) => a.startTime - b.startTime || a.endTime - b.endTime);
  let base = 1;
  while (base < sorted.length) base *= 2;
  const maximum = new Array(base * 2).fill(-Infinity);
  for (let i = 0; i < sorted.length; ++i) maximum[base + i] = sorted[i].endTime;
  for (let i = base - 1; i > 0; --i) maximum[i] = Math.max(maximum[i * 2], maximum[i * 2 + 1]);
  return { vocals: sorted, base, maximum };
}
export function queryHarmonyIndices(index, time, stats) {
  if (!index || !index.vocals.length) return [];
  const vocals = index.vocals;
  let low = 0,
    high = vocals.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (vocals[mid].startTime <= time) low = mid + 1;
    else high = mid;
  }
  const through = low - 1,
    result = [];
  function visit(node, first, last) {
    if (stats) ++stats.visited;
    if (first > through || index.maximum[node] < time) return;
    if (first === last) {
      if (vocals[first].text.trim()) result.push(first);
      return;
    }
    const middle = (first + last) >>> 1;
    visit(node * 2, first, middle);
    visit(node * 2 + 1, middle + 1, last);
  }
  visit(1, 0, index.base - 1);
  return result;
}
export function indexedHarmonySnapshot(index, time) {
  return resolveHarmonySnapshotFromVocals(
    queryHarmonyIndices(index, time).map((i) => index.vocals[i]),
    time
  );
}
export function nextHarmonyStart(index, time) {
  if (!index) return null;
  const vocals = index.vocals;
  let low = 0,
    high = vocals.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (vocals[mid].startTime <= time) low = mid + 1;
    else high = mid;
  }
  return low < vocals.length ? vocals[low].startTime : null;
}
