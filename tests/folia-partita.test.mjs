import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const base = new URL('../plugins/folia-lyrics-skin/qml/styles/partita/', import.meta.url);
async function load(name) {
  const url = new URL(name, base);
  assert.ok(existsSync(url), `Actual Partita ${name} must exist`);
  return import(url);
}
const chars = Array.from('一二三四五六七八九十');
const line = {
  fullText: chars.join(''),
  startTime: 3.25,
  endTime: 7,
  words: chars.map((text, index) => ({
    text,
    startTime: 3.25 + index * 0.3,
    endTime: 3.25 + (index + 1) * 0.3,
  })),
  autoWordSegments: chars,
};
const theme = {
  animationIntensity: 'normal',
  fontWeight: null,
  wordColors: [],
  accentColor: '#ff4488',
};

test('Partita preserves defaults, ordered stagger clamping and density font boundaries', async () => {
  const K = await load('layout.mjs');
  assert.deepEqual(K.resolvePartitaTuning(), {
    showGuideLines: true,
    useSemanticLayout: true,
    staggerMin: 20,
    staggerMax: 100,
  });
  assert.deepEqual(
    K.resolvePartitaTuning({
      showGuideLines: false,
      useSemanticLayout: false,
      staggerMin: 190,
      staggerMax: -2,
    }),
    { showGuideLines: false, useSemanticLayout: false, staggerMin: 0, staggerMax: 180 },
  );
  assert.equal(K.fontSize(320, 40, 1), 40);
  assert.equal(K.fontSize(320, 41, 1), 32);
  assert.equal(K.fontSize(1600, 40, 1), 72);
  assert.equal(K.fontSize(1000, 40, 1), 55);
  assert.equal(K.fontSize(1000, 41, 1), 44);
  assert.equal(K.shouldPreheat(5, 3.799), false);
  assert.equal(K.shouldPreheat(1.2, 0), true);
  assert.equal(K.shouldPreheat(0.18, 0), true);
  assert.equal(K.shouldPreheat(5, 4.821), false);
});

test('Partita matches actual source single-column uneven chunks and seeded normal configs', async () => {
  const K = await load('layout.mjs');
  const layout = K.getOrBuildPartitaLayout(new Map(), line, theme, 820, K.resolvePartitaTuning());
  assert.equal(layout.columns.length, 1);
  assert.equal(layout.totalGraphemes, 10);
  assert.deepEqual(layout.lineConfig, {
    perspective: 1000,
    alignItems: 'items-center',
    justifyContent: 'justify-center',
    columnGap: '2rem',
  });
  assert.deepEqual(
    layout.columns[0].words.map((chunk) => chunk.displayWords.map((word) => word.text).join('')),
    ['一', '二', '三四五', '六七', '八九十'],
  );
  assert.deepEqual(
    layout.columns[0].words.map((chunk) => [
      chunk.config.x,
      chunk.config.y,
      chunk.config.rotate,
      chunk.config.scale,
      chunk.config.passedRotate,
    ]),
    [
      [-84.70320920445374, -5, 0, 0.8378921540628653, 3],
      [91.58830434684205, -2.5, 0, 0.8141263568409158, -3],
      [-93.60199099086458, 0, 0, 1.5258051698543114, 3],
      [28.790174590903916, 2.5, 0, 1.1699101948630415, -3],
      [-37.73486123151088, 5, 0, 0.9633786370158305, 3],
    ],
  );
  const calm = K.getOrBuildPartitaLayout(
    new Map(),
    line,
    { ...theme, animationIntensity: 'calm' },
    360,
    K.resolvePartitaTuning(),
  );
  assert.deepEqual(
    calm.columns[0].words.map((chunk) => [
      chunk.displayWords.map((word) => word.text).join(''),
      chunk.config.x,
      chunk.config.y,
      chunk.config.scale,
    ]),
    [
      ['一二三', -28.513417133217445, 0, 1],
      ['四五六七八九十', 72.40525872635772, 0, 1],
    ],
  );
  const chaotic = K.getOrBuildPartitaLayout(
    new Map(),
    line,
    { ...theme, animationIntensity: 'chaotic' },
    820,
    K.resolvePartitaTuning(),
  );
  assert.equal(chaotic.lineConfig.perspective, 720);
  assert.deepEqual(
    chaotic.columns[0].words.map((chunk) => [
      chunk.config.rotate,
      chunk.config.scale,
      chunk.config.passedRotate,
      chunk.config.marginBottom,
    ]),
    [
      [-3, 0.846271075603494, 6, '0.4rem'],
      [3, 0.822267620409325, -6, '0.4rem'],
      [-3, 1.5715793249499408, 6, '0.4rem'],
      [3, 1.1933083987603024, -6, '0.4rem'],
      [-3, 0.9922799961263055, 6, '0.4rem'],
    ],
  );
});

test('Partita semantic and saved split affect actual chunks, stable cache keys and 48-entry eviction', async () => {
  const K = await load('layout.mjs');
  const tune = K.resolvePartitaTuning();
  assert.equal(
    K.buildPartitaLayoutCacheKey(line, theme, 820, tune),
    'semantic-layout-v1|3.25|7|10|一二三四五六七八九十|a1,1,1,1,1,1,1,1,1,1|normal|auto|34|20|100|1|1',
  );
  const cache = new Map();
  const a = K.getOrBuildPartitaLayout(cache, line, theme, 820, tune);
  assert.equal(K.getOrBuildPartitaLayout(cache, line, theme, 821, tune), a);
  const saved = { ...line, wordSegments: ['一二三四五', '六七八九十'] };
  const b = K.getOrBuildPartitaLayout(cache, saved, theme, 820, tune);
  assert.notEqual(a, b);
  assert.equal(b.columns[0].words.length, 2);
  const raw = K.getOrBuildPartitaLayout(cache, saved, theme, 820, {
    ...tune,
    useSemanticLayout: false,
  });
  assert.equal(raw.columns[0].words.length, 5);
  for (let index = 0; index < 60; index++)
    K.getOrBuildPartitaLayout(cache, { ...line, startTime: index }, theme, 820, tune);
  assert.equal(cache.size, 48);
  assert.equal(cache.has(K.buildPartitaLayoutCacheKey(line, theme, 820, tune)), false);
});

test('Partita row geometry uses measured native word widths and fixed source padding/gaps', async () => {
  const K = await load('layout.mjs');
  const layout = K.getOrBuildPartitaLayout(new Map(), line, theme, 820, K.resolvePartitaTuning());
  const rows = layout.columns[0].words;
  const metrics = rows.map((row) =>
    row.displayWords.map((word, index) => ({ width: 40 + index * 10, height: 70, baseline: 55 })),
  );
  const geometry = K.columnGeometry(rows, metrics, 60);
  assert.equal(geometry.height, 5 * (60 * 1.22 + 6.4 + 9.6));
  assert.ok(Math.abs(geometry.width - (40 + 50 + 60 + 3 * 12.8 + 16 + 24)) < 1e-12);
  assert.deepEqual(geometry.chunks[0].words[0], { x: 8, y: (60 * 1.22 - 70) / 2 + 3.2 });
  const guide = K.guideGeometry(200, 80, false);
  assert.deepEqual(guide, {
    vertical: { x: -8, y: 64, width: 1, height: 32 },
    horizontal: { x: -16, y: 87, width: 236, height: 1 },
  });
  assert.equal(K.guideGeometry(200, 80, true).horizontal.x, -20);
});

test('Partita chunk timing, guide appearance and wall-clock spring retain source branches', async () => {
  const M = await load('motion.mjs');
  const profile = M.profile({ startTime: 1, endTime: 4, words: [] });
  const words = [
    { text: 'a', startTime: 1, endTime: 2 },
    { text: 'b', startTime: 2, endTime: 3 },
  ];
  assert.equal(M.chunkState(words, 0.849, profile), 'waiting');
  assert.equal(M.chunkState(words, 0.85, profile), 'active');
  assert.equal(M.chunkState(words, 3, profile), 'active');
  assert.equal(M.chunkState(words, 3.001, profile), 'passed');
  const config = { x: -50, y: 3, rotate: -3, scale: 1.2 };
  const waiting = M.chunkPose('waiting', config, 0, null);
  assert.deepEqual(waiting, { opacity: 0, scale: 0.85, x: -90, y: 3, rotation: -3 });
  const active = M.chunkPose('active', config, 1, { state: 'active', at: 0, origin: waiting });
  assert.equal(active.opacity, 1);
  assert.equal(active.scale, 1);
  assert.equal(active.x, -50);
  assert.equal(M.guidePose('passed', 1, 0).color, 'rgba(255,255,255,0.22)');
  assert.equal(M.guidePose('active', 0.4, 0).opacity, 1);
});

test('Partita per-word jitter matches source independently of chunk positioning and Classic settings', async () => {
  const K = await load('layout.mjs');
  const words = [{ startTime: 3.85 }, { startTime: 4.15 }];
  const config = { id: '2-3.85', scale: 1.5258051698543114 };
  const normal = K.wordConfigs(words, config, 'normal');
  assert.deepEqual(
    normal.map((word) => [word.x, word.y, word.rotate, word.scale, word.passedRotate]),
    [
      [
        0.4156839944116655, -1.6821407831594115, -0.14385311933983758, 1.5258051698543114,
        -0.3484392030622985,
      ],
      [
        1.012673702363827, -1.7663404569775594, 1.4807265708222985, 1.5258051698543114,
        4.892220582778464,
      ],
    ],
  );
  assert.deepEqual(
    K.wordConfigs(words, config, 'calm').map((word) => [word.x, word.y, word.rotate]),
    [
      [0, -0, -0],
      [0, -0, 0],
    ],
  );
  const M = await load('motion.mjs');
  assert.equal(
    M.motionSettings({ classicEnableWordRotation: false }).classicEnableWordRotation,
    true,
  );
  assert.notEqual(M.breathing(1.75, { classicBreathingFloatMultiplier: 0 }).y, 0);
});
