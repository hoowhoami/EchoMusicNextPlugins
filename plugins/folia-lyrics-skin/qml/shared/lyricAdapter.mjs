// Read-only view projection. Host rows include the offset on line startMs;
// parser words retain raw milliseconds. Folia kernels consume seconds.
import { buildLineRenderHints } from './renderHints.mjs';
import { buildTimedWords } from './lineTiming.mjs';

function projectWord(word, offsetMs) {
  const startTime = (word.start_ms + offsetMs) / 1000;
  const value = {
    text: word.text,
    startTime,
    endTime: (word.start_ms + offsetMs + Math.max(0, word.duration_ms)) / 1000,
  };
  if (Array.isArray(word.syllables))
    value.syllables = word.syllables.map((syllable) => projectWord(syllable, offsetMs));
  return value;
}
export function toFoliaLine(row, offsetMs, sourceIndex) {
  const startTime = row.startMs / 1000;
  const line = {
    sourceIndex,
    fullText: row.lineText,
    startTime,
    endTime: (row.startMs + Math.max(0, row.durationMs)) / 1000,
    words: (row.words || []).map((word) => projectWord(word, offsetMs)),
    translation: row.translation || '',
    romanization: row.romanization || '',
    filtered: row.filtered === true,
  };
  for (const key of ['id', 'agentId', 'songPart', 'blockIndex', 'isChorus'])
    if (row[key] !== undefined && row[key] !== null) line[key] = row[key];
  if (Array.isArray(row.alternateTexts)) line.alternateTexts = row.alternateTexts;
  line.timingSource = line.words.length ? 'word' : 'line-interpolated';
  if (!line.words.length) line.words = buildTimedWords(line.fullText, line.startTime, line.endTime);
  line.renderHints = buildLineRenderHints(line);
  return line;
}
export function lineWindow(index, count, radius = 16) {
  const current = Math.max(0, Math.min(count - 1, index));
  return { first: Math.max(0, current - radius), last: Math.min(count - 1, current + radius) };
}
export function batchLines(lines) {
  const result = [];
  let current = [],
    units = 0;
  for (const line of lines) {
    const length = line.fullText.length;
    if (length > 65536) throw new Error('A line exceeds the 65536 UTF-16 segmentation limit');
    if (current.length === 64 || units + length > 65536) {
      result.push(current);
      current = [];
      units = 0;
    }
    current.push(line);
    units += length;
  }
  if (current.length) result.push(current);
  return result;
}
