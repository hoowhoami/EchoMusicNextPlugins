#!/usr/bin/env node
// CI publishes only explicitly selected local plugins, as one Git commit.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import {
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rm,
  copyFile,
  access,
  realpath,
} from 'node:fs/promises';
import * as prettier from 'prettier';
import {
  localPackages,
  buildPluginArchive,
  validateManifest,
} from '../packages/tools/packages.mjs';
import { publicationEntry, readIndex } from '../packages/tools/index.mjs';
import { readJson, rangeContains } from '../packages/tools/contract.mjs';

const execute = promisify(execFile);
const digest = (data) => createHash('sha256').update(data).digest('hex');
async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function publishPackages(root, { versions, expectedCommit }) {
  root = await realpath(root);
  if (!/^[a-f0-9]{40}$/.test(expectedCommit ?? ''))
    throw Error('Publication requires the tested source commit');
  if (
    !versions ||
    typeof versions !== 'object' ||
    Array.isArray(versions) ||
    Object.keys(versions).length === 0 ||
    Object.keys(versions).length > 128
  )
    throw Error('Publication requires an explicit plugin/version map');
  const git = async (...args) =>
    (
      await execute('git', args, {
        cwd: root,
        timeout: 120000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      })
    ).stdout.trim();
  if ((await git('rev-parse', 'HEAD')) !== expectedCommit)
    throw Error('Publication checkout differs from the tested commit');
  if (await git('status', '--porcelain')) throw Error('Publication requires a clean checkout');
  const checkRemote = async () => {
    await git('fetch', '--no-tags', 'origin', 'main');
    if ((await git('rev-parse', 'FETCH_HEAD')) !== expectedCommit)
      throw Error('main advanced after this build; run the workflow on the latest commit');
  };
  await checkRemote();
  const config = await readJson(path.join(root, 'echo-plugin.build.json'));
  const sources = await localPackages(root);
  const index = await readIndex(root, config.repository);
  const selected = [];
  for (const [id, version] of Object.entries(versions)) {
    const source = sources.find((value) => value.manifest.id === id);
    if (!source) throw Error(`Not a local official plugin: ${id}`);
    await validateManifest({ ...source.manifest, version });
    if (!rangeContains(`>=${source.manifest.version}`, version))
      throw Error(`Publication cannot downgrade ${id}`);
    const locator = index.plugins.find((value) => value.id === id);
    if (
      !locator ||
      locator.repository !== index.sourceRepository ||
      path.resolve(root, locator.path) !== source.source
    )
      throw Error(`Official index locator differs from source: ${id}`);
    const manifestFile = path.join(source.source, 'manifest.json');
    const authored = await readJson(manifestFile);
    if (authored.distribution) {
      const artifact = authored.distribution.artifact;
      if (artifact !== `artifacts/${id}-${authored.version}.echomod`)
        throw Error(`Previous publication must use its versioned Git artifact: ${id}`);
      const previous = await publicationEntry(path.join(root, artifact), { artifact });
      if (!isDeepStrictEqual(previous, authored))
        throw Error(`Existing package and author manifest differ: ${id}`);
    }
    if ((config.nativeShaderPlugins ?? []).includes(id)) {
      if (
        !process.env.ECHO_NATIVE_SHADER_PACKS ||
        !(await exists(path.resolve(process.env.ECHO_NATIVE_SHADER_PACKS, id, 'index.json')))
      )
        throw Error(`Publication requires the complete native shader bundle for ${id}`);
    }
    selected.push({ ...source, version, manifestFile });
  }
  const output = path.join(root, 'build/plugin-publication');
  await mkdir(output, { recursive: true });
  const temporary = await mkdtemp(path.join(output, 'candidate-'));
  const prepared = [];
  try {
    for (const source of selected) {
      const built = await buildPluginArchive(source.source, temporary, { version: source.version });
      const artifact = `artifacts/${source.manifest.id}-${source.version}.echomod`;
      const target = path.join(root, artifact);
      const publication = await publicationEntry(built.file, { artifact });
      // Published versioned files are immutable; identical reruns are a no-op.
      if ((await exists(target)) && digest(await readFile(target)) !== built.sha256)
        throw Error(`Published package ${artifact} differs; choose a new version`);
      const body = await prettier.format(JSON.stringify(publication), {
        ...(await prettier.resolveConfig(source.manifestFile)),
        parser: 'json',
      });
      prepared.push({
        source: built.file,
        target,
        artifact,
        manifestFile: source.manifestFile,
        body,
      });
    }
    // Do not write author metadata or artifacts until every candidate is validated.
    await checkRemote();
    const paths = [];
    for (const item of prepared) {
      await mkdir(path.dirname(item.target), { recursive: true });
      await copyFile(item.source, item.target);
      await writeFile(item.manifestFile, item.body);
      paths.push(item.artifact, path.relative(root, item.manifestFile));
    }
    await git('add', '--', ...paths);
    if (!(await git('diff', '--cached', '--name-only')))
      return {
        changed: false,
        commit: expectedCommit,
        plugins: Object.keys(versions),
        artifacts: prepared.map((item) => item.artifact),
      };
    await git(
      '-c',
      'user.name=github-actions[bot]',
      '-c',
      'user.email=41898282+github-actions[bot]@users.noreply.github.com',
      'commit',
      '-m',
      'chore(plugins): publish verified plugin packages',
    );
    // Never force-push or merge a stale build over newer source changes.
    await git('push', 'origin', 'HEAD:refs/heads/main');
    const commit = await git('rev-parse', 'HEAD');
    await checkPublishedFiles(root, prepared);
    return {
      changed: true,
      commit,
      plugins: Object.keys(versions),
      artifacts: prepared.map((item) => item.artifact),
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function checkPublishedFiles(root, prepared) {
  // Read the exact pushed commit, independent of raw-URL/CDN propagation delays.
  const { stdout } = await execute('git', ['rev-parse', 'HEAD'], { cwd: root });
  const commit = stdout.trim();
  const { stdout: remote } = await execute('git', ['ls-remote', 'origin', 'refs/heads/main'], {
    cwd: root,
  });
  if (remote.trim().split(/\s/)[0] !== commit)
    throw Error('Published commit did not become the remote main');
  for (const item of prepared) {
    const publication = await publicationEntry(item.target, { artifact: item.artifact });
    if (!isDeepStrictEqual(publication, await readJson(item.manifestFile)))
      throw Error(`Post-publication manifest verification failed: ${item.artifact}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  if (
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
  )
    throw Error('CI publication runs only from a manual main workflow');
  const result = await publishPackages(process.cwd(), {
    versions: JSON.parse(process.env.PLUGIN_RELEASE_VERSIONS ?? '{}'),
    expectedCommit: process.env.GITHUB_SHA,
  });
  await mkdir('build/published-plugins', { recursive: true });
  for (const artifact of result.artifacts)
    await copyFile(artifact, path.join('build/published-plugins', path.basename(artifact)));
  console.info(JSON.stringify(result));
  if (process.env.GITHUB_STEP_SUMMARY)
    await writeFile(
      process.env.GITHUB_STEP_SUMMARY,
      `Published plugins: ${result.plugins.join(', ')}\n\nCommit: ${result.commit}\n`,
      { flag: 'a' },
    );
}
