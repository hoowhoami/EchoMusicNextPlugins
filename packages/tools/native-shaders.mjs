// Build-only native shader bundles. Qt owns QSB serialization and binding maps.
import path from 'node:path';
import os from 'node:os';
import { randomUUID, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import {
  readFile,
  writeFile,
  readdir,
  realpath,
  lstat,
  mkdir,
  mkdtemp,
  rename,
  rm,
  copyFile,
} from 'node:fs/promises';
const execute = promisify(execFile),
  qtVersion = '6.12.0';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const tool = () => process.env.ECHO_SHADER_PACK_TOOL || 'echo-plugin-shader-pack';
const run = (command, args, options = {}) =>
  execute(command, args, { timeout: 60000, maxBuffer: 2 * 1024 * 1024, ...options });
export async function inspectShader(file) {
  const { stdout } = await run(tool(), ['inspect', file]);
  const value = JSON.parse(stdout);
  if (
    value.qtVersion !== qtVersion ||
    !/^[a-f0-9]{64}$/.test(value.fingerprint) ||
    !Array.isArray(value.shaders)
  )
    throw Error('Invalid native shader inspection');
  return value;
}
export function nativeCompileArguments(backend, info, key) {
  if (!key.entryPoint || !Number.isInteger(key.version))
    throw Error('Missing native shader entry/version');
  if (backend === 'windows') {
    const prefix = ['vs', 'hs', 'ds', 'gs', 'ps', 'cs'][info.stage];
    if (!prefix || key.source !== 'hlsl' || ![50, 51].includes(key.version))
      throw Error('Unsupported DXBC shader profile');
    return {
      command: process.env.ECHO_FXC || 'fxc.exe',
      args: [
        '/nologo',
        '/T',
        `${prefix}_${Math.floor(key.version / 10)}_${key.version % 10}`,
        '/E',
        key.entryPoint,
        '/Fo',
        'shader.dxbc',
        'shader.hlsl',
      ],
      output: 'shader.dxbc',
      source: 'shader.hlsl',
      native: 'dxbc',
    };
  }
  if (backend === 'macos') {
    if (key.source !== 'msl') throw Error('Metal requires an MSL source key');
    return {
      command: 'xcrun',
      args: [
        '-sdk',
        'macosx',
        'metal',
        '-c',
        `-std=macos-metal${Math.floor(key.version / 10)}.${key.version % 10}`,
        '-mmacosx-version-min=14.4',
        'shader.metal',
        '-o',
        'shader.air',
      ],
      output: 'shader.metallib',
      source: 'shader.metal',
      native: 'metallib',
    };
  }
  throw Error('Unsupported native compiler backend');
}
function portable(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > 1024 ||
    /[\\:\0]/.test(value) ||
    value.split('/').some((v) => !v || v === '.' || v === '..')
  )
    throw Error('Invalid shader bundle path');
  return value;
}
async function contained(root, relative) {
  const file = path.join(root, portable(relative)),
    resolved = await realpath(file),
    base = await realpath(root);
  if (!resolved.startsWith(base + path.sep) || !(await lstat(file)).isFile())
    throw Error('Shader bundle file escapes its root');
  return resolved;
}
async function shaderFiles(directory) {
  const result = [];
  async function walk(relative = '') {
    for (const entry of await readdir(path.join(directory, relative), { withFileTypes: true })) {
      const name = relative ? relative + '/' + entry.name : entry.name;
      if (entry.isDirectory()) await walk(name);
      else if (entry.isSymbolicLink()) throw Error('Shader inputs cannot contain symlinks');
      else if (entry.isFile() && name.endsWith('.qsb')) result.push(name);
    }
  }
  await walk();
  if (result.length > 512) throw Error('Shader bundle exceeds512packs');
  return result.sort();
}
function nativeComplete(info) {
  const has = (key, type) =>
    info.shaders.some(
      (v) =>
        v.source === type &&
        v.version === key.version &&
        v.flags === key.flags &&
        v.variant === key.variant &&
        v.entryPoint === key.entryPoint,
    );
  return (
    info.shaders.some((v) => v.source === 'spirv') &&
    info.shaders.some((v) => v.source === 'glsl') &&
    info.shaders.some((v) => v.source === 'hlsl') &&
    info.shaders.some((v) => v.source === 'msl') &&
    info.shaders.filter((v) => v.source === 'hlsl').every((v) => has(v, 'dxbc')) &&
    info.shaders.filter((v) => v.source === 'msl').every((v) => has(v, 'metallib'))
  );
}
async function transaction(output, action) {
  output = path.resolve(output);
  await mkdir(path.dirname(output), { recursive: true });
  const staging = await mkdtemp(output + '.building-'),
    backup = output + '.previous-' + randomUUID();
  let moved = false;
  try {
    await action(staging);
    try {
      await rename(output, backup);
      moved = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    try {
      await rename(staging, output);
    } catch (error) {
      if (moved) await rename(backup, output);
      throw error;
    }
    if (moved) await rm(backup, { recursive: true, force: true });
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
async function readBundle(directory) {
  const file = await contained(directory, 'index.json'),
    bytes = await readFile(file);
  if (bytes.length > 1024 * 1024) throw Error('Shader bundle index exceeds1MiB');
  const value = JSON.parse(bytes);
  if (
    value.schemaVersion !== 1 ||
    value.qtVersion !== qtVersion ||
    !Array.isArray(value.shaders) ||
    value.shaders.length > 512 ||
    typeof value.pluginId !== 'string'
  )
    throw Error('Invalid shader bundle index');
  const paths = new Set();
  for (const entry of value.shaders) {
    portable(entry.path);
    if (
      !entry.path.endsWith('.qsb') ||
      paths.has(entry.path) ||
      !/^[a-f0-9]{64}$/.test(entry.fingerprint) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)
    )
      throw Error('Invalid or duplicate shader bundle entry');
    paths.add(entry.path);
  }
  return value;
}
async function checkedFile(directory, entry) {
  const file = await contained(directory, 'files/' + entry.path),
    info = await lstat(file);
  if (info.size > 16 * 1024 * 1024 || hash(await readFile(file)) !== entry.sha256)
    throw Error('Shader bundle checksum mismatch');
  return file;
}
export async function compileNativeBundle(directory, backend, output) {
  if (!['windows', 'macos', 'linux'].includes(backend))
    throw Error('Invalid native shader backend');
  if (
    (backend === 'windows' && process.platform !== 'win32') ||
    (backend === 'macos' && process.platform !== 'darwin')
  )
    throw Error('Native shader compiler requires its target operating system');
  directory = await realpath(directory);
  if (path.resolve(output) === directory || path.resolve(output).startsWith(directory + path.sep))
    throw Error('Native shader output must be outside the input package');
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  const files = await shaderFiles(directory);
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'echo-native-shaders-'));
  try {
    await transaction(output, async (staging) => {
      const shaders = [];
      for (const relative of files) {
        const input = await contained(directory, relative),
          info = await inspectShader(input),
          additions = [];
        if (!info.shaders.some((v) => v.source === 'spirv')) throw Error('Missing compiled SPIR-V');
        for (const key of info.shaders.filter((v) =>
          backend === 'windows'
            ? v.source === 'hlsl'
            : backend === 'macos'
              ? v.source === 'msl'
              : false,
        )) {
          const command = nativeCompileArguments(backend, info, key);
          await run(tool(), [
            'extract',
            input,
            JSON.stringify(key),
            path.join(temporary, command.source),
          ]);
          await rm(path.join(temporary, command.output), { force: true });
          await run(command.command, command.args, { cwd: temporary });
          if (backend === 'macos')
            await run('xcrun', ['-sdk', 'macosx', 'metallib', 'shader.air', '-o', command.output], {
              cwd: temporary,
            });
          else await run(command.command, ['/dumpbin', command.output], { cwd: temporary });
          const data = await readFile(path.join(temporary, command.output));
          if (!data.subarray(0, 4).equals(Buffer.from(backend === 'macos' ? 'MTLB' : 'DXBC')))
            throw Error('Native compiler did not produce its expected bytecode');
          const saved = path.join(temporary, 'native-' + additions.length + '.bin');
          await writeFile(saved, data);
          additions.push({ ...key, backend: command.native, file: saved });
        }
        if (backend !== 'linux' && additions.length === 0)
          throw Error('Native source variants are missing');
        const target = path.join(staging, 'files', relative);
        await mkdir(path.dirname(target), { recursive: true });
        if (additions.length) {
          const json = path.join(temporary, 'additions.json');
          await writeFile(json, JSON.stringify(additions));
          await run(tool(), ['add', input, json, target]);
        } else await copyFile(input, target);
        const result = await inspectShader(target);
        if (result.fingerprint !== info.fingerprint)
          throw Error('Native compilation changed portable shader inputs');
        shaders.push({
          path: relative,
          fingerprint: info.fingerprint,
          sha256: hash(await readFile(target)),
        });
      }
      await writeFile(
        path.join(staging, 'index.json'),
        JSON.stringify(
          {
            schemaVersion: 1,
            qtVersion,
            pluginId: manifest.id,
            backend,
            producerPlatform: process.platform,
            shaders,
          },
          null,
          2,
        ) + '\n',
      );
    });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
export async function mergeNativeBundles(directories, output) {
  const bundles = await Promise.all(directories.map(readBundle));
  if (
    bundles.length !== 3 ||
    new Set(bundles.map((v) => v.backend)).size !== 3 ||
    !['windows', 'macos', 'linux'].every((v) => bundles.some((b) => b.backend === v))
  )
    throw Error('All three native shader stages are required');
  const first = bundles[0],
    paths = first.shaders.map((v) => v.path).sort();
  for (const b of bundles)
    if (
      b.pluginId !== first.pluginId ||
      JSON.stringify(b.shaders.map((v) => v.path).sort()) !== JSON.stringify(paths)
    )
      throw Error('Native shader stage inventories differ');
  await transaction(output, async (staging) => {
    const shaders = [];
    for (const relative of paths) {
      const entries = bundles.map((b) => b.shaders.find((v) => v.path === relative));
      if (!entries.every((v) => v.fingerprint === entries[0].fingerprint))
        throw Error('Native shader stage inputs differ');
      const inputs = await Promise.all(entries.map((v, i) => checkedFile(directories[i], v)));
      const target = path.join(staging, 'files', relative);
      await mkdir(path.dirname(target), { recursive: true });
      await run(tool(), ['merge', ...inputs, target]);
      const info = await inspectShader(target);
      if (info.fingerprint !== entries[0].fingerprint || !nativeComplete(info))
        throw Error('Merged shader misses a complete native backend');
      shaders.push({
        path: relative,
        fingerprint: info.fingerprint,
        sha256: hash(await readFile(target)),
      });
    }
    await writeFile(
      path.join(staging, 'index.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          qtVersion,
          pluginId: first.pluginId,
          backend: 'portable-native',
          shaders,
        },
        null,
        2,
      ) + '\n',
    );
  });
}
export async function applyNativeBundle(directory, bundleRoot, pluginId) {
  const bundle = await readBundle(bundleRoot);
  if (bundle.pluginId !== pluginId || bundle.backend !== 'portable-native')
    throw Error('Wrong plugin or incomplete native shader bundle');
  const files = await shaderFiles(directory);
  if (JSON.stringify(files) !== JSON.stringify(bundle.shaders.map((v) => v.path).sort()))
    throw Error('Native shader bundle does not cover every packaged shader');
  const copies = [];
  for (const entry of bundle.shaders) {
    const current = await contained(directory, entry.path),
      nativeFile = await checkedFile(bundleRoot, entry);
    const [plain, compiled] = await Promise.all([
      inspectShader(current),
      inspectShader(nativeFile),
    ]);
    if (
      plain.fingerprint !== entry.fingerprint ||
      compiled.fingerprint !== entry.fingerprint ||
      !nativeComplete(compiled)
    )
      throw Error('Stale or incomplete native shader bundle');
    copies.push([nativeFile, current]);
  }
  for (const [source, target] of copies) await copyFile(source, target);
}
