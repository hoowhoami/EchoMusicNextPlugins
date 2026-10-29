import { fileURLToPath } from 'node:url';
import { foliaURL } from './folia-source.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

async function load(path) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(path, import.meta.url))],
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2016',
    logLevel: 'silent',
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
  );
}
const path = '../plugins/folia-lyrics-skin/src/random.ts';

test('the in-page shelf and random pool preserve the pinned registry ordering', async () => {
  const { styles } = await load('../plugins/folia-lyrics-skin/src/styles.ts');
  const expected = [];
  for (const style of styles) {
    const source = await readFile(
      foliaURL(`src/components/visualizer/${style.id}/entry.tsx`),
      'utf8',
    );
    const order = source.match(/\border:\s*(\d+)/);
    assert.ok(order, style.id);
    expected.push({ id: style.id, order: Number(order[1]) });
  }
  expected.sort((left, right) => left.order - right.order);
  assert.deepEqual(
    styles.map((style) => style.id),
    expected.map((style) => style.id),
  );
});

test('random pool matches pinned source normalization and excludes the current mode', async () => {
  const actual = await load(path);
  const source = await load(foliaURL('src/utils/randomVisualizerModes.ts'));
  for (const pool of [
    null,
    [],
    ['unknown'],
    ['still'],
    ['classic', 'fume', 'classic'],
    actual.builtinModes,
  ]) {
    assert.deepEqual(
      actual.normalizeRandomModes(pool),
      source.normalizeRandomVisualizerModes(pool),
    );
    for (const current of actual.builtinModes)
      for (const random of [0, 0.25, 0.5, 0.999999])
        assert.equal(
          actual.pickRandomMode(pool, current, () => random),
          source.pickRandomVisualizerMode(pool || [], current, () => random),
        );
  }
});
test('one style per real song survives metadata refresh, transport changes and replay', async () => {
  const { createRandomSelector } = await load(path);
  let draws = 0;
  const selector = createRandomSelector(() => {
    ++draws;
    return 0;
  });
  const settings = {
    mode: 'classic',
    randomVisualizerModePerSong: true,
    randomVisualizerModes: ['classic', 'fume', 'still'],
  };
  assert.equal(selector.observe('song-a', settings), null);
  assert.equal(selector.observe('song-a', settings), null);
  assert.equal(selector.observe('song-b', settings), 'fume');
  assert.equal(selector.observe('song-b', settings), null, 'queued write cannot reroll');
  assert.equal(selector.observe('song-b', { ...settings, mode: 'fume' }), null);
  assert.equal(selector.observe(null, { ...settings, mode: 'fume' }), null);
  assert.equal(selector.observe('song-b', { ...settings, mode: 'fume' }), null);
  assert.equal(selector.observe('song-c', { ...settings, mode: 'fume' }), 'classic');
  assert.equal(draws, 2);
});
test('enabling and editing pool rerolls only a mode outside the pool', async () => {
  const { createRandomSelector } = await load(path);
  const selector = createRandomSelector(() => 0);
  const settings = {
    mode: 'classic',
    randomVisualizerModePerSong: false,
    randomVisualizerModes: ['classic', 'fume'],
  };
  assert.equal(selector.observe('song-a', settings), null);
  assert.equal(
    selector.observe('song-a', { ...settings, randomVisualizerModePerSong: true }),
    null,
  );
  assert.equal(
    selector.observe('song-a', {
      ...settings,
      randomVisualizerModePerSong: true,
      randomVisualizerModes: ['fume'],
    }),
    'fume',
  );
  assert.equal(
    selector.observe('song-a', {
      ...settings,
      mode: 'fume',
      randomVisualizerModePerSong: true,
      randomVisualizerModes: ['fume'],
    }),
    null,
  );
});
test('random settings preserve all fourteen modes and reject invalid persisted selections', async () => {
  const { defaults, validate } = await load('../plugins/folia-lyrics-skin/src/config.ts');
  const { builtinModes } = await load(path);
  assert.equal(defaults.randomVisualizerModePerSong, false);
  assert.deepEqual(defaults.randomVisualizerModes, builtinModes);
  assert.equal(validate({ ...defaults, randomVisualizerModes: ['still'] }), true);
  for (const randomVisualizerModes of [[], ['unknown'], ['classic', 'classic'], 'classic'])
    assert.notEqual(validate({ ...defaults, randomVisualizerModes }), true);
  assert.notEqual(validate({ ...defaults, randomVisualizerModePerSong: 1 }), true);
});
