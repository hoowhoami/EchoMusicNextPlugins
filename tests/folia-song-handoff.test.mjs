import { foliaPath } from './folia-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';
import ts from 'typescript';
import * as clock from '../plugins/folia-lyrics-skin/qml/shared/handoff-clock.mjs';
import * as text from '../plugins/folia-lyrics-skin/qml/styles/monet/song-handoff.mjs';
import * as portrait from '../plugins/folia-lyrics-skin/qml/styles/monet/portrait-crossfade.mjs';
import { keepHandoffCover } from '../plugins/folia-lyrics-skin/qml/shared/handoff-cover.mjs';

const source = await build({
  stdin: {
    contents:
      "export * from './src/services/automix/handoffProgress.ts';export * from './src/components/visualizer/monet/monetSongHandoff.ts';export * from './src/components/visualizer/monet/monetPortraitCrossfade.ts';export { keepHandoffCover } from './src/components/visualizer/useHandoffCover.ts';",
    resolveDir: foliaPath(),
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});

const oracle = await import(
  'data:text/javascript;base64,' + Buffer.from(source.outputFiles[0].text).toString('base64')
);

// Compile only this pure selector from the fixed store file. Importing the
// entire React store would initialize unrelated playback/browser services.
const store = ts.createSourceFile(
  'usePlaybackStore.ts',
  await readFile(foliaPath('src/stores/usePlaybackStore.ts'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
);
const displaySelector = store.statements
  .filter(ts.isVariableStatement)
  .flatMap((statement) => statement.declarationList.declarations)
  .find((declaration) => declaration.name.getText(store) === 'selectDisplaySong');
assert.ok(displaySelector?.initializer, 'pinned source must expose its actual display selector');
const compiledDisplaySelector = await transform(
  'export const selectDisplaySong = ' + displaySelector.initializer.getText(store),
  { loader: 'ts', format: 'esm' },
);
const displayOracle = await import(
  'data:text/javascript;base64,' + Buffer.from(compiledDisplaySelector.code).toString('base64')
);

test('every source style retains the actual A presentation until settle; only Monet crosses on a real cue', () => {
  const modes = [
    'sonnet',
    'tempera',
    'lumiere',
    'classic',
    'cadenza',
    'partita',
    'fume',
    'tilt',
    'claddagh',
    'monet',
    'pendolo',
    'cappella',
    'diorama',
    'still',
  ];
  const native = {
    valid: true,
    phase: 'mixing',
    cueReady: true,
    handedOver: true,
    outgoing: { id: 'A' },
    incoming: { id: 'B' },
  };
  for (const mode of modes) {
    for (const progress of [0, 0.49, 0.5, 0.7, 1]) {
      const result = clock.resolveSongPresentation(native, mode, true, progress);
      assert.equal(result.holding, true);
      assert.equal(result.followsCue, mode === 'monet');
      assert.equal(result.crossed, mode === 'monet' && oracle.monetTextShowsIncoming(progress));
    }
    for (const unavailable of [
      { ...native, cueReady: false },
      { ...native, phase: 'queued', handedOver: false },
    ]) {
      const result = clock.resolveSongPresentation(unavailable, mode, false, null);
      assert.equal(result.holding, true);
      assert.equal(result.followsCue, false);
      assert.equal(result.crossed, false);
    }
    for (const ended of [null, { ...native, valid: false }, { ...native, phase: 'completed' }])
      assert.deepEqual(clock.resolveSongPresentation(ended, mode, true, 1), {
        holding: false,
        followsCue: false,
        crossed: false,
      });
    assert.deepEqual(
      clock.resolveSongPresentation({ ...native, incoming: { id: 'A' } }, mode, true, 0.7),
      { holding: true, followsCue: false, crossed: false },
      'repeat one suppresses the Monet blend but retains the outgoing lyric coordinate until settle',
    );
  }
});

test('real gain cue maps through the pinned Folia visual curve, never raw overlap progress', () => {
  for (const crossover of [0, 0.01, 0.27, 0.5, 0.83, 0.99, 1])
    for (let i = -10; i <= 1010; ++i) {
      const p = i / 1000;
      assert.equal(
        clock.mapTrackHandoffProgress(p, crossover),
        oracle.mapTrackHandoffProgress(p, crossover),
      );
      assert.equal(clock.progressSince(p, crossover), oracle.progressSince(p, crossover));
      assert.equal(text.monetTextShowsIncoming(p), oracle.monetTextShowsIncoming(p));
    }
});
test('one existing presentation sample projects native paired source positions and freezes completed A', () => {
  const native = {
    valid: true,
    phase: 'mixing',
    handedOver: true,
    hasIncomingPosition: true,
    incomingPositionMs: 7000,
    outgoingPositionMs: 100100,
    outgoingEndMs: 102000,
    outgoingTempoRatio: 1.05,
    outputSpeed: 2,
    cueElapsedMs: 50,
    cueDurationMs: 100,
    cueReady: true,
    crossover: 0.7,
  };
  const pair = clock.pairedClock(native, 7050);
  assert.equal(pair.outgoingMs, 100152.5);
  assert.equal(pair.incomingMs, 7050);
  assert.equal(pair.cueElapsedMs, 75);
  assert.equal(pair.progress, oracle.mapTrackHandoffProgress(0.75, 0.7));
  assert.deepEqual(
    clock.pairedClock(native, 7050),
    pair,
    'paused same sample cannot advance either deck',
  );
  const queued = clock.pairedClock(
    { ...native, phase: 'queued', handedOver: false, hasIncomingPosition: false, cueElapsedMs: 0 },
    100250,
  );
  assert.equal(queued.outgoingMs, 100250);
  assert.equal(queued.incomingMs, null);
  assert.equal(queued.progress, 0);
  const completed = clock.pairedClock({ ...native, phase: 'completed' }, 9000);
  assert.equal(completed.outgoingMs, 100100);
  assert.equal(completed.cueElapsedMs, 50);
  assert.equal(completed.incomingMs, 9000);
  assert.equal(clock.pairedClock({ ...native, cueReady: false }, 7050).progress, null);
  assert.equal(clock.pairedClock({ valid: false }, 7050), null);
});
test('Monet selects the true B lyric context at crossover and preserves original four-layer cancellation rules', () => {
  const a = {
    seed: 'A',
    songTitle: 'A title',
    songArtist: 'A artist',
    songAlbum: 'A album',
    lines: [{ fullText: 'A lyrics' }],
    currentTime: 100.2,
    currentLineIndex: 7,
    theme: { color: 'A' },
    subtitleTheme: {},
  };
  const b = {
    ...a,
    seed: 'B',
    songTitle: 'B title',
    lines: [{ fullText: 'B lyrics' }],
    currentTime: 7.4,
    currentLineIndex: 1,
  };
  for (const crossed of [false, true])
    assert.deepEqual(
      text.resolveMonetSongText(a, b, crossed),
      oracle.resolveMonetSongText(a, b, crossed),
    );
  let actual = [],
    expected = [];
  for (let i = 0; i < 12; ++i) {
    const at = i % 3 === 0 ? 0.2 : undefined;
    actual = portrait.pushMonetPortraitLayer(actual, 'cover-' + i, 'key-' + i, at);
    expected = oracle.pushMonetPortraitLayer(expected, 'cover-' + i, 'key-' + i, at);
    assert.deepEqual(actual, expected);
    assert.ok(actual.length <= 4);
  }
  for (const requested of ['cover-9', 'cover-11', '', null]) {
    const ended = portrait.endMonetPortraitHandoff(actual, requested);
    assert.deepEqual(ended, oracle.endMonetPortraitHandoff(expected, requested));
    assert.deepEqual(
      portrait.dropLeavingMonetPortraitLayers(ended),
      oracle.dropLeavingMonetPortraitLayers(ended),
    );
  }
  for (const layer of actual)
    assert.deepEqual(
      portrait.settleMonetPortraitLayers(actual, layer.key),
      oracle.settleMonetPortraitLayers(expected, layer.key),
    );
});

test('background retains the first B address, returns on cancel and drops revoked object URLs exactly as source', () => {
  let actual = null,
    expected = null;
  for (const [handoff, seed, shown] of [
    [{ seed: 'B', coverUrl: 'https://cover.example/B' }, 'B', 'https://cover.example/A'],
    [{ seed: 'B', coverUrl: 'file:///cached/B.png' }, 'B', 'file:///cached/B.png'],
    [null, 'B', 'file:///cached/B.png'],
    [null, 'A', 'https://cover.example/A'],
    [{ seed: 'C', coverUrl: 'blob:authored-C' }, 'C', 'blob:authored-C'],
    [null, 'C', 'file:///cached/C.png'],
    [null, 'D', null],
  ]) {
    actual = keepHandoffCover(actual, handoff, seed, shown);
    expected = oracle.keepHandoffCover(expected, handoff, seed, shown);
    assert.deepEqual(actual, expected);
  }
});
