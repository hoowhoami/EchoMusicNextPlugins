import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { packPluginArchive } from '../packages/tools/archives.mjs';
import { checkPublished, parseEntry, parsePublication } from '../packages/tools/index.mjs';

async function publications(t, thirdPartyCode = 'export function activate() {}') {
  const root = await mkdtemp(path.join(os.tmpdir(), 'echo-publication-scopes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceRepo = 'https://github.com/test/official';
  const entries = [
    { id: 'external-plugin', repo: 'https://github.com/another/plugins', path: 'external' },
    { id: 'implicit-official', path: 'implicit' },
    { id: 'explicit-official', repo: 'https://github.com/Test/Official.git/', path: 'explicit' },
  ];
  const responses = new Map();
  for (const entry of entries) {
    const directory = path.join(root, entry.id);
    await mkdir(directory);
    const manifest = {
      schemaVersion: 1,
      id: entry.id,
      name: entry.id,
      version: '1.0.0',
      format: 'echomod',
      kind: 'qml-js',
      entry: 'entry.mjs',
      description: 'Publication scope fixture',
      author: 'test',
      license: 'MIT',
      requires: { hostVersion: '>=0.1.7', sdkVersion: '>=1.0.0', features: ['lifecycle'] },
      capabilities: [],
      contexts: ['main'],
    };
    await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest));
    await writeFile(
      path.join(directory, 'entry.mjs'),
      entry.id === 'external-plugin' ? thirdPartyCode : 'export function activate() {}',
    );
    // Pack the container directly so rejected runtime syntax can be exercised too.
    const archive = path.join(root, entry.id + '.echomod');
    await packPluginArchive(directory, archive);
    const bytes = await readFile(archive);
    const published = {
      ...manifest,
      distribution: {
        artifact: 'artifacts/' + entry.id + '.echomod',
        sha256: createHash('sha256').update(bytes).digest('hex'),
      },
    };
    const resolved = parsePublication(published, parseEntry(entry, sourceRepo));
    responses.set(resolved.manifestUrl, JSON.stringify(published));
    responses.set(resolved.artifactUrl, bytes);
  }
  await writeFile(
    path.join(root, 'echo-plugins.json'),
    JSON.stringify({ schemaVersion: 2, plugins: entries }),
  );
  await writeFile(
    path.join(root, 'echo-plugin.build.json'),
    JSON.stringify({ repository: sourceRepo, plugins: [] }),
  );
  const requests = [];
  const fetcher = async (url) => {
    requests.push(url);
    assert.ok(responses.has(url), `Unexpected publication request: ${url}`);
    return new Response(responses.get(url));
  };
  return { root, sourceRepo, entries, responses, requests, fetcher };
}

test('official publications never fetch a third-party package with rejected runtime syntax', async (t) => {
  const fixture = await publications(t, 'export function activate() { return value?.name; }');
  const { root, requests, fetcher } = fixture;
  assert.deepEqual(
    (await checkPublished(root, { fetcher, scope: 'official' })).map((manifest) => manifest.id),
    ['implicit-official', 'explicit-official'],
  );
  assert.ok(requests.length > 0);
  assert.ok(requests.every((url) => new URL(url).pathname.startsWith('/test/official/')));
  for (const scope of ['third-party', 'all']) {
    requests.length = 0;
    await assert.rejects(
      checkPublished(root, { fetcher, scope }),
      /external-plugin: Unexpected token/,
    );
    assert.ok(requests.every((url) => url.includes('/another/plugins/')));
  }
});

test('third-party publications are independent while official checksum failures still fail', async (t) => {
  const { root, sourceRepo, entries, responses, requests, fetcher } = await publications(t);
  assert.equal((await checkPublished(root, { fetcher })).length, 3);
  const official = parseEntry(entries[1], sourceRepo);
  const published = JSON.parse(responses.get(official.manifestUrl));
  const resolved = parsePublication(published, official);
  responses.set(resolved.artifactUrl, Buffer.from('changed package'));
  requests.length = 0;
  assert.deepEqual(
    (await checkPublished(root, { fetcher, scope: 'third-party' })).map((manifest) => manifest.id),
    ['external-plugin'],
  );
  assert.ok(requests.every((url) => url.includes('/another/plugins/')));
  await assert.rejects(
    checkPublished(root, { fetcher, scope: 'official' }),
    /implicit-official:.*SHA-256 mismatch/,
  );
});

test('scoped publication checks require an unambiguous source repository and reject typos', async (t) => {
  const { root, sourceRepo, entries, requests, fetcher } = await publications(t);
  await assert.rejects(
    checkPublished(root, { fetcher, scope: 'offical' }),
    /Invalid publication scope/,
  );
  assert.equal(requests.length, 0);
  await rm(path.join(root, 'echo-plugin.build.json'));
  const explicitEntries = entries.map((entry) => ({ repo: sourceRepo, ...entry }));
  await writeFile(
    path.join(root, 'echo-plugins.json'),
    JSON.stringify({ schemaVersion: 2, plugins: explicitEntries }),
  );
  await assert.rejects(checkPublished(root, { fetcher, scope: 'official' }), /require --repo/);
  assert.equal(requests.length, 0);
  assert.equal((await checkPublished(root, { fetcher, scope: 'official', sourceRepo })).length, 2);
});
