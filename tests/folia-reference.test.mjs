import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, writeFile, rm, symlink, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  resolveFoliaReference,
  readPinnedFoliaSource,
  normalizeFoliaBundle,
} from '../scripts/folia-reference.mjs';

const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const bytes = Buffer.from('export const source = 1;\r\n');
async function fileSymlink(t, target, destination) {
  try {
    await symlink(target, destination);
    return true;
  } catch (error) {
    if (process.platform === 'win32' && ['EPERM', 'EACCES'].includes(error.code)) {
      t.skip('Windows file symlink permission is unavailable: ' + error.code);
      return false;
    }
    throw error;
  }
}
async function snapshot(t, change = () => {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'folia reference '));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'src'));
  await writeFile(path.join(root, 'src/example.ts'), bytes);
  const manifest = {
    schemaVersion: 1,
    upstream: { repository: 'https://github.com/chthollyphile/folia-major.git', commit: revision },
    files: [
      {
        path: 'src/example.ts',
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    ],
  };
  change(manifest);
  await writeFile(path.join(root, 'SOURCE.json'), JSON.stringify(manifest));
  return root;
}

test('relocated source snapshot without Git preserves pinned raw source bytes', async (t) => {
  const root = await snapshot(t);
  assert.equal(await resolveFoliaReference(root), await realpath(root));
  assert.deepEqual(await readPinnedFoliaSource(root, 'src/example.ts'), bytes);
});

test('source corruption is rejected on every invocation', async (t) => {
  const root = await snapshot(t);
  await resolveFoliaReference(root);
  await writeFile(path.join(root, 'src/example.ts'), bytes.toString().replaceAll('\r\n', '\n'));
  await assert.rejects(resolveFoliaReference(root), /SHA-256|byte length/);
});

test('snapshot from another upstream revision is rejected', async (t) => {
  const root = await snapshot(t, (manifest) => (manifest.upstream.commit = '0'.repeat(40)));
  await assert.rejects(resolveFoliaReference(root), /revision/);
});

test('snapshot cannot reference an unlisted input or traverse its root', async (t) => {
  const root = await snapshot(t);
  await assert.rejects(readPinnedFoliaSource(root, 'src/unlisted.ts'), /not recorded/);
  const bad = await snapshot(t, (manifest) => (manifest.files[0].path = '../outside.ts'));
  await assert.rejects(resolveFoliaReference(bad), /relative path/);
});

test('snapshot rejects source symlinks escaping the verified directory', async (t) => {
  const root = await snapshot(t);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'folia outside '));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, 'example.ts'), bytes);
  await rm(path.join(root, 'src/example.ts'));
  if (!(await fileSymlink(t, path.join(outside, 'example.ts'), path.join(root, 'src/example.ts'))))
    return;
  await assert.rejects(resolveFoliaReference(root), /escapes/);
});

test('duplicate source records and empty snapshots are rejected', async (t) => {
  const duplicate = await snapshot(t, (manifest) => manifest.files.push(manifest.files[0]));
  await assert.rejects(resolveFoliaReference(duplicate), /duplicate/);
  const empty = await snapshot(t, (manifest) => (manifest.files = []));
  await assert.rejects(resolveFoliaReference(empty), /empty/);
});

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
async function dependencySnapshot(t) {
  const root = await snapshot(t);
  const manifest = JSON.parse(
    await (await import('node:fs/promises')).readFile(path.join(root, 'SOURCE.json')),
  );
  const pkg = { name: 'fixture-input', version: '1.0.0', license: 'MIT' };
  const locked = {
    version: pkg.version,
    resolved: 'https://registry.npmjs.org/fixture-input/-/fixture-input-1.0.0.tgz',
    integrity: 'sha512-Zml4dHVyZQ==',
  };
  const rootPackage = {
    name: 'folia-reference-inputs',
    version: '1.0.0',
    dependencies: { 'fixture-input': pkg.version },
  };
  const lock = {
    name: rootPackage.name,
    version: rootPackage.version,
    lockfileVersion: 3,
    packages: { '': rootPackage, 'node_modules/fixture-input': locked },
  };
  manifest.packages = [
    { path: 'node_modules/fixture-input', name: pkg.name, ...locked, license: pkg.license },
  ];
  manifest.dependencyInputs = {};
  for (const [name, value] of Object.entries({
    'package.json': rootPackage,
    'package-lock.json': lock,
    'metadata/upstream-package-lock.json': lock,
  })) {
    const data = Buffer.from(JSON.stringify(value));
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), data);
    manifest.files.push({ path: name, bytes: data.length, sha256: sha256(data) });
  }
  for (const [name, data] of Object.entries({
    'package.json': Buffer.from(JSON.stringify(pkg)),
    'index.js': Buffer.from('export const dependency = 1;\n'),
  })) {
    const relative = 'node_modules/fixture-input/' + name;
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await writeFile(path.join(root, relative), data);
    manifest.dependencyInputs[relative] = sha256(data);
  }
  await writeFile(path.join(root, 'SOURCE.json'), JSON.stringify(manifest));
  return root;
}

test('snapshot verifies locked npm inputs and rejects mutation after success', async (t) => {
  const root = await dependencySnapshot(t);
  assert.equal(await resolveFoliaReference(root), await realpath(root));
  await writeFile(
    path.join(root, 'node_modules/fixture-input/index.js'),
    'export const dependency = 2;\n',
  );
  await assert.rejects(resolveFoliaReference(root), /SHA-256/);
});

test('snapshot rejects unrecorded source and npm inputs', async (t) => {
  const source = await snapshot(t);
  await writeFile(path.join(source, 'src/unlisted.ts'), 'export const hidden = true;');
  await assert.rejects(resolveFoliaReference(source), /not recorded/);
  const dependency = await dependencySnapshot(t);
  await writeFile(
    path.join(dependency, 'node_modules/fixture-input/unlisted.js'),
    'export const hidden = true;',
  );
  await assert.rejects(resolveFoliaReference(dependency), /not recorded/);
});

test('snapshot validates npm package identity independently of file digests', async (t) => {
  const root = await dependencySnapshot(t);
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(path.join(root, 'SOURCE.json')));
  const relative = 'node_modules/fixture-input/package.json';
  const data = Buffer.from(
    JSON.stringify({ name: 'fixture-input', version: '2.0.0', license: 'MIT' }),
  );
  await writeFile(path.join(root, relative), data);
  manifest.dependencyInputs[relative] = sha256(data);
  await writeFile(path.join(root, 'SOURCE.json'), JSON.stringify(manifest));
  await assert.rejects(resolveFoliaReference(root), /package|version/i);
});

test('snapshot rejects npm lock identity not inherited from pinned upstream', async (t) => {
  const root = await dependencySnapshot(t);
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(path.join(root, 'SOURCE.json')));
  const relative = 'package-lock.json';
  const lock = JSON.parse(await readFile(path.join(root, relative)));
  lock.packages['node_modules/fixture-input'].integrity = 'sha512-dGFtcGVy';
  const data = Buffer.from(JSON.stringify(lock));
  await writeFile(path.join(root, relative), data);
  Object.assign(
    manifest.files.find((file) => file.path === relative),
    { bytes: data.length, sha256: sha256(data) },
  );
  await writeFile(path.join(root, 'SOURCE.json'), JSON.stringify(manifest));
  await assert.rejects(resolveFoliaReference(root), /lock|integrity/i);
});

test('snapshot rejects dependency traversal and missing package declarations', async (t) => {
  const root = await dependencySnapshot(t);
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(path.join(root, 'SOURCE.json')));
  manifest.dependencyInputs['node_modules/../outside.js'] = '0'.repeat(64);
  await writeFile(path.join(root, 'SOURCE.json'), JSON.stringify(manifest));
  await assert.rejects(resolveFoliaReference(root), /relative path/);
  delete manifest.dependencyInputs['node_modules/../outside.js'];
  manifest.packages = [];
  await writeFile(path.join(root, 'SOURCE.json'), JSON.stringify(manifest));
  await assert.rejects(resolveFoliaReference(root), /package|lock/i);
});

test('snapshot rejects Windows drive paths and case-colliding source names', async (t) => {
  const drive = await snapshot(t, (manifest) => (manifest.files[0].path = 'C:/outside.ts'));
  await assert.rejects(resolveFoliaReference(drive), /relative path/);
  const duplicate = await snapshot(t, (manifest) =>
    manifest.files.push({ ...manifest.files[0], path: 'src/EXAMPLE.ts' }),
  );
  await assert.rejects(resolveFoliaReference(duplicate), /duplicate/);
});

test('bundle source annotations retain the stable origin label after relocation', () => {
  const reference = path.join(process.cwd(), 'a source with spaces');
  const input =
    "  // a source with spaces/src/input.ts\nconst text = '// a source with spaces/src/input.ts';\n// unrelated/input.ts\n";
  assert.equal(
    normalizeFoliaBundle(input, reference),
    "  // ../folia-major/src/input.ts\nconst text = '// a source with spaces/src/input.ts';\n// unrelated/input.ts\n",
  );
});

test('snapshot rejects an unrecorded compiler configuration', async (t) => {
  const root = await snapshot(t);
  await writeFile(path.join(root, 'tsconfig.json'), '{"compilerOptions":{"target":"ESNext"}}');
  await assert.rejects(resolveFoliaReference(root), /not recorded/);
});

test('snapshot rejects npm input symlinks outside its canonical root', async (t) => {
  const root = await dependencySnapshot(t);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'folia outside package '));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await writeFile(path.join(outside, 'index.js'), 'export const dependency = 1;\n');
  await rm(path.join(root, 'node_modules/fixture-input/index.js'));
  if (
    !(await fileSymlink(
      t,
      path.join(outside, 'index.js'),
      path.join(root, 'node_modules/fixture-input/index.js'),
    ))
  )
    return;
  await assert.rejects(resolveFoliaReference(root), /escapes/);
});

test('snapshot cannot bypass npm declarations by listing package code as plain source', async (t) => {
  const root = await snapshot(t, (manifest) =>
    manifest.files.push({
      path: 'node_modules/fixture-input/index.js',
      bytes: bytes.length,
      sha256: sha256(bytes),
    }),
  );
  await assert.rejects(resolveFoliaReference(root), /dependency declarations/);
});
