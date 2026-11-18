// Reproduce the pure Folia Metaphor kernels; the native renderer is maintained separately.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import ts from 'typescript';
import { transform } from 'esbuild';

const { values } = parseArgs({ options: { reference: { type: 'string' } } });
if (!values.reference) throw new Error('--reference requires the pinned Folia checkout');
const reference = path.resolve(values.reference);
const revision = '8006b40f6e7b26198ac964e9e1255c3ca23bd935';
if (
  execFileSync('git', ['-C', reference, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !==
  revision
)
  throw new Error('Unexpected Folia revision');
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/metaphor/source');
await mkdir(output, { recursive: true });
const prefix = 'src/components/visualizer/';
const files = Object.fromEntries([
  ...[
    'metaphorProgram',
    'metaphorCamera',
    'metaphorLayout',
    'metaphorFigures',
    'metaphorShapes',
    'metaphorPalette',
    'metaphorShaders',
    'types',
  ].map((name) => [name, prefix + 'metaphor/' + name + '.ts']),
  ...['visualizerSeedHash', 'colorMix', 'textMeasureCache', 'wordColoring'].map((name) => [
    name,
    prefix + name + '.ts',
  ]),
]);
const inputs = {};
if (process.versions.unicode !== '17.0')
  throw new Error('Generate Unicode classes with pinned Node 24 / Unicode 17');
const letterNumberClass = (() => {
  const ranges = [];
  let start = -1;
  const encode = (point) => '\\u{' + point.toString(16) + '}';
  for (let point = 0; point <= 0x110000; ++point) {
    const matched = point < 0x110000 && /[\p{L}\p{N}]/u.test(String.fromCodePoint(point));
    if (matched && start < 0) start = point;
    if (!matched && start >= 0) {
      ranges.push(encode(start) + (point - 1 > start ? '-' + encode(point - 1) : ''));
      start = -1;
    }
  }
  return '[' + ranges.join('') + ']';
})();

for (const [name, relative] of Object.entries(files)) {
  let source = await readFile(path.join(reference, relative), 'utf8');
  inputs[relative] = createHash('sha256').update(source).digest('hex');
  source = source
    .replaceAll(String.raw`[\p{L}\p{N}]`, letterNumberClass)
    .replaceAll("'../visualizerSeedHash'", "'./visualizerSeedHash.mjs'")
    .replaceAll("'../colorMix'", "'./colorMix.mjs'")
    .replaceAll(
      "'../../../utils/lyrics/graphemeTiming'",
      "'../../../shared/text/graphemeTiming.mjs'",
    )
    .replaceAll(
      "'../../../utils/lyrics/wordSegmentation'",
      "'../../../shared/text/wordSegmentation.mjs'",
    )
    .replaceAll("'../../../utils/lyricRenderQuality'", "'./renderQuality.mjs'")
    .replace(/from '(\.\/[^']+)'/g, (full, value) =>
      value.endsWith('.mjs') ? full : `from '${value}.mjs'`,
    );
  if (name === 'metaphorCamera') {
    // Cache lifetime belongs to the native cue layout. In the pinned QV4,
    // repeated presentation retirement reached a stale WeakMap key during
    // camera evaluation. An own, non-enumerable slot preserves the original
    // per-layout cache and releases it with that layout, without a global root.
    source = source
      .replace(/const tracks = new WeakMap<[^;]+;/, '')
      .replace('tracks.get(layout)', 'layout.__foliaMetaphorTrack')
      .replace(
        'tracks.set(layout, fresh);',
        "Object.defineProperty(layout, '__foliaMetaphorTrack', { value: fresh, writable: true, configurable: true });",
      );
    if (
      source.includes('tracks.get(') ||
      source.includes('tracks.set(') ||
      source.includes('new WeakMap')
    )
      throw new Error(
        'Metaphor camera cache source changed; review the native lifetime adaptation',
      );
  }
  const tree = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true);
  const collectionHelpers = new Set();
  const adapted = ts.transform(tree, [
    (context) => {
      const visit = (node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ['at', 'flatMap'].includes(node.expression.name.text) &&
          node.expression.expression.kind !== ts.SyntaxKind.ThisKeyword &&
          node.expression.expression.getText(tree) !== 'pen'
        ) {
          const helper = node.expression.name.text === 'at' ? 'arrayAt' : 'arrayFlatMap';
          collectionHelpers.add(helper);
          return context.factory.createCallExpression(
            context.factory.createIdentifier(helper),
            undefined,
            [
              ts.visitNode(node.expression.expression, visit),
              ...node.arguments.map((arg) => ts.visitNode(arg, visit)),
            ],
          );
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit);
    },
  ]);
  const code = ts.createPrinter().printFile(adapted.transformed[0]);
  adapted.dispose();
  const js = await transform(
    (collectionHelpers.size
      ? `import {${[...collectionHelpers].join(',')}} from './compat.mjs';\n`
      : '') + code,
    { loader: 'ts', target: 'es2016', format: 'esm', legalComments: 'inline', charset: 'utf8' },
  );
  await writeFile(
    path.join(output, name + '.mjs'),
    `// Copyright (c) 2026 chthollyphile. Derived from Folia ${revision}; AGPL-3.0-only.\n// Source: ${relative}\n` +
      js.code,
  );
}
for (const name of ['createMetaphorRuntime', 'metaphorGlyphs']) {
  const file = prefix + 'metaphor/' + name + '.ts';
  inputs[file] = createHash('sha256')
    .update(await readFile(path.join(reference, file)))
    .digest('hex');
}
const quality = 'src/utils/lyricRenderQuality.ts';
const qualitySource = await readFile(path.join(reference, quality), 'utf8');
inputs[quality] = createHash('sha256').update(qualitySource).digest('hex');
const declaration = qualitySource.match(
  /export const DEFAULT_LYRIC_RENDER_OVERRIDE[^=]*=\s*(\{[^;]+\});/,
);
if (!declaration) throw new Error('Missing original rendering defaults');
await writeFile(
  path.join(output, 'renderQuality.mjs'),
  '// AGPL-3.0-only; exact default literal from Folia lyricRenderQuality.ts.\nexport const DEFAULT_LYRIC_RENDER_OVERRIDE = ' +
    declaration[1] +
    ';\n',
);
await writeFile(
  path.join(output, 'compat.mjs'),
  '// ES2016 helper; no engine prototype mutation.\nexport function arrayAt(values, index) { return values[index < 0 ? values.length + index : index]; }\nexport function arrayFlatMap(values, fn) { const result = []; values.forEach((value, i) => { const part = fn(value, i, values); if (Array.isArray(part)) result.push.apply(result, part); else result.push(part); }); return result; }\n',
);
await writeFile(
  path.join(output, 'reference.json'),
  JSON.stringify(
    {
      repository: 'https://github.com/chthollyphile/folia-major',
      revision,
      license: 'AGPL-3.0-only',
      inputs,
      adaptations: [
        'Imports point to native prepared lyric segmentation and timing.',
        'Array.at uses a local ES2016 helper.',
        'Camera tracking is stored as a non-enumerable property of its cue layout and retires with that layout.',
        'Rendering override default is extracted verbatim; no browser rendering quality service is loaded.',
      ],
    },
    null,
    2,
  ) + '\n',
);
