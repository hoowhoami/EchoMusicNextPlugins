import { resolveFoliaReference, normalizeFoliaBundle } from './folia-reference.mjs';
// Pinned source port. Runtime uses native Qt/QML, never React or a WebView.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { build, transform } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const reference = await resolveFoliaReference();
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const out = path.join(root, 'plugins/folia-lyrics-skin/qml/shared/harmony');
const fixture = path.join(root, 'tests/fixtures/harmony');
await mkdir(out, { recursive: true });
await mkdir(fixture, { recursive: true });
const cfg = await resolveConfig(path.join(out, 'runtime.mjs'));
const hashes = {};
async function source(relative) {
  const code = await readFile(path.join(reference, relative), 'utf8');
  hashes[relative] = createHash('sha256').update(code).digest('hex');
  return code;
}
async function save(file, text) {
  const temporary = file + '.harmony-tmp';
  await writeFile(temporary, text);
  await rename(temporary, file);
}
async function emit(file, code) {
  const js = await transform(code, {
    loader: 'ts',
    target: 'es2016',
    format: 'esm',
    legalComments: 'none',
  });
  await save(
    path.join(out, file),
    await format(
      '// Folia a8da4437 (AGPL-3.0-only). See docs/folia/harmony-reference.md.\n' + js.code,
      { ...cfg, parser: 'babel' },
    ),
  );
}
const overlay = await source('src/components/visualizer/VisualizerHarmonyOverlay.tsx');
const parts = overlay.slice(
  overlay.indexOf('const buildHarmonyTextParts ='),
  overlay.indexOf('const createHarmonyLine ='),
);
const fillStart = overlay.indexOf(
  '        const fullWidth =',
  overlay.indexOf('const fillWidth ='),
);
const fillEnd = overlay.indexOf('    });', fillStart);
if (!parts || fillStart < 0 || fillEnd < fillStart) throw Error('Harmony source seams changed');
const fill =
  'export function fillWidth(vocal,graphemeTimings,graphemeOffsets,latest) {\n' +
  overlay.slice(fillStart, fillEnd) +
  '\n}';
await emit(
  'text-parts.mjs',
  parts.replace('const buildHarmonyTextParts =', 'export const buildHarmonyTextParts =') +
    '\n' +
    fill,
);
const alternate = await source('src/utils/lyrics/alternateText.ts');
await emit('alternate-text.mjs', alternate);
const runtime = await source('src/components/visualizer/harmonyRuntime.ts');
await emit(
  'runtime.mjs',
  "import {flatMap} from '../text/compat.mjs';\n" +
    runtime
      .replace("from '../../utils/lyrics/alternateText'", "from './alternate-text.mjs'")
      .replace(
        /lines\s*\.flatMap\(line => getLineBackgroundVocals\(line\)\)/,
        'flatMap(lines, line => getLineBackgroundVocals(line))',
      ),
);
const color = await source('src/components/visualizer/wordColoring.ts');
const helpers = color.slice(color.indexOf('const CJK_REGEX'), color.indexOf('const rangesOverlap'));
const resolver = color.slice(
  color.indexOf('export const resolveWordColor ='),
  color.indexOf('export const resolveTokenColorMap'),
);
// Qt6.12 has a demonstrated second-object-pattern parameter bug. ES5 parameter
// binding preserves this source function exactly without relying on that path.
const colorPort = ts.transpileModule(helpers + resolver, {
  compilerOptions: {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.ESNext,
    downlevelIteration: true,
  },
}).outputText;
await emit('word-color.mjs', colorPort);
await source('src/utils/lyrics/graphemeTiming.ts');
await source('src/components/visualizer/textMeasureCache.ts');
await source('src/components/visualizer/monet/monetLyricsModel.ts');
await source('src/utils/fontStacks.ts');
await source('src/components/app/presentation/buildVisualizerTheme.ts');
const oracle = await build({
  stdin: {
    contents: `export * from './src/components/visualizer/harmonyRuntime.ts';\nexport {buildLineGraphemeTimeline} from './src/utils/lyrics/graphemeTiming.ts';\nexport {resolveWordColor} from './src/components/visualizer/wordColoring.ts';\n${parts.replace('const buildHarmonyTextParts =', 'export const buildHarmonyTextParts =')}\n${fill}`,
    loader: 'ts',
    resolveDir: reference,
  },
  bundle: true,
  write: false,
  format: 'esm',
  target: 'es2020',
  legalComments: 'none',
});
await save(
  path.join(fixture, 'oracle.mjs'),
  await format(
    '// Independent unmodified Folia source math, a8da4437 AGPL-3.0-only. QA only.\n' +
      normalizeFoliaBundle(oracle.outputFiles[0].text, reference),
    { ...(await resolveConfig(path.join(fixture, 'oracle.mjs'))), parser: 'babel' },
  ),
);
await save(
  path.join(out, 'source.json'),
  JSON.stringify({ revision, pretext: '0.0.9', unicode: '17.0.0', sha256: hashes }, null, 2) + '\n',
);
console.log('Harmony source runtime and independent Node oracle generated.');

const qt =
  process.env.FOLIA_QT_BIN ||
  path.resolve(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin');
for (const name of ['sweep', 'glow']) {
  const file = path.join(out, name + '.frag'),
    temporary = file + '.qsb.harmony-tmp';
  execFileSync(
    path.join(qt, 'qsb'),
    ['--glsl', '150,300es', '--hlsl', '50', '--msl', '12', '-o', temporary, file],
    { stdio: 'inherit' },
  );
  await rename(temporary, file + '.qsb');
}
