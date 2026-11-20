#!/usr/bin/env node
import path from 'node:path';
import os from 'node:os';
import { parseArgs } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { buildPackage } from '../packages/tools/packages.mjs';
import { compileNativeBundle, mergeNativeBundles } from '../packages/tools/native-shaders.mjs';
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    backend: { type: 'string' },
    out: { type: 'string' },
    windows: { type: 'string' },
    macos: { type: 'string' },
    linux: { type: 'string' },
  },
});
const [command, source] = positionals;
if (!values.out) throw Error('A shader bundle output directory is required');
if (command === 'stage' && source && positionals.length === 2) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'echo-shader-stage-'));
  const previous = process.env.ECHO_NATIVE_SHADER_PACKS;
  try {
    delete process.env.ECHO_NATIVE_SHADER_PACKS;
    const built = await buildPackage(path.resolve(source), temporary);
    await compileNativeBundle(built, values.backend, path.resolve(values.out));
  } finally {
    if (previous === undefined) delete process.env.ECHO_NATIVE_SHADER_PACKS;
    else process.env.ECHO_NATIVE_SHADER_PACKS = previous;
    await rm(temporary, { recursive: true, force: true });
  }
} else if (
  command === 'merge' &&
  positionals.length === 1 &&
  values.windows &&
  values.macos &&
  values.linux
)
  await mergeNativeBundles(
    [values.windows, values.macos, values.linux].map((v) => path.resolve(v)),
    path.resolve(values.out),
  );
else
  throw Error(
    'Expected stage <plugin> --backend windows|macos|linux --out <dir>, or merge --windows <dir> --macos <dir> --linux <dir> --out <dir>',
  );
console.info(path.resolve(values.out));
