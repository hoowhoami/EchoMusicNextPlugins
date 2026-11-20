import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { buildPackage, prepareIndex } from '../packages/tools/packages.mjs';
import {
  nativeCompileArguments,
  inspectShader,
  compileNativeBundle,
  mergeNativeBundles,
  applyNativeBundle,
} from '../packages/tools/native-shaders.mjs';

test('native compiler profiles retain stage, source language, entry and minimum macOS', () => {
  const hlsl = { source: 'hlsl', entryPoint: 'main', version: 50 };
  for (const [stage, profile] of [
    [0, 'vs_5_0'],
    [4, 'ps_5_0'],
    [5, 'cs_5_0'],
  ]) {
    const c = nativeCompileArguments('windows', { stage }, hlsl);
    assert.ok(c.args.includes(profile));
    assert.equal(c.args[c.args.indexOf('/E') + 1], 'main');
  }
  const metal = nativeCompileArguments(
    'macos',
    { stage: 0 },
    { source: 'msl', entryPoint: 'main0', version: 12 },
  );
  assert.ok(metal.args.includes('-std=macos-metal1.2'));
  assert.ok(metal.args.includes('-mmacosx-version-min=14.4'));
  assert.throws(
    () => nativeCompileArguments('windows', { stage: 4 }, { ...hlsl, version: 60 }),
    /profile/,
  );
  assert.throws(() => nativeCompileArguments('macos', { stage: 0 }, hlsl), /MSL/);
});

test('native release gates reject missing stages before altering publication metadata', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'echo-native-gate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await cp(new URL('../plugins/spectrum-visualizer/', import.meta.url), path.join(root, 'source'), {
    recursive: true,
  });
  const config = {
    repository: 'https://github.com/test/official',
    plugins: ['source'],
    nativeShaderPlugins: ['spectrum-visualizer'],
  };
  await writeFile(path.join(root, 'echo-plugin.build.json'), JSON.stringify(config));
  const index = JSON.stringify({ schemaVersion: 2, plugins: [] });
  await writeFile(path.join(root, 'echo-plugins.json'), index);
  const manifest = await readFile(path.join(root, 'source/manifest.json'));
  await assert.rejects(prepareIndex(root), /complete native shader bundle/);
  assert.deepEqual(await readFile(path.join(root, 'source/manifest.json')), manifest);
  assert.equal(await readFile(path.join(root, 'echo-plugins.json'), 'utf8'), index);
});

test(
  'real portable QSB inputs cannot be relabelled as complete native bundles',
  { skip: !process.env.ECHO_SHADER_PACK_TOOL },
  async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'echo-native-pack-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const source = path.join(root, 'source');
    await cp(new URL('../plugins/spectrum-visualizer/', import.meta.url), source, {
      recursive: true,
    });
    const built = await buildPackage(source, path.join(root, 'build'));
    const linux = path.join(root, 'linux');
    await compileNativeBundle(built, 'linux', linux);
    const index = JSON.parse(await readFile(path.join(linux, 'index.json'), 'utf8'));
    assert.ok(index.shaders.length > 0);
    const first = path.join(linux, 'files', index.shaders[0].path),
      info = await inspectShader(first);
    assert.equal(info.fingerprint, index.shaders[0].fingerprint);
    assert.ok(info.shaders.some((v) => v.source === 'spirv'));
    for (const backend of ['windows', 'macos']) {
      const destination = path.join(root, backend);
      await cp(linux, destination, { recursive: true });
      await writeFile(path.join(destination, 'index.json'), JSON.stringify({ ...index, backend }));
    }
    await assert.rejects(
      mergeNativeBundles(
        [linux, path.join(root, 'windows'), path.join(root, 'macos')],
        path.join(root, 'merged'),
      ),
      /misses.*native/,
    );
    const combined = path.join(root, 'declared-native');
    await cp(linux, combined, { recursive: true });
    await writeFile(
      path.join(combined, 'index.json'),
      JSON.stringify({ ...index, backend: 'portable-native' }),
    );
    const original = await readFile(path.join(built, index.shaders[0].path));
    await assert.rejects(applyNativeBundle(built, combined, 'spectrum-visualizer'), /incomplete/);
    assert.deepEqual(await readFile(path.join(built, index.shaders[0].path)), original);
    await writeFile(first, 'truncated qsb');
    await assert.rejects(
      mergeNativeBundles(
        [linux, path.join(root, 'windows'), path.join(root, 'macos')],
        path.join(root, 'merged'),
      ),
      /checksum/,
    );
  },
);
