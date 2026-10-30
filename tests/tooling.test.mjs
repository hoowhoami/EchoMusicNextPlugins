import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm, cp, readFile, writeFile, symlink, chmod, stat } from 'node:fs/promises';
import {
  buildPackage,
  buildPluginArchive,
  validatePackage,
  validateManifest,
  localPackages,
  prepareIndex,
} from '../packages/tools/packages.mjs';
import { loadContract, checkBindings, rangeContains } from '../packages/tools/contract.mjs';
import { packPluginArchive, unpackPluginArchive } from '../packages/tools/archives.mjs';
import { dependencyOrder } from '../packages/tools/dependencies.mjs';
import { readIndex, indexEntry, parseEntry, checkPublished } from '../packages/tools/index.mjs';
import { createServer } from 'node:http';
import { once } from 'node:events';

const root = fileURLToPath(new URL('../', import.meta.url));
async function author(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'echo-plugin-tools-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = path.join(temporary, 'source');
  await cp(path.join(root, 'plugins/spectrum-visualizer'), source, { recursive: true });
  return { source, output: path.join(temporary, 'dist') };
}

test('bindings follow actual Qt properties, signals, methods, readonly state and enum values', async () => {
  const contract = await loadContract();
  await checkBindings(contract);
  const changed = structuredClone(contract);
  changed.types.EchoPluginPlayer.properties = changed.types.EchoPluginPlayer.properties.filter(
    (value) => value.name !== 'volume',
  );
  await assert.rejects(checkBindings(changed), /unavailable member.*volume/);
  const method = structuredClone(contract);
  method.types.EchoPluginPlayer.methods.find((value) => value.name === 'seek').parameters = [
    'QString',
  ];
  await assert.rejects(checkBindings(method), /method differs/);
});

test('manifest compatibility, explicit local build sources and comparator intersections', async () => {
  assert.deepEqual((await localPackages(root)).map(({ manifest }) => manifest.id).sort(), [
    'folia-lyrics-skin',
    'spectrum-visualizer',
  ]);
  assert.equal(rangeContains('>=0.1.0 <1.0.0', '0.1.0'), true);
  assert.equal(rangeContains('>=1.0.0', '0.1.0'), false);
  assert.equal(rangeContains('^1.0.0', '1.0.0'), false);
  const manifest = JSON.parse(
    await readFile(path.join(root, 'plugins/spectrum-visualizer/manifest.json'), 'utf8'),
  );
  await validateManifest(manifest);
  manifest.requires.features.push('lyrics.resolver');
  await assert.rejects(validateManifest(manifest), /Unavailable required feature/);
  manifest.requires.features.pop();
  manifest.entry = '../entry.mjs';
  await assert.rejects(validateManifest(manifest), /contained relative path/);
});

test('echomod is a deterministic validated container and corrupted contents are rejected', async (t) => {
  const { source, output } = await author(t);
  const first = await buildPluginArchive(source, output);
  const bytes = await readFile(first.file);
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  assert.equal((await validatePackage(first.file)).format, 'echomod');
  const second = await buildPluginArchive(source, output);
  assert.deepEqual(await readFile(second.file), bytes);
  assert.equal(second.sha256, first.sha256);
  const bad = Buffer.from(bytes);
  bad[30 + bad.readUInt16LE(26)] ^= 1;
  await writeFile(first.file, bad);
  await assert.rejects(validatePackage(first.file), /checksum mismatch/);
});

test('published index points to plugin archives under artifacts and verifies their bytes', async (t) => {
  const { source, output } = await author(t);
  const repository = path.dirname(source);
  await writeFile(
    path.join(repository, 'echo-plugins.json'),
    JSON.stringify({ schemaVersion: 2, plugins: [] }),
  );
  await writeFile(
    path.join(repository, 'echo-plugin.build.json'),
    JSON.stringify({ repository: 'https://github.com/test/official', plugins: ['source'] }),
  );
  await prepareIndex(repository);
  const index = JSON.parse(await readFile(path.join(repository, 'echo-plugins.json'), 'utf8'));
  const [published] = index.plugins;
  assert.equal(published.artifact, 'artifacts/spectrum-visualizer-1.0.0.echomod');
  assert.deepEqual(
    await readFile(path.join(repository, published.artifact)),
    await readFile(path.join(output, 'spectrum-visualizer-1.0.0.echomod')),
  );
  assert.equal(
    (await validatePackage(path.join(repository, published.artifact))).id,
    'spectrum-visualizer',
  );
  const server = createServer(async (req, res) => {
    const url = new URL(decodeURIComponent(req.url.slice(1)));
    const resource = url.pathname.endsWith('manifest.json')
      ? path.join(source, 'manifest.json')
      : path.join(repository, published.artifact);
    res.end(await readFile(resource));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const fetcher = (url, options) =>
    fetch(`http://127.0.0.1:${server.address().port}/${encodeURIComponent(url)}`, options);
  assert.equal((await checkPublished(repository, { fetcher })).length, 1);
  const third = await indexEntry(path.join(repository, published.artifact), {
    repo: 'https://github.com/another/independent.git/',
    ref: 'release/v1',
    path: '',
    artifact: 'https://github.com/another/independent/releases/download/v1/plugin.echomod',
  });
  third.id = 'second-plugin';
  index.plugins.push(third);
  await writeFile(path.join(repository, 'echo-plugins.json'), JSON.stringify(index));
  await prepareIndex(repository);
  assert.deepEqual((await readIndex(repository)).original.plugins[1], third);
  const parsed = parseEntry(third);
  assert.equal(parsed.repository, 'another/independent');
  assert.match(parsed.manifestUrl, /release%2Fv1\/manifest.json$/);
  assert.equal(parsed.artifactUrl, third.artifact);
  for (const change of [
    { repo: 'http://github.com/a/b' },
    { path: '../x' },
    { artifact: 'https://user:secret@example.org/a.echomod' },
    { artifact: 'https://example.org/a.zip?x=.echomod' },
    { sha256: 'a'.repeat(63) },
    { id: 'con.txt' },
    { id: 'tail.' },
    { ref: '../escape' },
  ])
    assert.throws(() => parseEntry({ ...third, ...change }));
  await writeFile(
    path.join(repository, 'echo-plugins.json'),
    JSON.stringify({ schemaVersion: 2, plugins: [{ ...published, sha256: '0'.repeat(64) }] }),
  );
  await assert.rejects(checkPublished(repository, { fetcher }), /SHA-256/);
});

test('plugin dependency closure has deterministic order and rejects missing/version/cycle/conflict errors', () => {
  const library = { id: 'z.library', version: '1.2.0' };
  const consumer = {
    id: 'a.consumer',
    version: '1.0.0',
    dependencies: { 'z.library': '>=1.0.0 <2.0.0' },
  };
  assert.deepEqual(dependencyOrder([consumer, library]), ['z.library', 'a.consumer']);
  assert.throws(() => dependencyOrder([consumer]), /Missing plugin dependency/);
  assert.throws(
    () => dependencyOrder([consumer, { ...library, version: '2.0.0' }]),
    /version mismatch/,
  );
  assert.throws(
    () => dependencyOrder([consumer, { ...library, dependencies: { 'a.consumer': '1.0.0' } }]),
    /Cyclic/,
  );
  assert.throws(
    () => dependencyOrder([consumer, { ...library, conflicts: { 'a.consumer': '>=1.0.0' } }]),
    /Conflicting/,
  );
  assert.deepEqual(
    dependencyOrder([
      { id: 'optional', version: '1.0.0', optionalDependencies: { absent: '1.0.0' } },
    ]),
    ['optional'],
  );
});

test('build transforms typed async source into self-contained Qt ES2016 and preserves last successful output on failure', async (t) => {
  const { source, output } = await author(t);
  const built = await buildPackage(source, output);
  await validatePackage(built);
  const entry = await readFile(path.join(built, 'entry.mjs'), 'utf8');
  assert.match(entry, /echo:plugin-sdk/);
  assert.doesNotMatch(entry, /async\s+(function|\()/);
  assert.equal(
    (await readFile(path.join(built, 'LICENSE'), 'utf8')).startsWith('MIT License'),
    true,
  );
  await writeFile(
    path.join(source, 'src/entry.ts'),
    `import type { EchoPluginContext } from 'echo:plugin-sdk';
export function activate(ctx: EchoPluginContext) { ctx.player.volume = 9; }
`,
  );
  await assert.rejects(buildPackage(source, output), /read-only property/);
  assert.equal(await readFile(path.join(built, 'entry.mjs'), 'utf8'), entry);
});

test('validator rejects incompatible syntax, missing activation and native QML plugins', async (t) => {
  const { source, output } = await author(t);
  const built = await buildPackage(source, output);
  await writeFile(path.join(built, 'entry.mjs'), 'export async function activate(ctx) {}');
  await assert.rejects(validatePackage(built), /Unexpected token/);
  await writeFile(path.join(built, 'entry.mjs'), 'export function deactivate(ctx) {}');
  await assert.rejects(validatePackage(built), /export activate/);
  await writeFile(path.join(built, 'entry.mjs'), 'export function activate(ctx) {}');
  await writeFile(path.join(built, 'qmldir'), 'module Unsafe\noptional plugin NativeCode\n');
  await assert.rejects(validatePackage(built), /native QML plugins/);
});

test('package copies reject symbolic links', async (t) => {
  const { source, output } = await author(t);
  const built = await buildPackage(source, output);
  try {
    await symlink(path.join(source, 'manifest.json'), path.join(built, 'linked.json'));
  } catch (error) {
    if (error.code === 'EPERM') return t.skip('Symlink creation requires Windows privileges');
    throw error;
  }
  await assert.rejects(validatePackage(built), /symlink/);
});

test('asset directories cannot recursively include the build output', async (t) => {
  const { source } = await author(t);
  await writeFile(
    path.join(source, 'plugin.config.json'),
    JSON.stringify({ entry: 'src/entry.ts', assets: ['artifacts'] }),
  );
  await assert.rejects(
    buildPackage(source, path.join(source, 'artifacts')),
    /Assets cannot contain/,
  );
});

test('custom windows validate declaration, capability and contained component files', async (t) => {
  const { source, output } = await author(t);
  const file = path.join(source, 'manifest.json');
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  const contract = await loadContract();
  manifest.windows = [{ id: 'tools', component: 'Tools.qml', minWidth: 200, maxWidth: 600 }];
  await assert.rejects(validateManifest(manifest, contract), /windows capability/);
  manifest.capabilities.push('windows');
  await validateManifest(manifest, contract);
  manifest.windows.push({ ...manifest.windows[0] });
  await assert.rejects(validateManifest(manifest, contract), /Duplicate window/);
  manifest.windows.pop();
  manifest.windows[0].minWidth = 700;
  await assert.rejects(validateManifest(manifest, contract), /size range/);
  manifest.windows[0].minWidth = 200;
  manifest.windows[0].component = '../Escape.qml';
  await assert.rejects(validateManifest(manifest, contract), /contained relative path/);
  manifest.windows[0].component = 'Missing.qml';
  await writeFile(file, JSON.stringify(manifest));
  await assert.rejects(buildPackage(source, output), /ENOENT|Missing|missing/);
});

test('echomod archives preserve executable resources without setuid or writable mode bits', async (t) => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'echo-executable-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const source = path.join(temporary, 'source');
  await cp(path.join(root, 'plugins/spectrum-visualizer'), source, { recursive: true });
  const helper = path.join(source, 'helper');
  await writeFile(helper, '#!/bin/sh\nexit 0\n');
  await chmod(helper, 0o755);
  const archive = path.join(temporary, 'helper.echomod');
  await packPluginArchive(source, archive);
  const extracted = path.join(temporary, 'extracted');
  await unpackPluginArchive(archive, extracted);
  if (process.platform !== 'win32')
    assert.equal((await stat(path.join(extracted, 'helper'))).mode & 0o7777, 0o755);
});

test('GPU shaders compile all backends and invalid changes preserve the published package', async (t) => {
  const { source, output } = await author(t);
  const first = await buildPluginArchive(source, output);
  const original = await readFile(first.file);
  const qsb = path.join(output, 'spectrum-visualizer', 'shaders/gpu/profile.comp.qsb');
  assert.ok((await stat(qsb)).size > 100);
  await writeFile(path.join(source, 'shaders/gpu/profile.comp'), 'invalid compute shader');
  await assert.rejects(buildPluginArchive(source, output));
  assert.deepEqual(await readFile(first.file), original);
  const config = JSON.parse(await readFile(path.join(source, 'plugin.config.json'), 'utf8'));
  config.shaders = [{ source: 'shaders/gpu/spectrum.vert', output: '../escape.qsb' }];
  await writeFile(path.join(source, 'plugin.config.json'), JSON.stringify(config));
  await assert.rejects(buildPackage(source, output), /contained relative path/);
  config.shaders = [{ source: 'shaders/gpu/spectrum.vert', output: 'shaders/gpu/spectrum.vert' }];
  await writeFile(path.join(source, 'plugin.config.json'), JSON.stringify(config));
  await assert.rejects(buildPackage(source, output), /shader output/);
  config.shaders = [
    { source: 'shaders/gpu/spectrum.vert', output: 'shaders/gpu/escaped.vert.qsb' },
  ];
  await writeFile(path.join(source, 'plugin.config.json'), JSON.stringify(config));
  await writeFile(
    path.join(source, 'shaders/gpu/spectrum.vert'),
    '#version 440\n#include "../../../../outside.glsl"\nvoid main(){}',
  );
  await assert.rejects(buildPackage(source, output), /contained relative path/);
});

test('prebaked shader assets must be real portable QSB packs', async (t) => {
  const { source, output } = await author(t);
  const directory = await buildPackage(source, output);
  await writeFile(path.join(directory, 'shaders/gpu/spectrum.vert.qsb'), 'not a shader');
  await assert.rejects(validatePackage(directory));
});
