// Reproducible extraction of Folia's Hanabi scene, layouts and analytic particle kernels.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
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
const base = 'src/components/visualizer/hanabi';
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/hanabi/source');
const qml = path.dirname(path.dirname(output));
const shared = path.join(qml, '../shared/text');
const external = new Map([
  ['src/utils/lyrics/graphemeTiming', path.join(shared, 'graphemeTiming.mjs')],
  ['src/utils/lyrics/wordSegmentation', path.join(qml, 'lumiere/word-segmentation.mjs')],
  ['src/utils/lyrics/renderHints', path.join(shared, '../renderHints.mjs')],
  ['src/components/visualizer/lucidePath2d', path.join(output, '../icons.mjs')],
  ['src/services/lucideIconResolver', path.join(output, '../icons.mjs')],
  ['src/components/visualizer/pixi/bloomFilter', path.join(output, '../bloom.mjs')],
  ['src/services/beatFx/clock', path.join(output, '../excluded-analysis.mjs')],
]);
const inputs = {},
  pending = [
    ...(await readdir(path.join(reference, base), { recursive: true }))
      .filter((p) => p.endsWith('.ts') && !['createHanabiPixiRuntime.ts', 'tuning.ts'].includes(p))
      .map((p) => base + '/' + p),
  ];
const unicodeClasses = new Map();
function unicodeRange(property) {
  if (process.versions.unicode !== '17.0')
    throw new Error('Unicode 17 generation requires pinned Node24');
  if (unicodeClasses.has(property)) return unicodeClasses.get(property);
  const regex = new RegExp('\\p{' + property + '}', 'u'),
    ranges = [];
  let start = -1;
  const encode = (value) => '\\u{' + value.toString(16) + '}';
  for (let point = 0; point <= 0x110000; ++point) {
    const matched = point < 0x110000 && regex.test(String.fromCodePoint(point));
    if (matched && start < 0) start = point;
    if (!matched && start >= 0) {
      ranges.push(encode(start) + (point - 1 > start ? '-' + encode(point - 1) : ''));
      start = -1;
    }
  }
  const result = ranges.join('');
  unicodeClasses.set(property, result);
  return result;
}
const seen = new Set();
function destination(relative) {
  return path.join(
    output,
    relative.startsWith(base + '/')
      ? relative.slice(base.length + 1).replace(/\.ts$/, '.mjs')
      : '_shared/' + relative.replace(/^src\//, '').replace(/\.ts$/, '.mjs'),
  );
}
const sourceOf = async (relative) => {
  try {
    return await readFile(path.join(reference, relative), 'utf8');
  } catch {
    return execFileSync('git', ['-C', reference, 'show', revision + ':' + relative], {
      encoding: 'utf8',
    });
  }
};
while (pending.length) {
  const relative = pending.shift();
  if (seen.has(relative)) continue;
  seen.add(relative);
  const original = await sourceOf(relative);
  inputs[relative] = createHash('sha256').update(original).digest('hex');
  // Erase type-only imports before discovering runtime dependencies.
  let code = (
    await transform(
      original.replace(/\\p\{([^}]+)\}/g, (_, property) => unicodeRange(property)),
      { loader: 'ts', target: 'es2016', format: 'esm', legalComments: 'inline' },
    )
  ).code;
  const dest = destination(relative);
  const tree = ts.createSourceFile(relative, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let compat = false,
    environment = false;
  const rewritten = ts.transform(tree, [
    (context) => {
      const visit = (node) => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
          const spec = node.moduleSpecifier.text;
          if (!spec.startsWith('.')) throw new Error('Unexpected external import ' + spec);
          const logical = path.posix.normalize(path.posix.join(path.posix.dirname(relative), spec));
          let target = external.get(logical);
          if (!target) {
            const dep = logical + '.ts';
            if (!logical.startsWith('src/')) throw new Error('Source import escapes repository');
            pending.push(dep);
            target = destination(dep);
          }
          let next = path.relative(path.dirname(dest), target).split(path.sep).join('/');
          if (!next.startsWith('.')) next = './' + next;
          return context.factory.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            context.factory.createStringLiteral(next),
            node.attributes,
          );
        }
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ['at', 'flatMap'].includes(node.expression.name.text)
        ) {
          compat = true;
          return context.factory.createCallExpression(
            context.factory.createIdentifier(
              node.expression.name.text === 'at' ? 'arrayAt' : 'arrayFlatMap',
            ),
            undefined,
            [
              ts.visitNode(node.expression.expression, visit),
              ...node.arguments.map((arg) => ts.visitNode(arg, visit)),
            ],
          );
        }
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.expression.getText(tree) === 'Object' &&
          node.expression.name.text === 'fromEntries'
        ) {
          compat = true;
          return context.factory.createCallExpression(
            context.factory.createIdentifier('fromEntries'),
            undefined,
            node.arguments.map((arg) => ts.visitNode(arg, visit)),
          );
        }
        if (
          ts.isIdentifier(node) &&
          ['document', 'OffscreenCanvas', 'globalThis'].includes(node.text)
        )
          environment = true;
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit);
    },
  ]);
  code = ts.createPrinter().printFile(rewritten.transformed[0]);
  rewritten.dispose();
  const rel = (name) => {
    const p = path
      .relative(path.dirname(dest), path.join(output, '../' + name))
      .split(path.sep)
      .join('/');
    return p.startsWith('.') ? p : './' + p;
  };
  if (compat)
    code = `import { arrayAt, arrayFlatMap, fromEntries } from '${rel('compat.mjs')}';\n` + code;
  if (environment)
    code =
      `import { document, OffscreenCanvas, globalThis } from '${rel('environment.mjs')}';\n` + code;
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, '// Folia ' + revision + ' · AGPL-3.0-only · ' + relative + '\n' + code);
}
await writeFile(
  path.join(output, 'reference.json'),
  JSON.stringify(
    {
      repository: 'https://github.com/chthollyphile/folia-major',
      revision,
      inputs,
      adaptations: [
        'TypeScript erased; imports redirected to native scene recorder and exact Qt/ICU text services.',
        'Array at/flatMap use local ES2016 helpers.',
        'DOM canvas records immutable preparation commands; no DOM runtime.',
        'Offline beat analysis is excluded; scene update receives no beat table.',
        'Song and paragraph transition holders are not used.',
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log('Extracted ' + seen.size + ' pinned Hanabi modules');
