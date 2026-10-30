// Build-time only: accept the pinned checkout or a byte-verified source snapshot.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, realpath, stat, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const foliaRevision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
export const foliaRepository = 'https://github.com/chthollyphile/folia-major.git';
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

function relativePath(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.includes('\\') ||
    value.includes('\0') ||
    /^[a-z]:/i.test(value) ||
    path.posix.isAbsolute(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('Invalid Folia source relative path: ' + value);
  return value;
}

async function readManifest(root) {
  let text;
  try {
    text = await readFile(path.join(root, 'SOURCE.json'), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
  const manifest = JSON.parse(text);
  if (
    manifest.schemaVersion !== 1 ||
    manifest.upstream?.commit !== foliaRevision ||
    manifest.upstream?.repository !== foliaRepository
  )
    throw new Error('Folia snapshot revision or repository mismatch');
  if (!Array.isArray(manifest.files) || manifest.files.length === 0)
    throw new Error('Folia source snapshot is empty');
  const names = new Set();
  for (const file of manifest.files) {
    relativePath(file.path);
    if (file.path.toLowerCase().startsWith('node_modules/'))
      throw new Error('Folia npm files require dependency declarations: ' + file.path);
    if (names.has(file.path.toLowerCase()))
      throw new Error('Folia snapshot duplicate source: ' + file.path);
    names.add(file.path.toLowerCase());
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || !/^[0-9a-f]{64}$/.test(file.sha256))
      throw new Error('Invalid Folia source digest: ' + file.path);
  }
  if (
    manifest.dependencyInputs !== undefined &&
    (!manifest.dependencyInputs ||
      typeof manifest.dependencyInputs !== 'object' ||
      Array.isArray(manifest.dependencyInputs))
  )
    throw new Error('Invalid Folia dependency inputs');
  for (const [name, hash] of Object.entries(manifest.dependencyInputs || {})) {
    relativePath(name);
    if (names.has(name.toLowerCase())) throw new Error('Folia snapshot duplicate input: ' + name);
    names.add(name.toLowerCase());
    if (!name.startsWith('node_modules/') || !/^[0-9a-f]{64}$/.test(hash))
      throw new Error('Invalid Folia dependency digest: ' + name);
  }
  return manifest;
}

async function verifiedBytes(root, record) {
  const canonicalRoot = await realpath(root);
  const file = await realpath(path.join(root, record.path));
  const relative = path.relative(canonicalRoot, file);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative))
    throw new Error('Folia source escapes snapshot root: ' + record.path);
  if (!(await stat(file)).isFile()) throw new Error('Folia source is not a file: ' + record.path);
  const bytes = await readFile(file);
  if (record.bytes !== undefined && bytes.length !== record.bytes)
    throw new Error('Folia source byte length mismatch: ' + record.path);
  if (digest(bytes) !== record.sha256)
    throw new Error('Folia source SHA-256 mismatch: ' + record.path);
  return bytes;
}

async function verifyInventory(root, expected) {
  async function visit(directory, relative = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const name = relative ? relative + '/' + entry.name : entry.name;
      // npm creates these installer bookkeeping files. Generators never read
      // them or execute tools from this reference's .bin directory.
      if (
        name === 'SOURCE.json' ||
        name === 'node_modules/.bin' ||
        name === 'node_modules/.package-lock.json'
      )
        continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute, name);
      else if (!expected.has(name))
        throw new Error('Folia input is not recorded in SOURCE.json: ' + name);
      else if (entry.isSymbolicLink() && !(await stat(absolute)).isFile())
        throw new Error('Folia input directory symlink is not allowed: ' + name);
    }
  }
  await visit(root);
}

async function verifyDependencies(root, manifest) {
  const inputs = manifest.dependencyInputs || {};
  const packages = manifest.packages || [];
  if (!Array.isArray(packages)) throw new Error('Invalid Folia package declarations');
  if (!packages.length && !Object.keys(inputs).length) return;
  const declarations = new Map();
  for (const pkg of packages) {
    relativePath(pkg.path);
    if (
      typeof pkg.name !== 'string' ||
      !/^(?:@[\w.-]+\/)?[\w.-]+$/.test(pkg.name) ||
      !(
        pkg.path === 'node_modules/' + pkg.name || pkg.path.endsWith('/node_modules/' + pkg.name)
      ) ||
      declarations.has(pkg.path)
    )
      throw new Error('Invalid or duplicate Folia package declaration: ' + pkg.path);
    declarations.set(pkg.path, pkg);
    if (!Object.hasOwn(inputs, pkg.path + '/package.json'))
      throw new Error('Folia package metadata is not recorded: ' + pkg.path);
  }
  for (const [name, sha256] of Object.entries(inputs)) {
    if (![...declarations.keys()].some((directory) => name.startsWith(directory + '/')))
      throw new Error('Folia dependency has no package declaration: ' + name);
    await verifiedBytes(root, { path: name, sha256 });
  }
  for (const name of ['package.json', 'package-lock.json', 'metadata/upstream-package-lock.json'])
    if (!manifest.files.some((file) => file.path === name))
      throw new Error('Folia package lock input is not recorded: ' + name);
  const readJson = async (name) => JSON.parse(await readFile(path.join(root, name), 'utf8'));
  const [pkg, lock, upstream] = await Promise.all([
    readJson('package.json'),
    readJson('package-lock.json'),
    readJson('metadata/upstream-package-lock.json'),
  ]);
  if (
    lock.lockfileVersion !== 3 ||
    lock.name !== pkg.name ||
    lock.version !== pkg.version ||
    JSON.stringify(Object.entries(lock.packages?.['']?.dependencies || {}).sort()) !==
      JSON.stringify(Object.entries(pkg.dependencies || {}).sort())
  )
    throw new Error('Folia package and lock root mismatch');
  const lockedPaths = Object.keys(lock.packages || {}).filter(Boolean);
  if (
    lockedPaths.length !== declarations.size ||
    lockedPaths.some((name) => !declarations.has(name))
  )
    throw new Error('Folia package declarations do not match the minimal lock');
  for (const [name, record] of declarations) {
    const locked = lock.packages[name],
      original = upstream.packages?.[name];
    for (const field of ['version', 'resolved', 'integrity'])
      if (!record[field] || locked[field] !== record[field] || original?.[field] !== record[field])
        throw new Error('Folia package lock ' + field + ' mismatch: ' + name);
    const installed = await readJson(name + '/package.json');
    if (installed.name !== record.name || installed.version !== record.version)
      throw new Error('Folia installed package name/version mismatch: ' + name);
  }
}

function git(root, args) {
  return execFileSync('git', args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
}

export async function resolveFoliaReference(candidate) {
  let selected = candidate || process.env.FOLIA_REFERENCE;
  if (!selected) {
    const bundled = path.join(repositoryRoot, 'source/folia-reference');
    selected = (await readManifest(bundled))
      ? bundled
      : path.join(repositoryRoot, '../folia-major');
  }
  const root = await realpath(path.resolve(selected));
  const manifest = await readManifest(root);
  if (manifest) {
    // Recheck each invocation; a cached success must not accept later mutations.
    for (const record of manifest.files) await verifiedBytes(root, record);
    await verifyDependencies(root, manifest);
    await verifyInventory(
      root,
      new Set([
        ...manifest.files.map((file) => file.path),
        ...Object.keys(manifest.dependencyInputs || {}),
      ]),
    );
  } else {
    const actual = git(root, ['rev-parse', 'HEAD']).toString('utf8').trim();
    const gitRoot = git(root, ['rev-parse', '--show-toplevel']).toString('utf8').trim();
    if (actual !== foliaRevision || (await realpath(gitRoot)) !== (await realpath(root)))
      throw new Error('Folia checkout revision or root mismatch');
    try {
      git(root, ['diff', '--quiet', 'HEAD', '--', '.']);
    } catch {
      throw new Error('Folia checkout has modified tracked sources');
    }
  }
  return root;
}

// esbuild annotates bundled modules with their physical input directory. Use
// the existing logical source label so relocated rebuilds retain runtime bytes.
export function normalizeFoliaBundle(code, reference) {
  const prefix = path.relative(process.cwd(), reference).split(path.sep).join('/');
  return code.replace(/^([ \t]*\/\/ )(.+)$/gm, (line, comment, name) =>
    name.startsWith(prefix + '/')
      ? comment + '../folia-major/' + name.slice(prefix.length + 1)
      : line,
  );
}

export async function readPinnedFoliaSource(root, name) {
  relativePath(name);
  const manifest = await readManifest(root);
  if (manifest) {
    const record = manifest.files.find((file) => file.path === name);
    if (!record) throw new Error('Folia input is not recorded in SOURCE.json: ' + name);
    return verifiedBytes(root, record);
  }
  const original = git(root, ['show', foliaRevision + ':' + name]);
  const current = await readFile(path.join(root, name));
  if (!original.equals(current)) throw new Error('Dirty pinned Folia input: ' + name);
  return original;
}
