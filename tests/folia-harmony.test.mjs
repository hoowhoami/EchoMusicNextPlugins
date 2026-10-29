import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
const base = new URL('../plugins/folia-lyrics-skin/qml/shared/harmony/', import.meta.url);
async function port(name) {
  const url = new URL(name + '.mjs', base);
  assert.ok(existsSync(url), 'The real Harmony ' + name + ' module must exist');
  return import(url);
}
const voice = (text, startTime, endTime, words = []) => ({ text, startTime, endTime, words });
test('Harmony whole-track index agrees with the original active intervals and token signature', async () => {
  const index = await port('index');
  const source = await import('./fixtures/harmony/oracle.mjs');
  const lines = Array.from({ length: 1000 }, (_, i) => ({
    startTime: i * 2,
    endTime: i * 2 + 0.4,
    backgroundVocals:
      i % 9
        ? []
        : [
            voice('Ah, \u{1f469}\u{1f3fd}\u200d\u{1f680} ' + i, i * 2 + 0.3, i * 2 + 8, [
              { text: 'Ah', startTime: i * 2 + 0.3, endTime: i * 2 + 1 },
            ]),
          ],
  }));
  const vocals = source.getLyricsBackgroundVocals(lines);
  const tree = index.buildHarmonyIndex(vocals);
  for (let time = -1; time < 2008; time += 1.217) {
    const expected = source.resolveHarmonySnapshotFromVocals(vocals, time);
    const actual = index.indexedHarmonySnapshot(tree, time);
    assert.deepEqual(actual, expected);
  }
  assert.ok(
    index.indexedHarmonySnapshot(tree, 2).lines.length,
    'a background voice outlives its owning main row',
  );
});
test('Harmony metadata projection adds line offset exactly once and never invents voices', async () => {
  const { backgroundRow } = await port('index');
  const row = {
    startMs: 900,
    durationMs: 20,
    backgroundVocals: [
      {
        lineText: '和聲',
        startMs: 1000,
        durationMs: 900,
        words: [{ text: '和', start_ms: 1100, duration_ms: 300 }],
        agentId: 'back',
        alternateTexts: [{ role: 'translation', text: 'Harmony', lang: 'en' }],
      },
    ],
  };
  assert.deepEqual(backgroundRow(row, -100), [
    Object.assign(voice('和聲', 1, 1.9, [{ text: '和', startTime: 1, endTime: 1.3 }]), {
      agentId: 'back',
      translation: '',
      romanization: '',
      alternateTexts: [{ role: 'translation', text: 'Harmony', lang: 'en' }],
    }),
  ]);
  assert.deepEqual(backgroundRow({ lineText: 'Lead' }, 0), []);
});
test('Source parts, alternate text precedence and grapheme sweep preserve Unicode and punctuation', async () => {
  const kernel = await port('kernel'),
    source = await import('./fixtures/harmony/oracle.mjs');
  const vocal = voice(' (ffi 和👩🏽‍🚀!) ', 1, 5, [
    { text: 'ffi', startTime: 1.2, endTime: 2 },
    { text: '和👩🏽‍🚀', startTime: 2.5, endTime: 4 },
  ]);
  vocal.translation = '  translated  ';
  vocal.romanization = 'roman';
  assert.deepEqual(kernel.buildHarmonyTextParts(vocal), source.buildHarmonyTextParts(vocal));
  for (const mode of ['translation', 'romanization', 'both', 'none', undefined])
    assert.equal(
      kernel.resolveHarmonyAlternateText(vocal, mode, true),
      source.resolveHarmonyAlternateText(vocal, mode, true),
    );
  const timings = kernel.buildLineGraphemeTimeline({
    fullText: vocal.text,
    startTime: 1,
    endTime: 5,
    words: vocal.words,
  });
  assert.deepEqual(
    timings,
    source.buildLineGraphemeTimeline({
      fullText: vocal.text,
      startTime: 1,
      endTime: 5,
      words: vocal.words,
    }),
  );
  const offsets = timings.map((_, i) => i * 7);
  offsets.push(timings.length * 7);
  for (const time of [0.9, 1, 1.25, 1.8, 2.49, 2.5, 3.3, 4, 4.8, 5, 8])
    assert.equal(
      kernel.fillWidth(vocal, timings, offsets, time),
      source.fillWidth(vocal, timings, offsets, time),
    );
});
test('Source exact word colors and viewport clamps match both CSS rounding and measurement metrics', async () => {
  const kernel = await port('kernel'),
    source = await import('./fixtures/harmony/oracle.mjs');
  const colors = [
    { word: '和声', color: '#f00121' },
    { word: 'hello world', color: '#12ff00' },
  ];
  for (const word of ['和', '和声', 'hello!', 'WORLD', 'other', ' '])
    assert.equal(
      kernel.resolveWordColor(word, colors, '#abc', { cjkMatchMode: 'exact' }),
      source.resolveWordColor(word, colors, '#abc', { cjkMatchMode: 'exact' }),
    );
  const geometry = kernel.harmonyGeometry(1100, 1.05, true);
  assert.equal(geometry.measureFontPx, 19.8 * 1.05);
  assert.equal(geometry.fontPx, Math.min(1.365 * 16, Math.max(0.998 * 16, 1.89 * 11)));
  assert.equal(geometry.top, 76);
  assert.equal(geometry.maxWidth, 896);
  assert.equal(geometry.paddingX, 16);
  assert.equal(geometry.gap, 6);
  assert.deepEqual(kernel.maskStops(13, 20), { edge: 30, solid: 3, half: 16.5, alpha: 0.86 });
});
test('A large sparse interval tree does not scan inactive voices on every frame', async () => {
  const { buildHarmonyIndex, queryHarmonyIndices } = await port('index');
  const vocals = Array.from({ length: 65536 }, (_, i) => voice('a', i * 4, i * 4 + 1));
  const tree = buildHarmonyIndex(vocals),
    stats = { visited: 0 };
  assert.deepEqual(queryHarmonyIndices(tree, 120000.5, stats), [30000]);
  assert.ok(stats.visited < 100, stats.visited + ' tree nodes visited');
});
test('Declared source section and agent facts survive both shared projections without synthesizing absent metadata', async () => {
  const { toFoliaLine } = await import('../plugins/folia-lyrics-skin/qml/shared/lyricAdapter.mjs');
  const { timingRow, buildTimelineIndex } =
    await import('../plugins/folia-lyrics-skin/qml/shared/timelineIndex.mjs');
  const row = {
    lineText: 'A',
    startMs: 0,
    durationMs: 1000,
    words: [],
    id: 'line-1',
    agentId: 'lead',
    songPart: 'Chorus',
    blockIndex: 3,
    isChorus: true,
    alternateTexts: [{ role: 'translation', text: '译', lang: 'zh' }],
  };
  const line = toFoliaLine(row, 0, 4),
    metadata = buildTimelineIndex([timingRow(row, 0, 4)]).lineMetadata[0];
  for (const key of ['id', 'agentId', 'songPart', 'blockIndex', 'isChorus']) {
    assert.equal(line[key], row[key]);
    assert.equal(metadata[key], row[key]);
  }
  assert.deepEqual(line.alternateTexts, row.alternateTexts);
  const plain = toFoliaLine({ lineText: 'Plain', startMs: 0, durationMs: 1000, words: [] }, 0, 0);
  assert.equal(Object.hasOwn(plain, 'agentId'), false);
  assert.equal(Object.hasOwn(plain, 'isChorus'), false);
});
test('Source pretext prefix measurement requests the exact normalized ICU input, including line breaks and preserved display spaces', async () => {
  const { requestedTexts } = await port('layout-job');
  assert.deepEqual(requestedTexts([voice('  A \n B  ', 0, 1)]), ['A', 'A B']);
});
