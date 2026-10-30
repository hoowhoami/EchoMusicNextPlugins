import { foliaPath } from './folia-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
let api;
try {
  api = await import('../plugins/folia-lyrics-skin/qml/shared/asset-archive/tempera-format.mjs');
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
let original;
async function source() {
  if (original) return original;
  const base = foliaPath();
  const result = await build({
    entryPoints: [path.join(base, 'src/services/temperaImageArchiveFormat.ts')],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  });
  original = await import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  );
  return original;
}
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
function requireApi() {
  assert.ok(api, 'Tempera archive adapter is missing');
}
test('Tempera archive placement/MIME resolution matches original source, including legacy bare IDs', async () => {
  requireApi();
  const sourceApi = await source();
  const files = {
    'images/bare': png,
    'images/svg.svg': svg,
    'images/astral😀.png': png,
    'images/alias.jpeg': png,
  };
  const manifest = [
    null,
    { id: '../x' },
    { id: 'missing' },
    { id: 'bare', name: 'raw', scale: 99, opacity: -2 },
    {
      id: ' svg ',
      name: ' draw.svg ',
      align: 'left',
      verticalAlign: 'top',
      scale: 0.13,
      opacity: 0.37,
    },
    { id: 'astral😀', name: 'smile', align: 'constructor', verticalAlign: '__proto__' },
    { id: 'alias', name: 'type.gif' },
  ];
  const expected = sourceApi
    .collectTemperaArchiveEntries(files, manifest)
    .map(({ image, mimeType }) => ({ image, mimeType }));
  const entries = Object.keys(files).map((name) => ({
    path: name,
    bytes: files[name].length,
    mimeType: name.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
  }));
  assert.deepEqual(
    api.collectEntries(entries, manifest).map(({ image, mimeType }) => ({ image, mimeType })),
    expected,
  );
  for (const row of expected)
    assert.equal(
      api.entryPath(row.image, row.mimeType),
      sourceApi.buildTemperaArchiveEntryPath(row.image, row.mimeType),
    );
});
test('Tempera import preserves order and counts skipped/capacity separately; old pool-wide tuning is ignored', () => {
  requireApi();
  const lease = {
    entries: [
      { path: 'images/a.png', mimeType: 'image/png' },
      { path: 'images/b', mimeType: 'image/png' },
    ],
    jsonFiles: {
      'meta.json': { kind: 'folia-tempera-pool', schemaVersion: 1 },
      'pool.json': {
        layerImages: [{ id: 'a' }, { id: 'missing' }, { id: 'b' }, { id: 'a' }],
        layerImageDepth: 99,
        layerImageFrequency: 99,
      },
    },
  };
  const plan = api.importPlan(lease, 15);
  assert.equal(plan.skipped, 1);
  assert.equal(plan.truncated, 2);
  assert.deepEqual(plan.selections, [{ path: 'images/a.png', name: 'image' }]);
  const imported = api.acceptImported(plan, [
    { handle: 'new-1', name: 'image', entryPath: 'images/a.png', ordinal: 0 },
  ]);
  assert.deepEqual(imported, [
    { id: 'new-1', name: 'image', align: 'free', verticalAlign: 'bottom', scale: 0.7, opacity: 1 },
  ]);
  assert.throws(() =>
    api.importPlan({ ...lease, jsonFiles: { 'meta.json': { kind: 'wrong' }, 'pool.json': {} } }, 0),
  );
});
test('Tempera export includes only reachable original handles and exact source ZIP JSON shape', () => {
  requireApi();
  const placement = {
    id: 'managed-a',
    name: 'picture.svg',
    align: 'right',
    verticalAlign: 'free',
    scale: 0.15,
    opacity: 0.8,
  };
  const result = api.exportPlan(
    [placement, { id: 'gone' }],
    [{ handle: 'managed-a', mimeType: 'image/svg+xml' }],
  );
  assert.deepEqual(result.entries, [{ handle: 'managed-a', path: 'images/managed-a.svg' }]);
  assert.deepEqual(result.jsonFiles, {
    'pool.json': { layerImages: [placement] },
    'meta.json': { kind: 'folia-tempera-pool', schemaVersion: 1, imageCount: 1 },
  });
  assert.equal(result.skipped, 1);
});
test('Draft edits keep old handles until successful single commit and retain only the final pool', () => {
  requireApi();
  const initial = [
    { id: 'old', name: 'old.png', align: 'free', verticalAlign: 'bottom', scale: 0.7, opacity: 1 },
  ];
  const draft = api.beginDraft(initial, 0.2, 0.4);
  const added = api.addImages(draft, [{ handle: 'new', name: 'new.gif' }]);
  const removed = api.removeImage(added, 'old');
  assert.deepEqual(
    initial.map((x) => x.id),
    ['old'],
  );
  assert.deepEqual(api.commitPlan(removed, initial, 0.2, 0.4), {
    patch: {
      temperaLayerImages: removed.images,
      temperaLayerImageDepth: 0.2,
      temperaLayerImageFrequency: 0.4,
    },
    retained: ['new'],
    discarded: ['old'],
  });
  assert.deepEqual(api.abortPlan(removed), ['new']);
  assert.equal(api.commitPlan(api.beginDraft(initial, 0.2, 0.4), initial, 0.2, 0.4).patch, null);
});
test('Opaque native handles get portable ZIP IDs and duplicate placements share one original entry', () => {
  requireApi();
  const image = {
    id: 'asset:0123456789abcdef0123456789abcdef',
    name: 'a.svg',
    align: 'free',
    verticalAlign: 'bottom',
    scale: 0.7,
    opacity: 1,
  };
  const plan = api.exportPlan(
    [image, { ...image, opacity: 0.3 }],
    [{ handle: image.id, mimeType: 'image/svg+xml' }],
  );
  assert.deepEqual(plan.entries, [
    { handle: image.id, path: 'images/0123456789abcdef0123456789abcdef.svg' },
  ]);
  assert.deepEqual(
    plan.jsonFiles['pool.json'].layerImages.map((value) => value.id),
    ['0123456789abcdef0123456789abcdef', '0123456789abcdef0123456789abcdef'],
  );
  assert.equal(plan.jsonFiles['meta.json'].imageCount, 2);
});
