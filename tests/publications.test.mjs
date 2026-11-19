import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { localPackages } from '../packages/tools/packages.mjs';
import { publicationEntry } from '../packages/tools/index.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('published local packages match their complete author manifests and checksums', async () => {
  for (const { source } of await localPackages(root)) {
    const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
    const artifact = manifest.distribution.artifact;
    const published = await publicationEntry(path.join(root, artifact), { artifact });
    assert.deepEqual(
      published,
      manifest,
      `${manifest.id}: publish the matching archive and author manifest together`,
    );
  }
});
