import { foliaPath } from './folia-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const upstream = foliaPath('src/components/visualizer') + '/';
const base = new URL('../plugins/folia-lyrics-skin/qml/preview/', import.meta.url);
const source = readFileSync(upstream + 'preview/useVisPlaygroundPreviewPlayback.ts', 'utf8');
const waveBody = transformSync(
  source.slice(
    source.indexOf('            const wave ='),
    source.indexOf('            spectrum.set(nextSpectrum);') +
      '            spectrum.set(nextSpectrum);'.length,
  ),
  { loader: 'ts', target: 'es2016' },
).code;
const originalLevels = new Function(
  'now',
  `
  const result = {};
  const signal = key => ({ set: value => result[key] = value });
  const [audioPower,bass,lowMid,mid,vocal,treble,spectrum] = ['audioPower','bass','lowMid','mid','vocal','treble','spectrum'].map(signal);
  ${waveBody}
  result.spectrum = Array.from(result.spectrum);
  return result;
`,
);

test('preview retains the original simulated audio levels and 64-bin spectrum', async () => {
  const clock = await import(new URL('sample-clock.mjs', base));
  for (const wallMs of [0, 16.6, 250, 1000, 18500.125, 999999.9])
    assert.deepEqual(clock.levelsAt(wallMs), originalLevels(wallMs));
});

test('preview frame geometry is exactly the pinned source at every aspect and zoom', async () => {
  const scale = await import(new URL('preview-scale.mjs', base));
  const text = readFileSync(upstream + 'preview/previewScale.ts', 'utf8');
  const code = transformSync(text, { loader: 'ts', format: 'cjs', target: 'es2016' }).code;
  const module = { exports: {} };
  new Function('module', 'exports', code)(module, module.exports);
  for (const width of [0, 320, 720, 1100, 1920])
    for (const height of [240, 820, 1080])
      for (const zoom of [1, 1.15, 1.3]) {
        const args = [{ width, height }, { width: 510, height: 280 }, 1, true, zoom];
        assert.deepEqual(scale.frameStage(...args), module.exports.frameStage(...args));
      }
});

test('sample clock resets per mode/sample, freezes on pause, and wraps the authored loop', async () => {
  const clock = await import(new URL('sample-clock.mjs', base));
  let state = clock.initialState('fume', 14.4);
  assert.ok(Math.abs(state.timeSeconds - 4) < 1e-12);
  state = clock.advance(state, 1000, 14.4);
  assert.ok(Math.abs(state.timeSeconds - 4) < 1e-12);
  state = clock.advance(state, 1250, 14.4);
  assert.ok(Math.abs(state.timeSeconds - 4.25) < 1e-12);
  state = clock.pause(state);
  assert.equal(state.previousTickMs, null);
  state = clock.advance(state, 100000, 14.4);
  assert.ok(Math.abs(state.timeSeconds - 4.25) < 1e-12);
  state = clock.advance(state, 120000, 14.4);
  assert.ok(Math.abs(state.timeSeconds - 9.85) < 1e-12);
  assert.equal(clock.initialState('classic', 14.4).timeSeconds, 0);
});

test('sample active-line boundaries use the original preview selector', async () => {
  const { findLineIndex } = await import(new URL('sample-clock.mjs', base));
  const { samples } = await import(new URL('samples.mjs', base));
  const { toFoliaLine } = await import(new URL('../shared/lyricAdapter.mjs', base));
  const { getLineRenderEndTime } = await import(new URL('../shared/renderHints.mjs', base));
  const source = readFileSync(upstream + 'PreviewPlaceholder.ts', 'utf8');
  const selector = transformSync(
    source
      .slice(source.indexOf('export const findPreviewPlaceholderLineIndex'))
      .replace(/^export /, ''),
    { loader: 'ts', target: 'es2016' },
  ).code;
  const original = new Function(
    'getLineRenderEndTime',
    selector + '\nreturn findPreviewPlaceholderLineIndex;',
  )(getLineRenderEndTime);
  for (const sample of samples) {
    const lines = sample.rows.map((row, index) => toFoliaLine(row, 0, index));
    for (const line of lines)
      for (const time of [line.startTime - 1e-6, line.startTime, line.endTime, line.endTime + 1e-6])
        assert.equal(findLineIndex(lines, time), original(lines, time));
  }
});

test('authored sample rows are a bounded raw-row snapshot with their own timing', async () => {
  const sample = await import(new URL('samples.mjs', base));
  assert.equal(sample.samples.length, 2);
  for (const entry of sample.samples) {
    assert.equal(entry.rows.length, 4);
    assert.ok(entry.rows.every((row) => row.lineText.length > 0 && row.words.length > 0));
    assert.ok(entry.rows.every((row) => row.startMs >= 0 && row.durationMs > 0));
    assert.equal(entry.rows[0].startMs, entry.id === 'default' ? 700 : 0);
    assert.equal(entry.rows[3].startMs + entry.rows[3].durationMs, entry.loopDuration * 1000);
  }
});

test('each authored sample retains timed background voices for the actual Harmony adapter', async () => {
  const { samples } = await import(new URL('samples.mjs', base));
  const { indexForRows } = await import(new URL('harmony.mjs', base));
  const { indexedHarmonySnapshot } = await import(new URL('../shared/harmony/index.mjs', base));
  for (const sample of samples) {
    const index = indexForRows(sample.rows);
    assert.ok(index.vocals.length >= 2);
    for (const vocal of index.vocals) {
      assert.ok(vocal.words.length > 0);
      assert.ok(
        vocal.words.every(
          (word) => word.startTime >= vocal.startTime && word.endTime <= vocal.endTime + 1e-12,
        ),
      );
      assert.ok(
        indexedHarmonySnapshot(index, (vocal.startTime + vocal.endTime) / 2).lines.some(
          (entry) => entry.vocal.text === vocal.text,
        ),
      );
    }
  }
});
