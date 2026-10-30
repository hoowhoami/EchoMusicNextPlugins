import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toFoliaLine,
  lineWindow,
  batchLines,
} from '../plugins/folia-lyrics-skin/qml/shared/lyricAdapter.mjs';

test('host offset is already applied to lines and is applied once to parser words', () => {
  const row = {
    lineText: '海边 café',
    startMs: 1200,
    durationMs: 1600,
    words: [
      { text: '海边 ', start_ms: 1000, duration_ms: 600 },
      { text: 'café', start_ms: 1600, duration_ms: 1000 },
    ],
    translation: 'by the sea',
    romanization: 'hǎi biān',
    filtered: false,
  };
  const line = toFoliaLine(row, 200, 7);
  assert.equal(line.startTime, 1.2);
  assert.equal(line.endTime, 2.8);
  assert.deepEqual(
    line.words.map((w) => [w.startTime, w.endTime]),
    [
      [1.2, 1.8],
      [1.8, 2.8],
    ],
  );
  assert.equal(line.fullText, '海边 café');
  assert.equal(line.translation, 'by the sea');
  assert.equal(line.romanization, 'hǎi biān');
  assert.equal(line.sourceIndex, 7);
  assert.equal(line.renderHints.timingClass, 'normal');
  assert.equal(row.words[0].start_ms, 1000);
});

test('micro lines retain the exact source render floor without fabricating syllables or chorus', () => {
  const line = toFoliaLine({ lineText: '啊', startMs: 1000, durationMs: 20, words: [] }, -300, 0);
  assert.equal(line.startTime, 1);
  assert.equal(line.renderHints.renderEndTime, 1.067);
  assert.equal(line.renderHints.lineTransitionMode, 'none');
  assert.equal(line.isChorus, undefined);
  assert.equal(line.timingSource, 'line-interpolated');
  assert.deepEqual(line.words, [{ text: '啊', startTime: 1, endTime: 1.02 }]);
});

test('plain LRC receives the exact Folia parser display timing without replacing real parser words', () => {
  const row = { lineText: '你好，海边 world', startMs: 1200, durationMs: 2000, words: [] };
  const line = toFoliaLine(row, 200, 7);
  assert.equal(line.timingSource, 'line-interpolated');
  assert.deepEqual(
    line.words.map((word) => word.text),
    ['你', '好', '，', '海', '边', 'world'],
  );
  assert.equal(line.words[0].startTime, 1.2);
  assert.equal(line.words[1].endTime, 1.826086956521739);
  assert.ok(Math.abs(line.words[2].endTime - line.words[2].startTime - 0.05) < 1e-12);
  assert.equal(row.words.length, 0);
  const timed = toFoliaLine(
    { ...row, words: [{ text: row.lineText, start_ms: 1000, duration_ms: 2000 }] },
    200,
    7,
  );
  assert.equal(timed.timingSource, 'word');
  assert.deepEqual(timed.words, [{ text: row.lineText, startTime: 1.2, endTime: 3.2 }]);
});

test('view projection retains optional parser syllables with the same single time conversion', () => {
  const row = {
    lineText: 'yeah',
    startMs: 500,
    durationMs: 600,
    words: [
      {
        text: 'yeah',
        start_ms: 400,
        duration_ms: 600,
        syllables: [
          { text: 'ye', start_ms: 400, duration_ms: 200 },
          { text: 'ah', start_ms: 600, duration_ms: 400 },
        ],
      },
    ],
  };
  assert.deepEqual(
    toFoliaLine(row, 100, 0).words[0].syllables.map((s) => [s.startTime, s.endTime]),
    [
      [0.5, 0.7],
      [0.7, 1.1],
    ],
  );
});

test('lookahead and ICU batches remain bounded for long tracks and long lines', () => {
  assert.deepEqual(lineWindow(99, 100, 8), { first: 91, last: 99 });
  assert.deepEqual(lineWindow(-1, 0, 8), { first: 0, last: -1 });
  const lines = Array.from({ length: 140 }, (_, sourceIndex) => ({
    fullText: 'a'.repeat(1024),
    sourceIndex,
  }));
  const batches = batchLines(lines);
  assert.deepEqual(
    batches.map((b) => b.length),
    [64, 64, 12],
  );
  assert.throws(() => batchLines([{ fullText: 'x'.repeat(65537) }]), /65536/);
});
