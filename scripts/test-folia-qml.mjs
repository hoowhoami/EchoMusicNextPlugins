import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const { values } = parseArgs({ options: { 'qt-bin': { type: 'string' } } });
if (!values['qt-bin']) throw new Error('Pass --qt-bin /absolute/Qt/6.12/bin');
await mkdir('build/folia-qml', { recursive: true });
await build({
  entryPoints: ['plugins/folia-lyrics-skin/src/config.ts'],
  outfile: 'build/folia-qml/config.mjs',
  bundle: true,
  format: 'esm',
  target: 'es2016',
});
const result = spawnSync(
  path.join(path.resolve(values['qt-bin']), 'qmltestrunner'),
  ['-input', 'tests/qml', '-o', '-,txt'],
  { stdio: 'inherit', env: { ...process.env, QT_QPA_PLATFORM: 'offscreen' } },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
