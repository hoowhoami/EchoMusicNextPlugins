import { resolveFoliaReference } from './folia-reference.mjs';
// Reproducible source ports; build-time dependencies only.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { transform } from 'esbuild';
import ts from 'typescript';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({ options: { reference: { type: 'string' } } });
const reference = await resolveFoliaReference(values.reference);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/fume');
await mkdir(output, { recursive: true });
const config = await resolveConfig(path.join(output, 'math.mjs'));
const sha256 = {};
async function source(relative) {
  const text = await readFile(path.join(reference, relative), 'utf8');
  sha256[relative] = createHash('sha256').update(text).digest('hex');
  return text;
}
// Qt 6.12 QV4 corrupts the native generator frame in this large function. The
// compiler's standard state machine retains every source yield/return and runs in WorkerScript.
async function emit(name, code) {
  if (name === 'text-measure.mjs') {
    const prefix = 'const measureSegmentGlyphOffsets = (';
    const start = code.indexOf(prefix),
      end = code.indexOf('\n};', start) + 3;
    if (start < 0 || end < start) throw new Error('Missing source segment measurement declaration');
    const declaration = code
      .slice(start, end)
      .replace(prefix, 'function measureSegmentGlyphOffsets(')
      .replace(') => {', ') {')
      .replace(/;$/, '');
    code = code.slice(0, start) + declaration + code.slice(end);
  }
  if (name === 'article-layout.mjs')
    code = ts.transpileModule(code, {
      compilerOptions: {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.ESNext,
        downlevelIteration: true,
      },
    }).outputText;
  const js = await transform(code, {
    loader: 'ts',
    target: 'es2016',
    format: 'esm',
    legalComments: 'none',
    define: { 'import.meta.env.DEV': 'false' },
  });
  // TypeScript's generator helper closes over t in sent(). Hoist its existing
  // var declaration, preserving the exact generated state machine.
  if (name === 'article-layout.mjs')
    js.code = js.code
      .replace('var _ = {', 'var t;\n  var _ = {')
      .replace(/,\s*t,\s*g\s*=/, ', g =');
  await writeFile(
    path.join(output, name),
    await format(
      '// Derived from Folia a8da4437 (AGPL-3.0-only). See fume-reference.md.\n' + js.code,
      { ...config, parser: 'babel' },
    ),
  );
}
const names = {
  fumeMath: 'math',
  fumeTextStyle: 'text-style',
  fumeBlockFrame: 'block-frame',
  fumeReveal: 'reveal',
  fumeCamera: 'camera',
  fumeCameraStep: 'camera-step',
  fumeArticleLayout: 'article-layout',
  fumeTextMeasure: 'text-measure',
  FumeBackground: 'background',
  fumeCanvasText: 'canvas-text',
};
for (const [original, destination] of Object.entries(names)) {
  let code = await source('src/components/visualizer/fume/' + original + '.ts');
  for (const [name, target] of Object.entries(names))
    code = code.replaceAll("from './" + name + "'", "from './" + target + ".mjs'");
  code = code
    .replaceAll("from '@chenglou/pretext'", "from './pretext.mjs'")
    .replaceAll("from '../../../utils/fontStacks'", "from '../cadenza/font-stacks.mjs'")
    .replaceAll("from '../../../utils/lyrics/renderHints'", "from '../../shared/renderHints.mjs'")
    .replaceAll(
      "from '../../../utils/lyrics/graphemeTiming'",
      "from '../../shared/text/graphemeTiming.mjs'",
    )
    .replaceAll("from '../wordColoring'", "from '../cadenza/word-coloring.mjs'")
    .replaceAll("from '../colorMix'", "from '../cadenza/color.mjs'")
    .replaceAll("from '../textMeasureCache'", "from './text-cache.mjs'")
    .replaceAll("from '../../../utils/glowBlurQuantize'", "from './canvas-glow.mjs'");
  if (original === 'fumeMath') {
    const a = code.indexOf('const graphemeSegmenter ='),
      b = code.indexOf('export const clamp');
    code =
      code.slice(0, a) +
      "import {splitLyricGraphemes as splitGraphemes} from '../../shared/text/unicode.mjs';\nexport {splitGraphemes};\n" +
      code.slice(b);
  }
  if (original === 'fumeArticleLayout') {
    const a = code.indexOf('export const runLayoutInSlices ='),
      b = code.indexOf('const chooseNaturalBlockVariant', a);
    code = code.slice(0, a) + code.slice(b);
    // Preserve host source indices after host-side filtered rows are omitted.
    code = code.replace(
      '.map((line, index) => ({ line, index }))',
      '.map((line, index) => ({ line, index: Number.isInteger(line.sourceIndex) ? line.sourceIndex : index }))',
    );
  }
  if (original === 'fumeTextMeasure') {
    code = code.replace(
      'let segmentMeasureCanvas: HTMLCanvasElement | null = null;',
      "import {getMeasureContext} from './native-measure.mjs';",
    );
    const a = code.indexOf("    if (typeof document === 'undefined')"),
      b = code.indexOf('    context.font = fontSpec;', a);
    code = code.slice(0, a) + '    const context = getMeasureContext();\n' + code.slice(b);
    code += '\nexport const clearFumeTextMeasureCaches = () => segmentMeasureCache.clear();\n';
  }
  if (original === 'fumeCanvasText') {
    code = code.replace(
      '    const segmentRunStart =',
      '    if (context.fumeTextRange) { context.fumeTextRange(renderLine, segment, runStart, runEnd, baseX, baseY); return; }\n    const segmentRunStart =',
    );
    const a = code.indexOf('export const createStaticBlockSnapshot ='),
      b = code.indexOf('export interface FumeLiveBlockParams', a);
    code = code.slice(0, a) + code.slice(b);
  }
  await emit(destination + '.mjs', code);
}
await emit('text-cache.mjs', await source('src/components/visualizer/textMeasureCache.ts'));
for (const file of [
  'VisualizerFume.tsx',
  'useFumeCanvasStage.ts',
  'fumeLiveRaster.ts',
  'tuning.ts',
  'entry.tsx',
])
  await source('src/components/visualizer/fume/' + file);
await source('src/types.ts');
// Reuse the tested portable pretext bundle, with a distinct per-worker native-measure adapter.
const reused = JSON.parse(await readFile(path.join(output, '../cadenza/sources.json'), 'utf8'));
if (reused.revision !== revision || reused.pretext !== '0.0.9' || reused.unicode !== '17.0.0')
  throw new Error('Cadenza portable pretext provenance mismatch');
let pretext = await readFile(path.join(output, '../cadenza/pretext.mjs'), 'utf8');
pretext = pretext
  .replaceAll("'./pretext-adapter.mjs'", "'./native-measure.mjs'")
  .replaceAll("'./unicode-properties.mjs'", "'../cadenza/unicode-properties.mjs'");
// Pure literal Set declarations may be moved before the function definitions that reference them.
// This removes QML's static used-before-declared warning without changing initialization dependencies.
let punctuationDeclarations = '';
for (const name of ['kinsokuStart', 'leftStickyPunctuation']) {
  const start = pretext.indexOf('var ' + name + ' =');
  if (start < 0) throw new Error('pretext declaration not found: ' + name);
  const end = pretext.indexOf('\n]);', start) + 5;
  if (end < start) throw new Error('pretext Set terminator missing');
  punctuationDeclarations += pretext.slice(start, end) + '\n';
  pretext = pretext.slice(0, start) + pretext.slice(end);
}
pretext = pretext.replace(
  'function endsWithLineStartProhibitedText(text) {',
  punctuationDeclarations + 'function endsWithLineStartProhibitedText(text) {',
);
await writeFile(
  path.join(output, 'pretext.mjs'),
  await format(pretext, { ...config, parser: 'babel' }),
);
await writeFile(
  path.join(output, 'TYPESCRIPT-LICENSE.txt'),
  await readFile(path.join(root, 'node_modules/typescript/LICENSE.txt')),
);
await writeFile(
  path.join(output, 'PRETEXT-LICENSE.txt'),
  await readFile(path.join(output, '../cadenza/PRETEXT-LICENSE.txt')),
);
await writeFile(
  path.join(output, 'sources.json'),
  JSON.stringify(
    {
      revision,
      generatorCompiler: {
        package: 'typescript',
        version: ts.version,
        target: 'ES5',
        license: 'TYPESCRIPT-LICENSE.txt',
      },
      pretext: '0.0.9',
      unicode: '17.0.0',
      sha256,
      reused: {
        directory: '../cadenza',
        files: Object.fromEntries(
          await Promise.all(
            [
              'pretext.mjs',
              'font-stacks.mjs',
              'color.mjs',
              'word-coloring.mjs',
              'compat.mjs',
              'unicode-properties.mjs',
            ].map(async (name) => [
              name,
              createHash('sha256')
                .update(await readFile(path.join(output, '../cadenza', name)))
                .digest('hex'),
            ]),
          ),
        ),
      },
    },
    null,
    2,
  ) + '\n',
);
for (const shader of ['shadow-pass.frag', 'shadow-compose.frag', 'stamp.frag']) {
  const file = path.join(output, shader);
  execFileSync(
    path.join(
      process.env.FOLIA_QT_BIN ||
        path.resolve(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin'),
      'qsb',
    ),
    ['--glsl', '150,300es', '--hlsl', '50', '--msl', '12', '-o', file + '.qsb', file],
    { stdio: 'inherit' },
  );
}
console.log(
  'Generated complete Fume article/camera/reveal/background/frame algorithms and GPU shadows.',
);
