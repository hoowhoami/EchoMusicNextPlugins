// Collect only the pinned Folia inputs used by the ports, outside the runtime plugin.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdir, readFile, writeFile, mkdir, stat, mkdtemp, rename, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { execFileSync } from 'node:child_process';
import {
  foliaRepository,
  foliaRevision,
  resolveFoliaReference,
  readPinnedFoliaSource,
} from './folia-reference.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: { reference: { type: 'string' }, output: { type: 'string' } },
});
const reference = await resolveFoliaReference(values.reference);
if (existsSync(path.join(reference, 'SOURCE.json')))
  throw new Error(
    'Reference is already a source snapshot; rebuild it directly instead of collecting it again',
  );
const output = path.resolve(values.output || path.join(root, 'source/folia-reference'));
try {
  await stat(output);
  throw new Error('Source output already exists: ' + output);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const inputs = new Set([
  'LICENSE',
  'tsconfig.json',
  'test/unit/lyrics/icuFolia/corpus.ts',
  'src/utils/lyrics/renderHints.ts',
  // Raw source-oracle tests compile these indirect inputs, rather than the
  // extracted runtime kernels. Keep their actual pinned source as well.
  'src/utils/glowBlurQuantize.ts',
  'src/utils/randomVisualizerModes.ts',
  'src/types/visualizerModes.ts',
  'src/services/automix/handoffProgress.ts',
  'src/services/lucideIconResolver.ts',
  'src/services/temperaImageArchiveFormat.ts',
  'src/stores/usePlaybackStore.ts',
  'src/components/visualizer/useHandoffCover.ts',
  'src/components/visualizer/preview/frozenPicture.ts',
  'src/components/visualizer/preview/useVisPlaygroundPreviewPlayback.ts',
  'src/components/visualizer/preview/previewScale.ts',
  'src/components/visualizer/PreviewPlaceholder.ts',
  'src/components/visualizer/pixi/loadPixi.ts',
  'src/components/visualizer/pixi/pixiProgramLinks.ts',
  'src/components/visualizer/pixi/pixiWebGLContext.ts',
  'src/components/visualizer/pixi/pixiFilterPoolCompat.ts',
]);
const dependencyInputs = new Map();
const provenance = [];
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function walk(directory, visit) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(file, visit);
    else if (entry.isFile()) await visit(file);
  }
}
function collect(value) {
  if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (
        /^(src|dev|test)\//.test(key) &&
        typeof child === 'string' &&
        /^[0-9a-f]{64}$/.test(child)
      )
        inputs.add(key);
      if (
        key.startsWith('node_modules/') &&
        typeof child === 'string' &&
        /^[0-9a-f]{64}$/.test(child)
      ) {
        const previous = dependencyInputs.get(key);
        if (previous && previous !== child) throw new Error('Conflicting dependency input: ' + key);
        dependencyInputs.set(key, child);
      }
      collect(child);
    }
  } else if (
    typeof value === 'string' &&
    /^(src|dev|test)\/.+\.(?:[cm]?tsx?|css|md)$/.test(value) &&
    existsSync(path.join(reference, value))
  )
    inputs.add(value);
}
for (const directory of ['plugins/folia-lyrics-skin', 'tests/fixtures']) {
  await walk(path.join(root, directory), async (file) => {
    if (!file.endsWith('.json')) return;
    const bytes = await readFile(file);
    const data = JSON.parse(bytes);
    const before = inputs.size + dependencyInputs.size;
    collect(data);
    if (inputs.size + dependencyInputs.size !== before)
      provenance.push({
        path: path.relative(root, file).split(path.sep).join('/'),
        sha256: digest(bytes),
      });
  });
}
await walk(path.join(root, 'scripts'), async (file) => {
  if (!/^build-folia-.*\.mjs$/.test(path.basename(file))) return;
  const script = await readFile(file, 'utf8');
  for (const match of script.matchAll(/['"]((?:src|dev|test)\/[^'"\n]+)['"]/g))
    if (
      existsSync(path.join(reference, match[1])) &&
      (await stat(path.join(reference, match[1]))).isFile()
    )
      inputs.add(match[1]);
});
await walk(path.join(reference, 'dev/icuFolia'), (file) =>
  inputs.add(path.relative(reference, file).split(path.sep).join('/')),
);
for (const entry of await readdir(path.join(reference, 'src/components/visualizer'), {
  withFileTypes: true,
}))
  if (entry.isDirectory()) {
    const file = 'src/components/visualizer/' + entry.name + '/entry.tsx';
    if (existsSync(path.join(reference, file))) inputs.add(file);
  }

// Fetch/install only these existing Folia build inputs, with an independent npm lock.
// In particular, the source rebuild does not install Folia's Electron application.
const dependencyNames = [
  '@chenglou/pretext',
  '@paper-design/shaders',
  '@paper-design/shaders-react',
  'budoux',
  'opencc-js',
  'pixi.js',
  'earcut',
  'three',
  'lucide-react',
  'react',
  'react-dom',
  'twgl.js',
  'fflate',
];
const upstreamLock = JSON.parse(await readFile(path.join(reference, 'package-lock.json'), 'utf8'));
const dependencies = {};
const packages = [];
for (const name of dependencyNames) {
  const pkg = JSON.parse(
    await readFile(path.join(reference, 'node_modules', name, 'package.json'), 'utf8'),
  );
  const locked = upstreamLock.packages['node_modules/' + name];
  if (!locked || locked.version !== pkg.version || !locked.integrity)
    throw new Error('Unpinned dependency: ' + name);
  dependencies[name] = pkg.version;
}
const records = [];
await mkdir(path.dirname(output), { recursive: true });
const staging = await mkdtemp(path.join(path.dirname(output), '.' + path.basename(output) + '-'));
async function save(name, bytes, extra = {}) {
  const destination = path.join(staging, name);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  records.push({ path: name, bytes: bytes.length, sha256: digest(bytes), ...extra });
}
try {
  for (const file of [...inputs].sort())
    await save(file, await readPinnedFoliaSource(reference, file), { upstreamPath: file });
  for (const file of ['package.json', 'package-lock.json'])
    await save('metadata/upstream-' + file, await readPinnedFoliaSource(reference, file), {
      upstreamPath: file,
    });
  // npm's Pretext package includes the preferred TypeScript sources. Keep them in
  // the source archive as well as the locked package's generated build inputs.
  await walk(path.join(reference, 'node_modules/@chenglou/pretext/src'), async (file) => {
    const relative = path
      .relative(path.join(reference, 'node_modules/@chenglou/pretext'), file)
      .split(path.sep)
      .join('/');
    await save('dependencies/pretext/' + relative, await readFile(file), {
      package: '@chenglou/pretext',
      version: '0.0.9',
    });
  });
  for (const file of ['LICENSE', 'package.json'])
    await save(
      'dependencies/pretext/' + file,
      await readFile(path.join(reference, 'node_modules/@chenglou/pretext', file)),
      { package: '@chenglou/pretext', version: '0.0.9' },
    );
  // Keep the fixed Unicode inputs with the corresponding source archive as
  // well. Rebuilding text must not depend on a developer's build cache.
  const unicodeProvenancePath = 'plugins/folia-lyrics-skin/qml/shared/text/unicode-sources.json';
  const unicodeProvenance = await readFile(path.join(root, unicodeProvenancePath));
  const unicode = JSON.parse(unicodeProvenance);
  if (unicode.version !== '17.0.0') throw new Error('Expected the pinned Unicode17 source inputs');
  for (const [file, expected] of Object.entries(unicode.sha256)) {
    const bytes = await readFile(path.join(root, 'build/folia-text/unicode-17.0.0', file));
    if (digest(bytes) !== expected) throw new Error('Unicode input SHA-256 mismatch: ' + file);
    await save('dependencies/unicode-17.0.0/' + file, bytes);
  }
  await save('dependencies/unicode-17.0.0/sources.json', unicodeProvenance);
  for (const [file, expected] of dependencyInputs) {
    const bytes = await readFile(path.join(reference, file));
    if (digest(bytes) !== expected) throw new Error('Dependency input SHA-256 mismatch: ' + file);
  }
  const minimalPackage = {
    name: 'folia-reference-inputs',
    version: '1.0.0',
    private: true,
    type: 'module',
    engines: { node: '>=24 <25' },
    dependencies,
  };
  await save('package.json', Buffer.from(JSON.stringify(minimalPackage, null, 2) + '\n'));
  // Seed from the complete pinned lock before pruning. A fresh resolution can
  // choose newer transitive releases, or move dependencies to different paths.
  const seededLock = structuredClone(upstreamLock);
  seededLock.name = minimalPackage.name;
  seededLock.version = minimalPackage.version;
  seededLock.packages[''] = Object.fromEntries(
    ['name', 'version', 'engines', 'dependencies'].map((key) => [key, minimalPackage[key]]),
  );
  await writeFile(
    path.join(staging, 'package-lock.json'),
    JSON.stringify(seededLock, null, 2) + '\n',
  );
  const npmCandidates = [
    process.env.npm_execpath,
    process.env.FOLIA_NPM_CLI,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.join(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
  ];
  const npmCli = npmCandidates.find((candidate) => candidate && existsSync(candidate));
  if (!npmCli)
    throw new Error('Cannot find npm-cli.js; set FOLIA_NPM_CLI to the npm CLI shipped with Node24');
  execFileSync(
    process.execPath,
    [
      npmCli,
      'install',
      '--package-lock-only',
      '--ignore-scripts',
      '--offline',
      '--no-audit',
      '--no-fund',
    ],
    { cwd: staging, stdio: 'inherit' },
  );
  const lockBytes = await readFile(path.join(staging, 'package-lock.json'));
  const minimalLock = JSON.parse(lockBytes);
  await save('package-lock.json', lockBytes);
  // Hash the actual files in only the pruned package graph. This manifest stores
  // hashes, not node_modules. npm ci obtains these locked, integrity-checked
  // packages when rebuilding a relocated source archive.
  for (const [directory, locked] of Object.entries(minimalLock.packages)) {
    if (!directory) continue;
    const original = upstreamLock.packages[directory];
    for (const field of ['version', 'resolved', 'integrity'])
      if (!original?.[field] || locked[field] !== original[field])
        throw new Error('Minimal lock changed pinned ' + field + ': ' + directory);
    const installed = JSON.parse(
      await readFile(path.join(reference, directory, 'package.json'), 'utf8'),
    );
    if (installed.version !== locked.version)
      throw new Error('Installed package version mismatch: ' + directory);
    packages.push({
      path: directory,
      name: installed.name,
      version: installed.version,
      resolved: locked.resolved,
      integrity: locked.integrity,
      license: installed.license,
    });
    async function packageFiles(absolute, relative = directory) {
      for (const entry of await readdir(absolute, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const file = path.join(absolute, entry.name),
          name = relative + '/' + entry.name;
        if (entry.isDirectory()) await packageFiles(file, name);
        else if (entry.isFile()) {
          const actual = digest(await readFile(file)),
            expected = dependencyInputs.get(name);
          if (expected && expected !== actual)
            throw new Error('Dependency input SHA-256 mismatch: ' + name);
          dependencyInputs.set(name, actual);
        } else throw new Error('Unsupported package source symlink: ' + name);
      }
    }
    await packageFiles(path.join(reference, directory));
  }
  await writeFile(
    path.join(staging, 'SOURCE.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        upstream: { repository: foliaRepository, commit: foliaRevision },
        files: records.sort((a, b) => a.path.localeCompare(b.path, 'en')),
        packages,
        dependencyInputs: Object.fromEntries([...dependencyInputs].sort()),
        provenance,
      },
      null,
      2,
    ) + '\n',
  );
  await rename(staging, output);
} catch (error) {
  await rm(staging, { recursive: true, force: true });
  throw error;
}
console.log(
  `Collected ${inputs.size} pinned Folia files and ${dependencyInputs.size} verified dependency inputs in ${output}`,
);
