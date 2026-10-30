import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
test('completed Fume article verifies every source row before accepting a readonly model replacement', async () => {
  const root = path.resolve('plugins/folia-lyrics-skin/qml/styles/fume');
  const previousWorker = globalThis.WorkerScript;
  try {
    const { toFoliaLine } = await import(
      pathToFileURL(path.join(root, '../../shared/lyricAdapter.mjs'))
    );
    const replies = [];
    globalThis.WorkerScript = { sendMessage: (value) => replies.push(value) };
    await import(pathToFileURL(path.join(root, 'worker.mjs')));
    function send(request) {
      replies.length = 0;
      WorkerScript.onMessage(request);
      return replies.at(-1);
    }
    const input = Array.from({ length: 4 }, (_, i) =>
      toFoliaLine(
        {
          lineText: 'Exact words ' + i,
          startMs: i * 4000,
          durationMs: 4000,
          words: [
            {
              text: 'Exact words ' + i,
              start_ms: i * 4000,
              duration_ms: 4000,
              syllables: [{ text: 'Exact words ' + i, start_ms: i * 4000, duration_ms: 4000 }],
            },
          ],
        },
        0,
        i,
      ),
    );
    const before = structuredClone(input);
    const pieces = input.map((line) => ({
      text: line.fullText,
      pieces: Array.from(
        new Intl.Segmenter('en', { granularity: 'word' }).segment(line.fullText),
        (v) => ({ segment: v.segment, index: v.index, isWordLike: v.isWordLike }),
      ),
    }));
    const context = {
      viewport: { width: 1100, height: 820 },
      theme: { name: 'identity', fontStyle: 'sans', fontFamily: 'Arial' },
      lyricsFontScale: 1,
      tuning: { heroScale: 1 },
    };
    const base = { generation: 1, trackRevision: 'current:1' };
    assert.equal(
      send({ ...base, phase: 'reset', identityKey: 'font/viewport/offset/context' }).phase,
      'read',
    );
    assert.equal(send({ ...base, phase: 'append', lines: input, pieces }).phase, 'read');
    let result = send({ ...base, phase: 'prepare', context });
    for (let i = 0; i < 10000 && result.phase !== 'complete'; ++i) {
      assert.equal(result.error, undefined);
      result =
        result.phase === 'measure'
          ? send({
              ...base,
              phase: 'measurements',
              measurements: result.requests.map((r) => ({
                key: r.key,
                width: r.text.length * r.size * 0.6,
              })),
            })
          : send({ ...base, phase: 'step' });
    }
    assert.equal(result.phase, 'complete');
    assert.equal(result.article.blocks.length, 4);
    assert.deepEqual(input, before);
    const candidate = { generation: 2, trackRevision: 'epoch:sequence:lyric' };
    assert.equal(
      send({ ...candidate, phase: 'identify', identityKey: 'font/viewport/offset/context' }).phase,
      'identity-read',
    );
    assert.equal(
      send({ ...candidate, phase: 'identity-append', lines: input.slice(0, 2), last: false }).phase,
      'identity-read',
    );
    assert.equal(
      send({ ...candidate, phase: 'identity-append', lines: input.slice(2), last: true }).phase,
      'identity-match',
    );
    assert.equal(
      send({ ...candidate, generation: 3, phase: 'identify', identityKey: 'changed font' }).phase,
      'identity-different',
    );
    const changed = structuredClone(input);
    changed[3].words[0].syllables[0].endTime = 15;
    const third = { generation: 4, trackRevision: 'same text later syllable edit' };
    assert.equal(
      send({ ...third, phase: 'identify', identityKey: 'font/viewport/offset/context' }).phase,
      'identity-read',
    );
    assert.equal(
      send({ ...candidate, phase: 'identity-append', lines: input, last: true }),
      undefined,
    );
    assert.equal(
      send({ ...third, phase: 'identity-append', lines: changed, last: true }).phase,
      'identity-different',
    );
  } finally {
    if (previousWorker === undefined) delete globalThis.WorkerScript;
    else globalThis.WorkerScript = previousWorker;
  }
});
