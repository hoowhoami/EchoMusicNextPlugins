import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const base = new URL('../plugins/folia-lyrics-skin/qml/styles/tilt/', import.meta.url);
async function load(name) {
  const url = new URL(name, base);
  assert.ok(existsSync(url), `The actual Tilt ${name} implementation must exist`);
  return import(url);
}
const sourceSegmenter = {
  segment: (text) => [...new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)],
};

test('Tilt preserves source probability clamps, logarithmic line count and four color branches', async () => {
  const K = await load('kernel.mjs');
  assert.deepEqual(K.resolveSettings({}), {
    splitProbability: 0.75,
    tiltStyleProbability: 0.35,
    colorScheme: 'default',
    lyricsFontScale: 1,
    fontWeight: null,
  });
  assert.equal(
    K.resolveSettings({ tiltSplitProbability: 9, tiltStyleProbability: -1 }).splitProbability,
    1,
  );
  assert.equal(K.resolveSettings({ tiltStyleProbability: -1 }).tiltStyleProbability, 0);
  for (const [count, expected] of [
    [0, [1, 1, 1, 1]],
    [20, [1, 1, 2, 2]],
    [100, [1, 1, 2, 3]],
    [1000, [1, 1, 3, 4]],
  ])
    assert.deepEqual(
      [0, 0.25, 0.75, 1].map((p) => K.determineLineCount(count, 3.25, p)),
      expected,
    );
  const expected = {
    default: ['p', 'a'],
    swap: ['a', 'p'],
    accentAll: ['a', 'a'],
    primaryAll: ['p', 'p'],
  };
  for (const scheme of Object.keys(expected))
    assert.deepEqual(K.resolveColors(scheme, 'p', 'a'), expected[scheme]);
  assert.equal(K.renderFontSize(320, 1, false), 50);
  assert.equal(K.renderFontSize(1600, 1, false), 90);
  assert.ok(Math.abs(K.renderFontSize(1600, 1, true) - 106.2) < 1e-12);
});

test('SentenceLayout preserves original punctuation, brackets and raw ICU fragment decisions', async () => {
  const S = await load('sentenceLayout.mjs');
  for (const [text, expected] of [
    ['hello world beautiful night', ['hello ', 'world ', 'beautiful ', 'night']],
    [
      '中文 English word：继续（明天）去远方',
      ['中文 ', 'English word：', '继续（明天）', '去远方'],
    ],
    ['甲乙丙丁戊己庚辛壬癸', ['甲乙丙丁戊', '己庚', '辛', '壬癸']],
    ['one (two) three [four] five', ['one (two)', ' three ', '[four]', ' five']],
  ]) {
    const actual = S.SentenceLayout.splitIntoSentences(text, 4, 3.25, sourceSegmenter).map(
      (part) => part.text,
    );
    assert.deepEqual(actual, expected);
    assert.equal(actual.join(''), text);
  }
});

test('Tilt layout matches captured source widths, offsets, one italic limit and overflow resplit', async () => {
  const K = await load('kernel.mjs');
  const measure = (text, italic, size) => text.length * size * 0.6;
  const tuning = K.resolveSettings({});
  const layout = K.buildTiltLayout(
    '愿有一天，与你再相见。',
    3.25,
    tuning,
    1200,
    measure,
    sourceSegmenter,
  );
  assert.deepEqual(layout, {
    segments: [
      { text: '愿有一天，', isTilt: false, isShortLastLine: false, charOffset: 0 },
      { text: '与你再相见。', isTilt: false, isShortLastLine: false, charOffset: 5 },
    ],
    scaleMultiplier: 1,
  });
  const scaled = K.buildTiltLayout(
    'hello world beautiful night',
    3.25,
    { ...tuning, splitProbability: 0 },
    1200,
    measure,
    sourceSegmenter,
  );
  assert.ok(Math.abs(scaled.scaleMultiplier - 0.6995884773662552) < 1e-12);
  const long = K.buildTiltLayout(
    'one two three four five six seven eight nine ten',
    0,
    { ...tuning, splitProbability: 0, tiltStyleProbability: 1 },
    320,
    measure,
    sourceSegmenter,
  );
  assert.equal(long.segments.length, 4);
  assert.equal(long.segments.filter((part) => part.isTilt).length, 1);
  assert.deepEqual(
    long.segments.map((part) => [part.text, part.isTilt, part.charOffset]),
    [
      ['one two three', false, 0],
      ['four five', true, 14],
      ['six seven', false, 24],
      ['eight nine ten', false, 34],
    ],
  );
  assert.ok(Math.abs(long.scaleMultiplier - 0.5596707818930041) < 1e-12);
  assert.equal(
    K.buildTiltLayout('... ', 0, tuning, 1200, measure, sourceSegmenter).segments.length,
    1,
  );
});

test('missing ICU fragments never publish caught fallback and stale generations cannot fill cache', async () => {
  const { FragmentCache } = await load('fragments.mjs');
  const K = await load('kernel.mjs');
  const cache = new FragmentCache();
  const text = 'hello world beautiful night';
  let result;
  const queries = [];
  for (let round = 0; round < 10; round++) {
    result = cache.plan(
      text,
      3.25,
      { ...K.resolveSettings({}), splitProbability: 1 },
      1200,
      (t, i, s) => t.length * s * 0.6,
    );
    if (result.ready) break;
    assert.equal(result.layout, null);
    assert.ok(result.requests.length > 0);
    queries.push(...result.requests);
    assert.equal(
      cache.accept(
        cache.generation,
        result.requests,
        result.requests.map((t) => sourceSegmenter.segment(t)),
      ),
      true,
    );
  }
  assert.ok(result.ready);
  assert.deepEqual(
    result.layout.segments.map((s) => s.text),
    ['hello world', 'beautiful night'],
  );
  assert.ok(queries.includes(text));
  const old = cache.generation;
  cache.invalidate();
  assert.equal(cache.accept(old, [text], [sourceSegmenter.segment(text)]), false);
  assert.equal(cache.size, 0);
  assert.throws(
    () => new FragmentCache({ maxUnits: 5 }).plan(text, 0, K.resolveSettings({}), 320, () => 100),
    /bound|limit/i,
  );
});

test('segment timing uses UTF16 offsets, authored syllables and the exact source pulse curve', async () => {
  const K = await load('kernel.mjs');
  const line = {
    fullText: 'a👩‍🚀 b',
    startTime: 1,
    endTime: 5,
    words: [
      {
        text: 'a👩‍🚀',
        startTime: 1,
        endTime: 4,
        syllables: [
          { text: 'a', startTime: 1, endTime: 1.2 },
          { text: '👩‍🚀', startTime: 2, endTime: 4 },
        ],
      },
      { text: 'b', startTime: 4.5, endTime: 5 },
    ],
  };
  assert.deepEqual(K.findSegmentWordRange(7, 'b', line.fullText, line.words), {
    startWordIndex: 1,
    endWordIndex: 2,
  });
  const timings = K.buildCharTimings(0, 'a👩‍🚀', 1, 4, line);
  assert.deepEqual(
    timings.map((t) => [t.startTime, t.endTime]),
    [
      [1, 1.2],
      [2, 4],
    ],
  );
  assert.equal(K.getCharPulseIntensity(-1, { startTime: 0, endTime: 0.1 }), 0);
  for (const [time, expected] of [
    [0, 0],
    [0.1, 1],
    [0.2, 0],
    [0.3, 0.10416666666666664],
    [0.4, 0.20833333333333334],
    [0.44, 0.25],
    [1, 0.25],
  ])
    assert.ok(
      Math.abs(K.getCharPulseIntensity(time, { startTime: 0, endTime: 0.1 }) - expected) < 1e-12,
    );
  const timings2 = [
    { start: 1, end: 2 },
    { start: 3, end: 4 },
  ];
  assert.equal(K.visibleSegmentIndex(2.74, timings2, { startTime: 1, endTime: 4 }), 0);
  assert.equal(K.visibleSegmentIndex(2.75, timings2, { startTime: 1, endTime: 4 }), 1);
  assert.equal(K.visibleSegmentIndex(0.89, timings2, { startTime: 1, endTime: 4 }), -1);
});

test('Tilt enter, stagger and exit poses use wall time while pulse uses song time', async () => {
  const K = await load('kernel.mjs');
  const normal = K.segmentPose(0.55, false, true, false);
  const italic = K.segmentPose(0.6, true, true, false);
  assert.deepEqual(normal, { opacity: 1, y: 0, scale: 1 });
  assert.deepEqual(italic, { opacity: 1, y: 0, scale: 1 });
  assert.deepEqual(K.segmentPose(0, true, true, false), { opacity: 0, y: 24, scale: 0.92 });
  assert.equal(K.characterPose(0.039, 1, false, false, true, 60).opacity, 0);
  assert.equal(K.characterPose(0.049, 1, true, false, true, 60).opacity, 0);
  assert.equal(K.characterPose(0.55, 1, true, false, true, 60).y, 10);
  assert.deepEqual(K.segmentPose(0.6, true, false, true), { opacity: 0, y: -16, scale: 0.95 });
});

test('native clusters join every intersecting source grapheme timing without reshaping Unicode', async () => {
  const K = await load('kernel.mjs');
  const metric = {
    width: 50,
    graphemes: [
      { start: 0, length: 2, x: 0, advance: 20, clusterStart: 0 },
      { start: 2, length: 1, x: 20, advance: 5, clusterStart: 2 },
      { start: 3, length: 5, x: 25, advance: 25, clusterStart: 3 },
    ],
  };
  const geometry = K.clusterGeometry('ab 👩‍🚀', metric, 60, true);
  const timings = K.clusterTimings(geometry, metric, [
    { startTime: 1, endTime: 2 },
    { startTime: 2, endTime: 3 },
    { startTime: 4, endTime: 5 },
  ]);
  assert.deepEqual(timings, [{ startTime: 1, endTime: 3 }, null, { startTime: 4, endTime: 5 }]);
  assert.deepEqual(
    geometry.clusters.map((part) => part.visualIndex),
    [0, 2, 2],
  );
  assert.equal(geometry.width, 66);
});
