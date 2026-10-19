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

const maximumBytes = 128 * 1024 * 1024;
const validateSchema = new Ajv({ allErrors: true, strict: true }).compile(
  await readJson(`${sdkRoot}manifest.schema.json`),
);
export async function validateManifest(manifest, contract) {
  contract ??= await loadContract();
  if (!validateSchema(manifest))
    throw new Error(`Invalid manifest: ${JSON.stringify(validateSchema.errors)}`);
  relativePath(manifest.entry);
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
  const files = await inventory(root);
  const entries = new Map();
  for (const file of files) {
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
    Object.keys(config).some((key) => !['entry', 'assets'].includes(key)) ||
    !Array.isArray(config.assets)
  )
    throw new Error('plugin.config.json requires only entry and assets');
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
        await writeFile(target, await readFile(file));
      } else throw new Error(`Unsupported asset: ${relative}`);
    };
    for (const asset of config.assets) await copy(relativePath(asset));
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

export async function sourceIndex(root) {
  const index = await readJson(path.join(root, 'echo-plugins.json'));
  if (index.schemaVersion !== 2 || !Array.isArray(index.plugins))
    throw new Error('Invalid plugin index');
  const seen = new Set();
  const result = [];
  for (const record of index.plugins) {
    if (
      Object.keys(record).some((key) => !['path', 'artifact', 'sha256'].includes(key)) ||
      !record.path
    )
      throw new Error('Index contains paths only; metadata belongs to manifest');
    const source = await containedFile(root, record.path);
    const manifest = await validateManifest(await readJson(path.join(source, 'manifest.json')));
    if (seen.has(manifest.id)) throw new Error(`Duplicate index plugin ID: ${manifest.id}`);
    seen.add(manifest.id);
    result.push({ source, manifest });
  }
  dependencyOrder(result.map((item) => item.manifest));
  return result;
}

export async function buildIndex(root) {
  const sources = await sourceIndex(root);
  const destinations = [];
  for (const { source } of sources)
    destinations.push(await buildPackage(source, path.join(root, 'dist')));
  const artifacts = [];
  for (const directory of destinations) {
    const manifest = await readJson(path.join(directory, 'manifest.json'));
    artifacts.push(
      await packPluginArchive(
        directory,
        path.join(root, 'dist', `${manifest.id}-${manifest.version}.echomod`),
      ),
    );
  }
  await mkdir(path.join(root, 'dist'), { recursive: true });
  await writeFile(
    path.join(root, 'dist/echo-plugins.json'),
    `${JSON.stringify(
      {
        schemaVersion: 2,
        plugins: destinations.map((destination, index) => ({
          path: path.basename(destination),
          artifact: path.basename(artifacts[index].file),
          sha256: artifacts[index].sha256,
        })),
      },
      null,
      2,
    )}\n`,
  );
  return destinations;
}

// The GitHub source installs repository paths directly. Commit the native ESM
// artifact beside its manifest; no npm/TypeScript step runs in the music player.
export async function prepareIndex(root, check = false) {
  // containedFile returns canonical paths; use the same root when publishing
  // relative index paths (for example /var and /private/var on macOS).
  root = await realpath(root);
  const sources = await sourceIndex(root);
  const destinations = await buildIndex(root);
  const index = { schemaVersion: 2, plugins: [] };
  await mkdir(path.join(root, 'artifacts'), { recursive: true });
  for (let i = 0; i < sources.length; ++i) {
    const target = path.join(sources[i].source, sources[i].manifest.entry);
    const bytes = await readFile(path.join(destinations[i], sources[i].manifest.entry));
    if (check) {
      if (!(await readFile(target)).equals(bytes))
        throw new Error(`Published entry differs from author source: ${target}`);
    } else {
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
    await validatePackage(sources[i].source);
    const manifest = sources[i].manifest;
    const filename = `${manifest.id}-${manifest.version}.echomod`;
    const artifact = `artifacts/${filename}`;
    const archive = await readFile(path.join(root, 'dist', filename));
    const { createHash } = await import('node:crypto');
    const sha256 = createHash('sha256').update(archive).digest('hex');
    if (check) {
      if (!(await readFile(path.join(root, artifact))).equals(archive))
        throw new Error(`Published plugin differs: ${artifact}`);
      const published = (await readJson(path.join(root, 'echo-plugins.json'))).plugins[i];
      if (published.artifact !== artifact || published.sha256 !== sha256)
        throw new Error(`Published artifact/hash mismatch: ${manifest.id}`);
    } else await writeFile(path.join(root, artifact), archive);
    index.plugins.push({
      path: path.relative(root, sources[i].source).split(path.sep).join('/'),
      artifact,
      sha256,
    });
  }
  if (!check)
    await writeFile(path.join(root, 'echo-plugins.json'), `${JSON.stringify(index, null, 2)}\n`);
  return destinations;
}
