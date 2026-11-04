import path from 'node:path';
import os from 'node:os';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';

export function repository(text) {
  const url = new URL(text);
  const parts = url.pathname.split('/').filter(Boolean);
  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    url.username ||
    url.password ||
    url.port ||
    url.href.includes('?') ||
    url.href.includes('#') ||
    parts.length !== 2
  )
    throw new Error('Expected a GitHub repository');
  parts[1] = parts[1].replace(/\.git$/i, '');
  if (parts.some((part) => !/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(part)))
    throw new Error('Invalid GitHub repository');
  return parts.join('/').toLowerCase();
}
function portable(value, empty = false) {
  if (
    typeof value !== 'string' ||
    (!value && !empty) ||
    value.length > 1024 ||
    /[\\:\x00?#%]/.test(value) ||
    (value && value.split('/').some((part) => !part || part === '.' || part === '..'))
  )
    throw new Error('Expected a portable relative index path');
  return value;
}
export function raw(repo, ref, file) {
  return `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(ref)}/${file.split('/').map(encodeURIComponent).join('/')}`;
}
export function parseEntry(entry, sourceRepo) {
  if (
    !entry ||
    typeof entry !== 'object' ||
    Array.isArray(entry) ||
    Object.entries(entry).some(
      ([key, value]) => !['id', 'repo', 'ref', 'path'].includes(key) || typeof value !== 'string',
    )
  )
    throw new Error('Invalid plugin index field');
  const id = entry.id;
  if (
    typeof id !== 'string' ||
    !/^[a-z][a-z0-9.-]{1,127}$/.test(id) ||
    id.endsWith('.') ||
    id.includes('..') ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/.test(id)
  )
    throw new Error('Invalid index plugin ID');
  const repo = repository(entry.repo ?? sourceRepo);
  const ref = entry.ref ?? 'HEAD';
  if (!/^[A-Za-z0-9_][A-Za-z0-9_./-]{0,255}$/.test(ref) || ref.includes('..') || ref.endsWith('/'))
    throw new Error('Invalid repository ref');
  const directory = portable(entry.path ?? '', true);
  return {
    ...entry,
    path: directory,
    repository: repo,
    ref,
    manifestUrl: raw(repo, ref, directory ? `${directory}/manifest.json` : 'manifest.json'),
  };
}
export function parsePublication(published, entry) {
  if (
    !published ||
    typeof published !== 'object' ||
    Array.isArray(published) ||
    published.id !== entry.id ||
    Buffer.byteLength(JSON.stringify(published)) > 256 * 1024
  )
    throw new Error('Invalid published plugin manifest or ID');
  const { distribution, ...manifest } = published;
  if (
    !distribution ||
    typeof distribution !== 'object' ||
    Array.isArray(distribution) ||
    Object.keys(distribution).length !== 2 ||
    Object.keys(distribution).some((key) => !['artifact', 'sha256'].includes(key)) ||
    typeof distribution.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(distribution.sha256) ||
    typeof distribution.artifact !== 'string'
  )
    throw new Error('Invalid plugin distribution artifact or SHA-256');
  const artifact = distribution.artifact;
  let artifactUrl;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(artifact)) {
    const url = new URL(artifact);
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.href.includes('#') ||
      !url.pathname.toLowerCase().endsWith('.echomod')
    )
      throw new Error('Expected HTTPS .echomod artifact');
    artifactUrl = url.href;
  } else {
    portable(artifact);
    if (!artifact.toLowerCase().endsWith('.echomod')) throw new Error('Expected .echomod artifact');
    artifactUrl = raw(entry.repository, entry.ref, artifact);
  }
  return { ...entry, ...distribution, manifest, artifactUrl };
}

export async function readIndex(root, sourceRepo) {
  if (!sourceRepo) {
    try {
      sourceRepo = JSON.parse(
        await readFile(path.join(root, 'echo-plugin.build.json'), 'utf8'),
      ).repository;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  const original = JSON.parse(await readFile(path.join(root, 'echo-plugins.json'), 'utf8'));
  if (
    original.schemaVersion !== 2 ||
    !Array.isArray(original.plugins) ||
    original.plugins.length > 512
  )
    throw new Error('Invalid plugin index');
  const ids = new Set();
  const plugins = original.plugins.map((value) => {
    const entry = parseEntry(value, sourceRepo);
    if (ids.has(entry.id)) throw new Error(`Duplicate index plugin ID: ${entry.id}`);
    ids.add(entry.id);
    return entry;
  });
  return { original, plugins };
}
export async function indexEntry(file, options) {
  const { validatePackage } = await import('./packages.mjs');
  const manifest = await validatePackage(file);
  const entry = {
    id: manifest.id,
    repo: `https://github.com/${repository(options.repo)}`,
    path: options.path ?? '',
  };
  if (options.ref && options.ref !== 'HEAD') entry.ref = options.ref;
  parseEntry(entry);
  return entry;
}
export async function publicationEntry(file, options) {
  const { validatePackage } = await import('./packages.mjs');
  const manifest = await validatePackage(file);
  const publication = {
    ...manifest,
    distribution: {
      artifact: options.artifact,
      sha256: createHash('sha256')
        .update(await readFile(file))
        .digest('hex'),
    },
  };
  parsePublication(publication, { id: manifest.id, repository: 'author/repository', ref: 'HEAD' });
  return publication;
}
async function download(url, limit, fetcher) {
  for (let redirects = 0; redirects <= 8; redirects++) {
    const target = new URL(url);
    if (target.protocol !== 'https:' || target.username || target.password || target.hash)
      throw new Error('Unsafe publication URL');
    const response = await fetcher(url, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw new Error('Missing publication redirect');
      url = new URL(location, url).href;
      continue;
    }
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new Error(`Published resource HTTP ${response.status}`);
    }
    const chunks = [];
    let size = 0;
    try {
      for await (const chunk of response.body) {
        size += chunk.byteLength;
        if (size > limit) throw new Error('Published resource exceeds byte limit');
        chunks.push(Buffer.from(chunk));
      }
    } catch (error) {
      throw error;
    }
    return Buffer.concat(chunks);
  }
  throw new Error('Too many publication redirects');
}
export async function checkPublished(root, { sourceRepo, fetcher = fetch } = {}) {
  const index = await readIndex(root, sourceRepo);
  const { validateManifest, validatePackage } = await import('./packages.mjs');
  const directory = await mkdtemp(path.join(os.tmpdir(), 'echo-published-'));
  try {
    const manifests = [];
    for (const entry of index.plugins) {
      const resolved = parsePublication(
        JSON.parse((await download(entry.manifestUrl, 256 * 1024, fetcher)).toString('utf8')),
        entry,
      );
      const manifest = await validateManifest(resolved.manifest);
      const bytes = await download(resolved.artifactUrl, 128 * 1024 * 1024, fetcher);
      if (createHash('sha256').update(bytes).digest('hex') !== resolved.sha256)
        throw new Error(`Published SHA-256 mismatch: ${entry.id}`);
      const file = path.join(directory, `${entry.id}.echomod`);
      await writeFile(file, bytes);
      const packaged = await validatePackage(file);
      // Compare JSON values without depending on property serialization order.
      const canonical = (value) =>
        JSON.stringify(value, (_, v) =>
          v && typeof v === 'object' && !Array.isArray(v)
            ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
            : v,
        );
      if (canonical(packaged) !== canonical(manifest))
        throw new Error(`Published manifest differs from package: ${entry.id}`);
      manifests.push(manifest);
    }
    return manifests;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
