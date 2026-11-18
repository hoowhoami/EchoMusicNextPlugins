// Same selection as Folia a8da4437 appPlaybackHelpers.findLatestActiveLineIndex.
// A compact timing tree avoids scanning a complete track on every presentation frame.
import { buildLineRenderHints } from './renderHints.mjs';

export function buildTimelineIndex(lines) {
  const starts = [],
    ends = [],
    sourceIndices = [];
  const lineMetadata = [];
  const metadataBySourceIndex = {};
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    if (!line || line.filtered) continue;
    const hints = line.renderHints || buildLineRenderHints(line);
    const sourceIndex = line.sourceIndex === undefined ? i : line.sourceIndex;
    const text = line.fullText || '';
    let codepointCount = 0;
    let compactCodepointCount = 0;
    for (const point of text) {
      ++codepointCount;
      if (!/\s/.test(point)) ++compactCodepointCount;
    }
    const metadata = {
      sourceIndex,
      startTime: line.startTime,
      endTime: line.endTime,
      renderEndTime: hints.renderEndTime,
      timingClass: hints.timingClass,
      codepointCount,
      compactCodepointCount,
      isInterlude: text === '......',
    };
    for (const key of ['id', 'agentId', 'songPart', 'blockIndex', 'isChorus'])
      if (line[key] !== undefined && line[key] !== null) metadata[key] = line[key];
    lineMetadata.push(metadata);
    metadataBySourceIndex[sourceIndex] = metadata;
    starts.push(line.startTime);
    ends.push(hints.renderEndTime);
    sourceIndices.push(sourceIndex);
  }
  let base = 1;
  while (base < starts.length) base *= 2;
  const maximum = new Array(base * 2).fill(-Infinity);
  const minimum = new Array(base * 2).fill(Infinity);
  for (let i = 0; i < ends.length; ++i) maximum[base + i] = minimum[base + i] = ends[i];
  for (let i = base - 1; i > 0; --i) {
    maximum[i] = Math.max(maximum[i * 2], maximum[i * 2 + 1]);
    minimum[i] = Math.min(minimum[i * 2], minimum[i * 2 + 1]);
  }
  const nextStartBySourceIndex = {};
  for (let i = 0; i < sourceIndices.length; ++i)
    nextStartBySourceIndex[sourceIndices[i]] = i + 1 < starts.length ? starts[i + 1] : null;
  return {
    starts,
    ends,
    sourceIndices,
    maximum,
    minimum,
    base,
    nextStartBySourceIndex,
    lineMetadata,
    metadataBySourceIndex,
  };
}
function latestStart(starts, time) {
  let low = 0,
    high = starts.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (starts[middle] <= time) low = middle + 1;
    else high = middle;
  }
  return low - 1;
}
function rightmost(tree, node, first, last, through, time, completed) {
  if (first > through || (completed ? tree[node] >= time : tree[node] < time)) return -1;
  if (first === last) return first;
  const middle = (first + last) >>> 1;
  const right = rightmost(tree, node * 2 + 1, middle + 1, last, through, time, completed);
  return right >= 0 ? right : rightmost(tree, node * 2, first, middle, through, time, completed);
}
export function timelineState(index, time) {
  if (!index || !index.starts.length)
    return { activeIndex: -1, recentIndex: -1, cursorIndex: -1, nextIndices: [] };
  const cursor = latestStart(index.starts, time);
  const position = rightmost(index.maximum, 1, 0, index.base - 1, cursor, time, false);
  const recent =
    position < 0 ? rightmost(index.minimum, 1, 0, index.base - 1, cursor, time, true) : -1;
  return {
    activeIndex: position >= 0 ? index.sourceIndices[position] : -1,
    recentIndex: recent >= 0 ? index.sourceIndices[recent] : -1,
    cursorIndex: cursor >= 0 ? index.sourceIndices[cursor] : -1,
    nextIndices: position >= 0 ? index.sourceIndices.slice(position + 1, position + 3) : [],
  };
}
export function timingRow(row, offsetMs, sourceIndex) {
  const words = row.words || [];
  const last = words.length ? words[words.length - 1] : null;
  const result = {
    sourceIndex,
    fullText: row.lineText || '',
    startTime: row.startMs / 1000,
    endTime: (row.startMs + Math.max(0, row.durationMs)) / 1000,
    words: last ? [{ endTime: (last.start_ms + last.duration_ms + offsetMs) / 1000 }] : [],
    filtered: row.filtered === true,
  };
  for (const key of ['id', 'agentId', 'songPart', 'blockIndex', 'isChorus'])
    if (row[key] !== undefined && row[key] !== null) result[key] = row[key];
  return result;
}
