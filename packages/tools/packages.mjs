import path from 'node:path';
import os from 'node:os';
import {
  lstat,
  readdir,
  readFile,
  writeFile,
  mkdir,
  mkdtemp,
  rename,
  rm,
  realpath,
  access,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import Ajv from 'ajv/dist/2020.js';
import { parse } from 'acorn';
import { build } from 'esbuild';
import ts from 'typescript';
import { sdkRoot, readJson, loadContract, rangeContains } from './contract.mjs';
import { packPluginArchive, unpackPluginArchive } from './archives.mjs';
import { dependencyOrder } from './dependencies.mjs';
import { bakeShaders, validateShader } from './shaders.mjs';
import { readIndex, indexEntry, parseEntry } from './index.mjs';

const maximumBytes = 128 * 1024 * 1024;
const validateSchema = new Ajv({ allErrors: true, strict: true }).compile(
  await readJson(`${sdkRoot}manifest.schema.json`),
);
export async function validateManifest(manifest, contract) {
  contract ??= await loadContract();
  if (!validateSchema(manifest))
    throw new Error(`Invalid manifest: ${JSON.stringify(validateSchema.errors)}`);
  if (
    !/^[a-z][a-z0-9.-]{1,127}$/.test(manifest.id) ||
    manifest.id.endsWith('.') ||
    manifest.id.includes('..') ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/.test(manifest.id)
  )
    throw new Error('Plugin ID is not a portable directory name');
  relativePath(manifest.entry);
  if ((manifest.windows ?? []).length && !manifest.capabilities.includes('windows'))
    throw new Error('Window declarations require windows capability');
  const windowIds = new Set();
  for (const window of manifest.windows ?? []) {
    relativePath(window.component);
    if (windowIds.has(window.id)) throw new Error('Duplicate window ID');
    windowIds.add(window.id);
    if (
      (window.minWidth ?? 64) > (window.maxWidth ?? 8192) ||
      (window.minHeight ?? 64) > (window.maxHeight ?? 8192)
    )
      throw new Error('Invalid window size range');
  }
  for (const key of [
    'dependencies',
    'optionalDependencies',
    'conflicts',
    'loadAfter',
    'loadBefore',
  ])
    if (
      Object.hasOwn(manifest[key] ?? {}, manifest.id) ||
      (Array.isArray(manifest[key]) && manifest[key].includes(manifest.id))
    )
      throw new Error(`Plugin cannot depend on/order/conflict with itself: ${manifest.id}`);
  for (const id of Object.keys(manifest.dependencies ?? {}))
    if (
      Object.hasOwn(manifest.optionalDependencies ?? {}, id) ||
      Object.hasOwn(manifest.conflicts ?? {}, id)
    )
      throw new Error(`Contradictory plugin dependency: ${id}`);
  for (const id of Object.keys(manifest.optionalDependencies ?? {}))
    if (Object.hasOwn(manifest.conflicts ?? {}, id))
      throw new Error(`Contradictory optional dependency: ${id}`);
  if (
    !rangeContains(manifest.requires.hostVersion, contract.hostVersion) ||
    !rangeContains(manifest.requires.sdkVersion, contract.sdkVersion)
  )
    throw new Error('Host/SDK version is incompatible');
  for (const [requested, supported, kind] of [
    [manifest.requires.features, contract.features, 'feature'],
    [manifest.capabilities, contract.capabilities, 'capability'],
  ])
    for (const item of requested)
      if (!supported.includes(item)) throw new Error(`Unavailable required ${kind}: ${item}`);
  return manifest;
}

export function relativePath(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.includes('\\') ||
    path.posix.isAbsolute(value) ||
    /^[a-z]:/i.test(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(`Package path must be a contained relative path: ${value}`);
  return value;
}

export async function containedFile(root, relative) {
  relativePath(relative);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`Package symlink: ${relative}`);
  }
  const canonical = await realpath(current);
  const base = await realpath(root);
  if (!canonical.startsWith(`${base}${path.sep}`))
    throw new Error(`Path escaped package: ${relative}`);
  return canonical;
}

async function inventory(root) {
  const files = [];
  let bytes = 0;
  const walk = async (directory) => {
    for (const name of (await readdir(directory)).sort()) {
      const file = path.join(directory, name);
      const stat = await lstat(file);
      if (stat.isSymbolicLink()) throw new Error(`Package symlink: ${file}`);
      if (stat.isDirectory()) await walk(file);
      else if (stat.isFile()) {
        bytes += stat.size;
        files.push(path.relative(root, file).split(path.sep).join('/'));
        if (bytes > maximumBytes || files.length > 4096)
          throw new Error('Package exceeds 128 MiB or 4096 files');
      } else throw new Error(`Unsupported package file: ${file}`);
    }
  };
  await walk(root);
  return files;
}

export async function validatePackage(root) {
  if (root.toLowerCase().endsWith('.echomod')) {
    const temporary = await mkdtemp(path.join(os.tmpdir(), 'echomod-check-'));
    try {
      await unpackPluginArchive(root, temporary);
      return await validatePackage(temporary);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  }
  if ((await lstat(root)).isSymbolicLink()) throw new Error('Package root is a symlink');
  const manifestPath = await containedFile(root, 'manifest.json');
  if ((await lstat(manifestPath)).size > 256 * 1024) throw new Error('Oversized manifest');
  const manifest = await validateManifest(await readJson(manifestPath));
  for (const window of manifest.windows ?? []) await containedFile(root, window.component);
  const files = await inventory(root);
  const entries = new Map();
  for (const file of files) {
    if (file.endsWith('.qsb')) await validateShader(path.join(root, file), await loadContract());
    if (
      path.basename(file) === 'qmldir' &&
      /^\s*(optional\s+)?plugin\s+/m.test(await readFile(path.join(root, file), 'utf8'))
    )
      throw new Error('UI packages cannot load native QML plugins');
    if (file.endsWith('.mjs')) {
      const ast = parse(await readFile(path.join(root, file), 'utf8'), {
        ecmaVersion: 2016,
        sourceType: 'module',
      });
      entries.set(file, ast);
      for (const node of ast.body) {
        if (!node.source) continue;
        const specifier = node.source.value;
        if (specifier === 'echo:plugin-sdk') continue;
        if (!specifier.startsWith('./') && !specifier.startsWith('../'))
          throw new Error(`Unsupported runtime module: ${specifier}`);
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
        await containedFile(root, resolved);
        if (!resolved.endsWith('.mjs')) throw new Error(`ES module must use .mjs: ${specifier}`);
      }
    }
  }
  const entry = entries.get(manifest.entry);
  if (!entry) throw new Error('Entry module is missing');
  const exportsActivate = entry.body.some(
    (node) =>
      node.type === 'ExportNamedDeclaration' &&
      (node.declaration?.id?.name === 'activate' ||
        node.declaration?.declarations?.some((value) => value.id.name === 'activate') ||
        node.specifiers?.some((value) => value.exported.name === 'activate')),
  );
  if (!exportsActivate) throw new Error('Entry must export activate(context)');
  return manifest;
}

function typecheck(entry) {
  const program = ts.createProgram([entry, `${sdkRoot}index.d.ts`], {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2016,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2016.d.ts'],
    types: [],
    allowJs: true,
    checkJs: true,
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length)
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => process.cwd(),
        getCanonicalFileName: (name) => name,
        getNewLine: () => '\n',
      }),
    );
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function buildPackage(source, outputRoot) {
  source = await realpath(source);
  const manifest = await validateManifest(await readJson(path.join(source, 'manifest.json')));
  const config = await readJson(path.join(source, 'plugin.config.json'));
  if (
    !config ||
    Object.keys(config).some((key) => !['entry', 'assets', 'shaders'].includes(key)) ||
    !Array.isArray(config.assets)
  )
    throw new Error('plugin.config.json requires entry, assets and optional shaders');
  if (relativePath(config.entry) === manifest.entry)
    throw new Error('Author entry must differ from the published entry');
  const entry = await containedFile(source, config.entry);
  if (!/\.(ts|js|mjs)$/.test(entry)) throw new Error('Author entry must be .ts/.js/.mjs');
  typecheck(entry);
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    outfile: 'entry.mjs',
    target: 'es2016',
    format: 'esm',
    platform: 'neutral',
    external: ['echo:plugin-sdk'],
    charset: 'utf8',
    legalComments: 'inline',
    logLevel: 'silent',
  });
  outputRoot = path.resolve(outputRoot);
  if (outputRoot === source || source.startsWith(`${outputRoot}${path.sep}`))
    throw new Error('Output cannot replace source tree');
  await mkdir(outputRoot, { recursive: true });
  outputRoot = await realpath(outputRoot);
  if (outputRoot === source || source.startsWith(`${outputRoot}${path.sep}`))
    throw new Error('Output cannot replace source tree');
  const destination = path.join(outputRoot, manifest.id);
  if (await exists(destination)) {
    const marker = await readJson(path.join(destination, '.echo-build.json'));
    if (marker.id !== manifest.id)
      throw new Error('Refusing to replace a directory not produced by this builder');
  }
  const staging = await mkdtemp(path.join(outputRoot, '.staging-'));
  let backup;
  try {
    await mkdir(path.dirname(path.join(staging, manifest.entry)), { recursive: true });
    await writeFile(path.join(staging, manifest.entry), result.outputFiles[0].contents);
    await writeFile(path.join(staging, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(
      path.join(staging, '.echo-build.json'),
      `${JSON.stringify({ id: manifest.id, sdkVersion: (await loadContract()).sdkVersion })}\n`,
    );
    const copy = async (relative) => {
      const file = await containedFile(source, relative);
      const stat = await lstat(file);
      if (outputRoot === file || outputRoot.startsWith(`${file}${path.sep}`))
        throw new Error('Assets cannot contain the build output directory');
      if (stat.isDirectory())
        for (const name of await readdir(file)) await copy(`${relative}/${name}`);
      else if (stat.isFile()) {
        const target = path.join(staging, relative);
        if (await exists(target)) throw new Error(`Asset overwrites generated file: ${relative}`);
        if (stat.size > maximumBytes) throw new Error('Asset exceeds package limit');
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, await readFile(file), { mode: 0o644 | (stat.mode & 0o111) });
      } else throw new Error(`Unsupported asset: ${relative}`);
    };
    for (const asset of config.assets) await copy(relativePath(asset));
    await bakeShaders(
      source,
      staging,
      config.shaders,
      containedFile,
      relativePath,
      await loadContract(),
    );
    await validatePackage(staging);
    if (await exists(destination)) {
      backup = `${destination}.previous-${randomUUID()}`;
      await rename(destination, backup);
    }
    try {
      await rename(staging, destination);
    } catch (error) {
      if (backup) await rename(backup, destination);
      throw error;
    }
    if (backup) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
  return destination;
}

export async function buildPluginArchive(source, outputRoot) {
  const directory = await buildPackage(source, outputRoot);
  const manifest = await readJson(path.join(directory, 'manifest.json'));
  return packPluginArchive(
    directory,
    path.join(path.dirname(directory), `${manifest.id}-${manifest.version}.echomod`),
  );
}

export async function localPackages(root) {
  const config = await readJson(path.join(root, 'echo-plugin.build.json'));
  if (!Array.isArray(config.plugins) || config.plugins.length > 128)
    throw new Error('echo-plugin.build.json must explicitly list local plugin sources');
  const ids = new Set();
  const result = [];
  for (const relative of config.plugins) {
    const source = await containedFile(root, relative);
    const manifest = await validateManifest(await readJson(path.join(source, 'manifest.json')));
    if (ids.has(manifest.id)) throw new Error(`Duplicate local plugin ID: ${manifest.id}`);
    ids.add(manifest.id);
    result.push({ source, manifest });
  }
  return result;
}
export async function buildIndex(root) {
  const destinations = [];
  for (const { source } of await localPackages(root)) {
    const destination = await buildPackage(source, path.join(root, 'dist'));
    const manifest = await readJson(path.join(destination, 'manifest.json'));
    await packPluginArchive(
      destination,
      path.join(root, 'dist', `${manifest.id}-${manifest.version}.echomod`),
    );
    destinations.push(destination);
  }
  return destinations;
}
// Local official packages and remote curated entries are independent. Preparing
// a local package never requires another author's source or rewrites their entry.
export async function prepareIndex(root) {
  root = await realpath(root);
  const config = await readJson(path.join(root, 'echo-plugin.build.json'));
  const published = await readIndex(root, config.repository);
  const sources = await localPackages(root);
  const destinations = await buildIndex(root);
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  for (let i = 0; i < sources.length; ++i) {
    const { manifest, source } = sources[i];
    const filename = `${manifest.id}-${manifest.version}.echomod`;
    const artifact = `artifacts/${filename}`;
    const file = path.join(root, 'dist', filename);
    const entry = await indexEntry(file, {
      repo: config.repository,
      ref: config.ref ?? 'HEAD',
      path: path.relative(root, source).split(path.sep).join('/'),
      artifact,
    });
    const previous = published.plugins.findIndex((value) => value.id === entry.id);
    if (previous >= 0 && published.plugins[previous].repository !== parseEntry(entry).repository)
      throw new Error(`Local package conflicts with a curated author: ${entry.id}`);
    const portable = { id: entry.id, path: entry.path, artifact, sha256: entry.sha256 };
    if (entry.ref !== 'HEAD') portable.ref = entry.ref;
    if (previous >= 0) published.original.plugins[previous] = portable;
    else published.original.plugins.push(portable);
    await writeFile(path.join(root, artifact), await readFile(file));
  }
  await writeFile(
    path.join(root, 'echo-plugins.json'),
    `${JSON.stringify(published.original, null, 2)}\n`,
  );
  return destinations;
}
