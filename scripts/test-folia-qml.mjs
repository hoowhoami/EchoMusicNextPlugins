import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
import path from 'node:path';
import { buildPackage } from '../packages/tools/packages.mjs';

const { values } = parseArgs({
  options: {
    'qt-bin': { type: 'string' },
    'host-build': { type: 'string' },
    platform: { type: 'string', default: 'cocoa' },
    python: { type: 'string', default: 'python3' },
  },
});
if (!values['qt-bin'] || !values['host-build'])
  throw new Error(
    'Pass --qt-bin /absolute/Qt/6.12/bin --host-build /absolute/host/build/release; native renderers require the actual host modules.',
  );
if (!['cocoa', 'offscreen'].includes(values.platform)) throw new Error('Unsupported platform');
await mkdir('build/folia-qml', { recursive: true });
await build({
  entryPoints: ['plugins/folia-lyrics-skin/src/config.ts'],
  outfile: 'build/folia-qml/config.mjs',
  bundle: true,
  format: 'esm',
  target: 'es2016',
});
// Quick shader URLs resolve beside the packaged QML. Use the actual baker
// output, rather than copying generated binaries back into author sources.
process.env.ECHO_QSB ??= path.resolve(
  values['qt-bin'],
  process.platform === 'win32' ? 'qsb.exe' : 'qsb',
);
const pluginRoot = await buildPackage(
  path.resolve('plugins/folia-lyrics-skin'),
  path.resolve('build/folia-qml/packages'),
);
const result = spawnSync(
  values.python,
  [
    'scripts/test-folia-native-qml.py',
    '--qt-bin',
    values['qt-bin'],
    '--host-build',
    values['host-build'],
    '--input',
    'tests/qml',
    '--plugin-root',
    pluginRoot,
    '--platform',
    values.platform,
  ],
  { stdio: 'inherit', env: process.env },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
