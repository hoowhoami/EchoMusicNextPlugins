import { foliaURL } from './folia-source.mjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';
import { createHash } from 'node:crypto';
import * as actual from '../plugins/folia-lyrics-skin/qml/shared/transitions/layers.mjs';

const upstream = foliaURL('');
const sourcePath = 'src/components/visualizer/styleTransition/layerTransition.ts';
async function oracle() {
  // Evaluate the complete, independently read original module, without calling
  // its React hooks. The pure exports must agree for interrupted changes too.
  const source = await readFile(new URL(sourcePath, upstream), 'utf8');
  const { code } = await transform(source.replace(/^import .*;\r?$/gm, ''), {
    loader: 'ts',
    format: 'esm',
    target: 'es2016',
  });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}
test('two-layer state follows actual Folia for 5000 interrupted, returned and reduced-motion changes', async () => {
  const source = await oracle();
  let expected = [{ key: 0, value: 'classic', leaving: false, comesIn: false, waits: false }];
  let received = structuredClone(expected);
  let seed = 0x741a;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  for (let step = 0; step < 5000; ++step) {
    const value = ['classic', 'monet', 'sora', null][random() % 4];
    const animate = random() % 7 !== 0,
      waits = random() % 3 !== 0;
    expected = source.nextShownLayers(expected, value, animate, waits);
    received = actual.nextShownLayers(received, value, animate, waits);
    if (random() % 3 === 0) {
      const key = random() % 2 ? expected[expected.length - 1].key : -1;
      expected = source.startedLayers(expected, key);
      received = actual.startedLayers(received, key);
    }
    assert.deepEqual(received, expected, `change ${step}`);
    assert.ok(received.length <= 2);
    // The real animation finish removes a leaving layer.
    if (random() % 4 === 0) {
      expected = expected.filter((layer) => !layer.leaving);
      received = received.filter((layer) => !layer.leaving);
    }
  }
});
test('soft focus and retained source fingerprints match the pinned original', async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL('../plugins/folia-lyrics-skin/qml/shared/transitions/source.json', import.meta.url),
      'utf8',
    ),
  );
  assert.equal(manifest.revision, 'a8da4437cf19723555bd75e4685ca20815fe5b82');
  for (const [key, digest] of [
    ['sourcePath', 'sourceSha256'],
    ['softFocusPath', 'softFocusSha256'],
  ])
    assert.equal(
      createHash('sha256')
        .update(await readFile(new URL(manifest[key], upstream)))
        .digest('hex'),
      manifest[digest],
    );
  const source = await readFile(new URL(manifest.softFocusPath, upstream), 'utf8');
  const { code } = await transform(source.replace(/^import .*;\r?$/gm, ''), {
    loader: 'ts',
    format: 'esm',
  });
  const { default: expected } = await import(
    `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
  );
  assert.deepEqual(actual.softFocus, expected);
  assert.equal(manifest.firstFrameLimitMs, 1500);
  assert.equal(manifest.backgroundReadyLimitMs, 1000);
});
