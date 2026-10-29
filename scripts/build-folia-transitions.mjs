import { resolveFoliaReference } from './folia-reference.mjs';
// Folia AGPL-3.0-only. Preserve the actual two-layer change state machine.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';
import { format, resolveConfig } from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = await resolveFoliaReference(process.argv[2]);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const sourcePath = 'src/components/visualizer/styleTransition/layerTransition.ts';
const softFocusPath = 'src/components/visualizer/styleTransition/softFocus.ts';
const source = await readFile(path.join(reference, sourcePath), 'utf8');
const softFocus = await readFile(path.join(reference, softFocusPath), 'utf8');
const started = source.match(/const started = <T>[\s\S]*?;\n/);
const functions = source.slice(
  source.indexOf('export const nextShownLayers'),
  source.indexOf('/** How long after its leave'),
);
if (!started || !functions.includes('export const startedLayers'))
  throw new Error('Pinned transition source boundaries changed');
const focus = softFocus.slice(
  softFocus.indexOf('const softFocus:'),
  softFocus.indexOf('export default'),
);
const code = `${started[0]}\n${functions}\n${focus}\nexport { softFocus };\n`;
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/shared/transitions');
await mkdir(output, { recursive: true });
await writeFile(
  path.join(output, 'layers.mjs'),
  await format(
    (
      await transform(code, {
        loader: 'ts',
        format: 'esm',
        target: 'es2016',
      })
    ).code,
    { ...(await resolveConfig(path.join(output, 'layers.mjs'))), parser: 'babel' },
  ),
);
await writeFile(
  path.join(output, 'source.json'),
  JSON.stringify(
    {
      revision,
      sourcePath,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      softFocusPath,
      softFocusSha256: createHash('sha256').update(softFocus).digest('hex'),
      firstFrameLimitMs: 1500,
      backgroundReadyLimitMs: 1000,
      leaveFallbackMarginMs: 1000,
    },
    null,
    2,
  ) + '\n',
);
const shader = path.join(output, '../../shaders/transition-blur.frag');
execFileSync(
  process.env.FOLIA_QT_BIN ? path.join(process.env.FOLIA_QT_BIN, 'qsb') : 'qsb',
  ['--glsl', '100 es,120,150', '--hlsl', '50', '--msl', '12', '-o', shader + '.qsb', shader],
  { stdio: 'inherit' },
);
