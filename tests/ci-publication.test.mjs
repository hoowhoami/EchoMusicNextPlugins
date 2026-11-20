import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, cp, readFile, writeFile, rm, access } from 'node:fs/promises';
import { prepareIndex } from '../packages/tools/packages.mjs';
import { publicationEntry } from '../packages/tools/index.mjs';
import { publishPackages } from '../scripts/publish-plugin-packages.mjs';

const execute = promisify(execFile);
async function fixture(t) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'echo-ci-publication-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const root = path.join(temporary, 'author');
  const remote = path.join(temporary, 'remote.git');
  await mkdir(root);
  await cp(new URL('../plugins/spectrum-visualizer/', import.meta.url), path.join(root, 'source'), {
    recursive: true,
  });
  const sourceFile = path.join(root, 'source/manifest.json');
  const manifest = JSON.parse(await readFile(sourceFile, 'utf8'));
  await writeFile(sourceFile, JSON.stringify({ ...manifest, version: '1.0.0' }));
  await writeFile(path.join(root, '.gitignore'), 'dist/\nbuild/\n');
  const config = { repository: 'https://github.com/test/official', plugins: ['source'] };
  await writeFile(path.join(root, 'echo-plugin.build.json'), JSON.stringify(config));
  await writeFile(
    path.join(root, 'echo-plugins.json'),
    JSON.stringify({ schemaVersion: 2, plugins: [] }),
  );
  await prepareIndex(root);
  const index = JSON.parse(await readFile(path.join(root, 'echo-plugins.json'), 'utf8'));
  index.plugins.push({ id: 'independent-plugin', repo: 'https://github.com/another/plugin' });
  await writeFile(path.join(root, 'echo-plugins.json'), JSON.stringify(index));
  const git = async (...args) => (await execute('git', args, { cwd: root })).stdout.trim();
  await git('init', '--initial-branch=main');
  await git('config', 'user.name', 'Test');
  await git('config', 'user.email', 'test@example.invalid');
  await git('add', '.');
  await git('commit', '-m', 'initial publication');
  await git('init', '--bare', remote);
  await git('remote', 'add', 'origin', remote);
  await git('push', 'origin', 'main');
  const head = await git('rev-parse', 'HEAD');
  return { root, remote, git, head, sourceFile };
}

test('CI publication pushes matching versioned archive and manifest together and is idempotent', async (t) => {
  const { root, remote, git, head, sourceFile } = await fixture(t);
  const originalIndex = await readFile(path.join(root, 'echo-plugins.json'));
  const oldArchive = await readFile(path.join(root, 'artifacts/spectrum-visualizer-1.0.0.echomod'));
  const result = await publishPackages(root, {
    versions: { 'spectrum-visualizer': '1.0.1' },
    expectedCommit: head,
  });
  assert.equal(result.changed, true);
  assert.equal(await git('status', '--porcelain'), '');
  const pushed = async (file) =>
    (
      await execute('git', ['--git-dir', remote, 'show', `main:${file}`], {
        encoding: 'buffer',
        maxBuffer: 4 * 1024 * 1024,
      })
    ).stdout;
  const authored = JSON.parse((await pushed('source/manifest.json')).toString());
  const artifact = 'artifacts/spectrum-visualizer-1.0.1.echomod';
  assert.equal(authored.version, '1.0.1');
  assert.deepEqual(await pushed(artifact), await readFile(path.join(root, artifact)));
  assert.deepEqual(await publicationEntry(path.join(root, artifact), { artifact }), authored);
  assert.deepEqual(await pushed('artifacts/spectrum-visualizer-1.0.0.echomod'), oldArchive);
  assert.deepEqual(await pushed('echo-plugins.json'), originalIndex);
  assert.deepEqual(await readFile(sourceFile), await pushed('source/manifest.json'));
  const changed = (
    await git('diff-tree', '--no-commit-id', '--name-only', '-r', result.commit)
  ).split('\n');
  assert.deepEqual(changed.sort(), [artifact, 'source/manifest.json'].sort());
  assert.equal(
    (
      await publishPackages(root, {
        versions: { 'spectrum-visualizer': '1.0.1' },
        expectedCommit: result.commit,
      })
    ).changed,
    false,
  );
});

test('CI publication rejects a stale build before changing package files', async (t) => {
  const { root, remote, head, sourceFile } = await fixture(t);
  const original = await readFile(sourceFile);
  const { stdout } = await execute(
    'git',
    ['--git-dir', remote, 'commit-tree', `${head}^{tree}`, '-p', head, '-m', 'newer source'],
    {
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.invalid',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.invalid',
      },
    },
  );
  await execute('git', ['--git-dir', remote, 'update-ref', 'refs/heads/main', stdout.trim()]);
  await assert.rejects(
    publishPackages(root, {
      versions: { 'spectrum-visualizer': '1.0.1' },
      expectedCommit: head,
    }),
    /main advanced/,
  );
  assert.deepEqual(await readFile(sourceFile), original);
  await assert.rejects(access(path.join(root, 'artifacts/spectrum-visualizer-1.0.1.echomod')));
});

test('CI publication rejects same-version changes and mismatched prior publications', async (t) => {
  const { root, git, sourceFile } = await fixture(t);
  const entry = path.join(root, 'source/src/entry.ts');
  await writeFile(entry, `${await readFile(entry, 'utf8')}\nconsole.log('changed payload');\n`);
  await git('add', '.');
  await git('commit', '-m', 'change source without a version bump');
  await git('push', 'origin', 'main');
  const head = await git('rev-parse', 'HEAD');
  const original = await readFile(sourceFile);
  const archive = path.join(root, 'artifacts/spectrum-visualizer-1.0.0.echomod');
  const bytes = await readFile(archive);
  await assert.rejects(
    publishPackages(root, {
      versions: { 'spectrum-visualizer': '1.0.0' },
      expectedCommit: head,
    }),
    /choose a new version/,
  );
  assert.deepEqual(await readFile(sourceFile), original);
  assert.deepEqual(await readFile(archive), bytes);
  assert.equal(await git('status', '--porcelain'), '');
  await writeFile(
    sourceFile,
    JSON.stringify({ ...JSON.parse(original), description: 'not in archive' }),
  );
  await git('add', '.');
  await git('commit', '-m', 'broken publication metadata');
  await git('push', 'origin', 'main');
  await assert.rejects(
    publishPackages(root, {
      versions: { 'spectrum-visualizer': '1.0.1' },
      expectedCommit: await git('rev-parse', 'HEAD'),
    }),
    /Existing package and author manifest differ/,
  );
});

test('CI publication rejects unknown targets, downgrades and missing native bundles', async (t) => {
  const { root, git, head, sourceFile } = await fixture(t);
  const original = await readFile(sourceFile);
  await assert.rejects(
    publishPackages(root, {
      versions: { 'independent-plugin': '1.0.1' },
      expectedCommit: head,
    }),
    /Not a local official plugin/,
  );
  await assert.rejects(
    publishPackages(root, {
      versions: { 'spectrum-visualizer': '0.9.0' },
      expectedCommit: head,
    }),
    /cannot downgrade/,
  );
  const file = path.join(root, 'echo-plugin.build.json');
  const config = JSON.parse(await readFile(file, 'utf8'));
  config.nativeShaderPlugins = ['spectrum-visualizer'];
  await writeFile(file, JSON.stringify(config));
  await git('add', '.');
  await git('commit', '-m', 'require native bytecode');
  await git('push', 'origin', 'main');
  const previous = process.env.ECHO_NATIVE_SHADER_PACKS;
  try {
    delete process.env.ECHO_NATIVE_SHADER_PACKS;
    await assert.rejects(
      publishPackages(root, {
        versions: { 'spectrum-visualizer': '1.0.1' },
        expectedCommit: await git('rev-parse', 'HEAD'),
      }),
      /requires the complete native shader bundle/,
    );
  } finally {
    if (previous === undefined) delete process.env.ECHO_NATIVE_SHADER_PACKS;
    else process.env.ECHO_NATIVE_SHADER_PACKS = previous;
  }
  assert.deepEqual(await readFile(sourceFile), original);
  assert.equal(await git('status', '--porcelain'), '');
});
