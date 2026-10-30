import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { foliaPath } from './folia-source.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
const outputRelative = 'plugins/folia-lyrics-skin/qml/shared/text';
const cacheRelative = 'build/folia-text/unicode-17.0.0';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'folia-text-generator-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'scripts'), { recursive: true });
  await cp(
    path.join(repository, 'scripts/build-folia-text.mjs'),
    path.join(root, 'scripts/build-folia-text.mjs'),
  );
  await cp(
    path.join(repository, 'scripts/folia-reference.mjs'),
    path.join(root, 'scripts/folia-reference.mjs'),
  );
  await cp(path.join(repository, '.prettierrc.json'), path.join(root, '.prettierrc.json'));
  await symlink(path.join(repository, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  await cp(path.join(repository, outputRelative), path.join(root, outputRelative), {
    recursive: true,
  });
  await cp(foliaPath('dependencies/unicode-17.0.0'), path.join(root, cacheRelative), {
    recursive: true,
  });
  return {
    root,
    output: path.join(root, outputRelative),
    cache: path.join(root, cacheRelative),
    run: (args = []) =>
      spawnSync(process.execPath, [...args, 'scripts/build-folia-text.mjs', '--unicode-only'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 30000,
      }),
  };
}

for (const name of ['Scripts.txt', 'LICENSE.txt']) {
  test(`Unicode generator rejects changed cached ${name} before writing outputs`, async (t) => {
    const f = await fixture(t);
    const expected = await readFile(path.join(f.output, 'unicode-sources.json'));
    await writeFile(
      path.join(f.cache, name),
      Buffer.concat([await readFile(path.join(f.cache, name)), Buffer.from('\n# changed\n')]),
    );
    const result = f.run();
    assert.notEqual(result.status, 0, 'Untrusted cache bytes must be rejected');
    assert.match(result.stderr, /SHA-256 mismatch/);
    assert.match(result.stderr, new RegExp(name.replaceAll('.', '\\.')));
    assert.deepEqual(await readFile(path.join(f.output, 'unicode-sources.json')), expected);
  });
}

for (const valid of [false, true]) {
  test(`Unicode generator ${valid ? 'accepts pinned' : 'rejects changed'} downloaded bytes`, async (t) => {
    const f = await fixture(t);
    const file = path.join(f.cache, 'Scripts.txt');
    const original = await readFile(file);
    const expected = await readFile(path.join(f.output, 'unicode-sources.json'));
    await rm(file);
    const payload = valid ? original : Buffer.concat([original, Buffer.from('\n# changed\n')]);
    await writeFile(path.join(f.root, 'download.txt'), payload);
    await writeFile(
      path.join(f.root, 'download.mjs'),
      `import {readFile} from 'node:fs/promises';\nglobalThis.fetch=async(url)=>{if(url!=='https://www.unicode.org/Public/17.0.0/ucd/Scripts.txt')throw new Error('Unexpected download '+url);return new Response(await readFile(new URL('./download.txt',import.meta.url)));};\n`,
    );
    const result = f.run(['--import', './download.mjs']);
    if (valid) {
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(await readFile(file), original);
    } else {
      assert.notEqual(result.status, 0, 'Untrusted download bytes must be rejected');
      assert.match(result.stderr, /SHA-256 mismatch/);
      await assert.rejects(readFile(file), { code: 'ENOENT' });
    }
    assert.deepEqual(await readFile(path.join(f.output, 'unicode-sources.json')), expected);
  });
}

test('Unicode generation preserves pinned runtime, provenance and licence bytes', async (t) => {
  const f = await fixture(t);
  const names = ['unicode-data.mjs', 'unicode-sources.json', 'UNICODE-LICENSE.txt'];
  const expected = await Promise.all(names.map((name) => readFile(path.join(f.output, name))));
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  for (let i = 0; i < names.length; i++)
    assert.deepEqual(await readFile(path.join(f.output, names[i])), expected[i], names[i]);
});

for (const valid of [false, true]) {
  test(`Unicode generator ${valid ? 'restores' : 'rejects changed'} local licence snapshot without downloading`, async (t) => {
    const f = await fixture(t);
    const cached = path.join(f.cache, 'LICENSE.txt');
    const original = await readFile(cached);
    await rm(cached);
    if (!valid)
      await writeFile(
        path.join(f.output, 'UNICODE-LICENSE.txt'),
        Buffer.concat([original, Buffer.from('\n# changed\n')]),
      );
    await writeFile(
      path.join(f.root, 'offline.mjs'),
      `globalThis.fetch=async()=>{throw new Error('Licence must use the pinned local snapshot');};\n`,
    );
    const result = f.run(['--import', './offline.mjs']);
    if (valid) {
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(await readFile(cached), original);
    } else {
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /LICENSE\.txt: SHA-256 mismatch/);
      await assert.rejects(readFile(cached), { code: 'ENOENT' });
    }
  });
}
