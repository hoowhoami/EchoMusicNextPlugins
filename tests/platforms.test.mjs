import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, writeFile, rm, chmod, access } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  validateManifest,
  validateHostPlatform,
  buildPluginArchive,
  validatePackage,
} from '../packages/tools/packages.mjs';
import { loadContract, checkHost } from '../packages/tools/contract.mjs';
import {
  indexEntry,
  publicationEntry,
  parsePublication,
  parseEntry,
} from '../packages/tools/index.mjs';

const platforms = ['windows', 'macos', 'linux'];
const manifest = {
  schemaVersion: 1,
  format: 'echomod',
  id: 'platform-fixture',
  name: 'Platform fixture',
  version: '1.0.0',
  kind: 'qml-js',
  entry: 'entry.mjs',
  contexts: ['main'],
  capabilities: [],
  requires: {
    hostVersion: '>=0.1.0',
    sdkVersion: '>=1.0.0',
    features: ['lifecycle', 'manifest.platforms'],
  },
};

test('platform declaration validates strictly, while authoring remains platform neutral', async () => {
  const contract = await loadContract();
  for (const allowed of [undefined, ...platforms.map((p) => [p]), platforms]) {
    const value = structuredClone(manifest);
    if (allowed) value.requires.platforms = allowed;
    await validateManifest(value);
    for (const platform of platforms) {
      if (!allowed || allowed.includes(platform))
        assert.doesNotThrow(() => validateHostPlatform(value, { ...contract, platform }));
      else
        assert.throws(
          () => validateHostPlatform(value, { ...contract, platform }),
          /host platform/,
        );
    }
  }
  for (const invalid of [
    [],
    ['windows', 'windows'],
    ['Windows'],
    ['android'],
    [1],
    'windows',
    null,
  ]) {
    const value = structuredClone(manifest);
    value.requires.platforms = invalid;
    await assert.rejects(validateManifest(value), /Invalid manifest/);
  }
  const missingFeature = structuredClone(manifest);
  missingFeature.requires.platforms = ['windows'];
  missingFeature.requires.features = ['lifecycle'];
  await assert.rejects(validateManifest(missingFeature), /Invalid manifest/);
  const misspelled = structuredClone(manifest);
  misspelled.requires.platform = ['windows'];
  await assert.rejects(validateManifest(misspelled), /Invalid manifest/);
  const oldHost = structuredClone(contract);
  oldHost.features = oldHost.features.filter((f) => f !== 'manifest.platforms');
  await assert.rejects(
    validateManifest(manifest, oldHost),
    /Unavailable required feature: manifest.platforms/,
  );
});

test('foreign platform package retains declaration through archive, hash and independent publication', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'echo-platform-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'author');
  await mkdir(source);
  const value = structuredClone(manifest);
  value.requires.platforms = ['windows'];
  await writeFile(path.join(source, 'manifest.json'), JSON.stringify(value));
  await writeFile(
    path.join(source, 'plugin.config.json'),
    JSON.stringify({ entry: 'src.mjs', assets: [] }),
  );
  await writeFile(path.join(source, 'src.mjs'), 'export function activate() {}');
  const built = await buildPluginArchive(source, path.join(root, 'dist'));
  assert.deepEqual((await validatePackage(built.file)).requires.platforms, ['windows']);
  assert.match(built.sha256, /^[a-f0-9]{64}$/);
  const publication = await publicationEntry(built.file, { artifact: 'artifacts/fixture.echomod' });
  const locator = await indexEntry(built.file, { repo: 'https://github.com/author/independent' });
  const parsed = parsePublication(publication, parseEntry(locator));
  assert.deepEqual(parsed.manifest.requires.platforms, ['windows']);
  assert.equal(publication.distribution.sha256, built.sha256);
  assert.equal(locator.repo, 'https://github.com/author/independent');
});

test(
  'test-host checks exported target platform before any smoke launch',
  { skip: process.platform === 'win32' },
  async (t) => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'echo-platform-host-'));
    t.after(() => rm(root, { recursive: true, force: true }));
    const contract = await loadContract();
    const target = contract.platform === 'windows' ? 'linux' : 'windows';
    const host = path.join(root, 'host');
    const marker = path.join(root, 'launched');
    // The target deliberately differs from the platform of the snapshot/Node.
    await writeFile(
      host,
      `#!${process.execPath}\nimport fs from 'node:fs';\nif(process.argv.includes('--export-plugin-sdk')) console.log(${JSON.stringify(JSON.stringify({ ...contract, platform: target }))}); else fs.writeFileSync(${JSON.stringify(marker)}, 'launched');\n`,
    );
    await chmod(host, 0o755);
    assert.equal((await checkHost(host)).platform, target);
    const directory = path.join(root, 'package');
    await mkdir(directory);
    const value = structuredClone(manifest);
    value.requires.platforms = platforms.filter((p) => p !== target);
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(value));
    await writeFile(path.join(directory, 'entry.mjs'), 'export function activate(){}');
    const cli = fileURLToPath(new URL('../packages/tools/cli.mjs', import.meta.url));
    await assert.rejects(
      promisify(execFile)(process.execPath, [
        cli,
        'test-host',
        directory,
        '--host',
        host,
        '--root',
        root,
      ]),
      (error) => {
        assert.match(error.stderr, /host platform is/);
        return true;
      },
    );
    await assert.rejects(access(marker));
  },
);
