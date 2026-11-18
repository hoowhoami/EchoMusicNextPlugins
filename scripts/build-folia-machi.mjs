// Reproducible extraction of Folia's Machi scene, layouts and analytic particle kernels.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import ts from 'typescript';
import { transform, build } from 'esbuild';

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
const base = 'src/components/visualizer/machi';
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/machi/source');
const qml = path.dirname(path.dirname(output));
const shared = path.join(qml, '../shared/text');
const external = new Map([
  ['src/utils/fontStacks', path.join(output, '../environment.mjs')],
  ['src/services/analysis/gpuActivity', path.join(output, '../excluded-analysis.mjs')],
  ['src/stores/useVisualizerSettingsStore', path.join(output, '../excluded-analysis.mjs')],
  [base + '/degradeStatus', path.join(output, '../excluded-analysis.mjs')],
  [base + '/shownScene', path.join(output, '../excluded-analysis.mjs')],
  [base + '/engine/programWarmup', path.join(output, '../native-warmup.mjs')],
  ['src/utils/lyrics/graphemeTiming', path.join(shared, 'graphemeTiming.mjs')],
  ['src/utils/lyrics/wordSegmentation', path.join(qml, 'lumiere/word-segmentation.mjs')],
  ['src/services/lucideIconResolver', path.join(output, '../icons.mjs')],
  ['src/components/visualizer/lucidePath2d', path.join(output, '../icons.mjs')],
  ['src/services/beatFx/clock', path.join(output, '../excluded-analysis.mjs')],
  ['src/services/beatFx/beatFxLive', path.join(output, '../excluded-analysis.mjs')],
  ['src/services/analysis/drumHits', path.join(output, '../excluded-analysis.mjs')],
  ['src/services/analysis/vocalEnvelope', path.join(output, '../excluded-analysis.mjs')],
]);
const inputs = {},
  threeExports = new Set(),
  threeExamples = new Map();
const names = execFileSync(
  'git',
  ['-C', reference, 'ls-tree', '-r', '--name-only', revision, base],
  { encoding: 'utf8' },
)
  .trim()
  .split('\n');
const pending = names.filter(
  (p) =>
    p.endsWith('.ts') &&
    !/(cameraBar|cameraControls|degradeStatus|shownScene|programWarmup|tuning)\.ts$/.test(p),
);
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
  let source = original.replaceAll('import.meta.env.DEV', 'false');
  if (relative.endsWith('/createMachiRuntime.ts'))
    source = source.replace('new THREE.WebGLRenderer(', 'new NativeRenderer(');
  if (relative === 'src/utils/lyrics/parserCore.ts') {
    const tree = ts.createSourceFile(
      relative,
      original,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    source = tree.statements
      .filter(
        (node) =>
          ts.isVariableStatement(node) &&
          node.declarationList.declarations.some((d) =>
            ['INTERLUDE_FULL_TEXT', 'isInterludeLine'].includes(d.name.getText(tree)),
          ),
      )
      .map((node) => node.getText(tree))
      .join('\n');
  }
  let code = (
    await transform(
      source.replace(/\\p\{([^}]+)\}/g, (_, property) => unicodeRange(property)),
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
          if (spec === 'three') {
            if (
              !node.importClause?.namedBindings ||
              !ts.isNamespaceImport(node.importClause.namedBindings)
            )
              throw Error('Unexpected Three import');
            return context.factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              context.factory.createStringLiteral(
                path
                  .relative(path.dirname(dest), path.join(output, '../three.mjs'))
                  .split(path.sep)
                  .join('/'),
              ),
              node.attributes,
            );
          }
          if (spec.startsWith('three/examples/')) {
            threeExamples.set(spec, path.basename(spec, '.js'));
            return context.factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              context.factory.createStringLiteral(
                path
                  .relative(
                    path.dirname(dest),
                    path.join(output, '../three/' + path.basename(spec, '.js') + '.mjs'),
                  )
                  .split(path.sep)
                  .join('/'),
              ),
              node.attributes,
            );
          }
          if (!spec.startsWith('.')) throw new Error('Unexpected external import ' + spec);
          const logical = path.posix.normalize(path.posix.join(path.posix.dirname(relative), spec));
          let target = external.get(logical);
          if (!target) {
            const dep = names.includes(logical + '/index.ts')
              ? logical + '/index.ts'
              : logical + '.ts';
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
          ['at', 'flatMap', 'flat', 'trimStart', 'trimEnd'].includes(node.expression.name.text)
        ) {
          compat = true;
          return context.factory.createCallExpression(
            context.factory.createIdentifier(
              {
                at: 'arrayAt',
                flat: 'arrayFlat',
                flatMap: 'arrayFlatMap',
                trimStart: 'trimStart',
                trimEnd: 'trimEnd',
              }[node.expression.name.text],
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
          [
            'document',
            'OffscreenCanvas',
            'globalThis',
            'Image',
            'ImageData',
            'Math',
            'performance',
            'window',
            'ResizeObserver',
            'requestAnimationFrame',
            'cancelAnimationFrame',
            'AbortController',
            'DOMException',
            'Path2D',
          ].includes(node.text)
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
  if (relative.endsWith('/engine/geometry/shapes.ts')) {
    code =
      `import { indexTriangles } from '${rel('indexed-geometry.mjs')}';\n` +
      code
        .replace(
          'geometry.index ? geometry.toNonIndexed()',
          'geometry.index && !geometry.attributes.normal ? geometry.toNonIndexed()',
        )
        .replace(
          'result.morphAttributes = {};',
          'indexTriangles(result);\n    result.morphAttributes = {};',
        );
  }
  if (relative.endsWith('/createMachiRuntime.ts'))
    code = `import { NativeRenderer } from '${rel('native-renderer.mjs')}';\n` + code;
  if (compat)
    code =
      `import { arrayAt, arrayFlatMap, arrayFlat, trimStart, trimEnd, fromEntries } from '${rel('compat.mjs')}';\n` +
      code;
  if (environment)
    code =
      `import { document, OffscreenCanvas, globalThis, Image, ImageData, math as Math, performance, window, ResizeObserver, requestAnimationFrame, cancelAnimationFrame, AbortController, DOMException, Path2D } from '${rel('environment.mjs')}';\n` +
      code;
  if (/\bnew Weak(?:Map|Set)\(\)/.test(code)) {
    let own = path
      .relative(
        path.dirname(dest),
        path.join(root, 'plugins/folia-lyrics-skin/qml/shared/objectCache.mjs'),
      )
      .split(path.sep)
      .join('/');
    if (!own.startsWith('.')) own = './' + own;
    code =
      `import { createObjectCache, createObjectSet } from '${own}';\n` +
      code
        .replace(/\bnew WeakMap\(\)/g, 'createObjectCache()')
        .replace(/\bnew WeakSet\(\)/g, 'createObjectSet()');
  }
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
        'Original GL command classes retained for native data recording; no WebGL context is used.',
        'Fonts and glyph skeleton pixels are supplied by bounded one-time native preparation.',
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log('Extracted ' + seen.size + ' pinned Machi modules');

await writeFile(
  path.join(output, '../three-imports.json'),
  JSON.stringify({ examples: [...threeExamples.keys()] }, null, 2) + '\n',
);

// Three's data/geometry/material core only; no WebGLRenderer or DOM rendering backend.
const threePackage = JSON.parse(
  await readFile(path.join(root, 'node_modules/three/package.json'), 'utf8'),
);
if (threePackage.version !== '0.185.1') throw Error('Pinned Three 0.185.1 is required');
const thirdPartyInputs = new Set();
function retainInputs(result) {
  for (const name of Object.keys(result.metafile.inputs))
    if (name.startsWith('node_modules/three/')) thirdPartyInputs.add(name);
}
retainInputs(
  await build({
    metafile: true,
    stdin: {
      contents:
        "export * from './node_modules/three/src/Three.Core.js'; export { UniformsUtils } from './node_modules/three/src/renderers/shaders/UniformsUtils.js'; import lights_fragment_begin from './node_modules/three/src/renderers/shaders/ShaderChunk/lights_fragment_begin.glsl.js'; export const ShaderChunk={lights_fragment_begin};",
      resolveDir: root,
      sourcefile: 'folia-native-three.mjs',
    },
    bundle: true,
    format: 'esm',
    target: 'es2016',
    legalComments: 'inline',
    outfile: path.join(output, '../three.mjs'),
  }),
);
await writeFile(
  path.join(output, '../three.mjs'),
  "import { performance } from './environment.mjs';\nimport { createObjectCache, createObjectSet } from '../../shared/objectCache.mjs';\n" +
    (await readFile(path.join(output, '../three.mjs'), 'utf8'))
      .replace(/\bnew WeakMap\(\)/g, 'createObjectCache()')
      .replace(/\bnew WeakSet\(\)/g, 'createObjectSet()'),
);
await mkdir(path.join(output, '../three'), { recursive: true });
for (const spec of threeExamples.keys()) {
  const result = await build({
    metafile: true,
    entryPoints: [path.join(root, 'node_modules', spec)],
    bundle: true,
    format: 'esm',
    target: 'es2016',
    legalComments: 'inline',
    outfile: path.join(output, '../three', path.basename(spec, '.js') + '.mjs'),
    plugins: [
      {
        name: 'native-three-core',
        setup(builder) {
          builder.onResolve({ filter: /^three$/ }, () => ({
            path: '../three.mjs',
            external: true,
          }));
        },
      },
    ],
  });
  retainInputs(result);
  if (spec.endsWith('/RoundedBoxGeometry.js') || spec.endsWith('/BufferGeometryUtils.js')) {
    const file = path.join(output, '../three', path.basename(spec, '.js') + '.mjs');
    const source = await readFile(file, 'utf8');
    const adapted = spec.endsWith('/RoundedBoxGeometry.js')
      ? source.replace(
          /    const (\w+) = this\.toNonIndexed\(\);[\s\S]*?this\.attributes\.uv = \1\.attributes\.uv;/,
          '',
        )
      : source.replace(
          /    let indexOffset = 0;[\s\S]*?mergedGeometry\.setIndex\(mergedIndex\);/,
          '    mergedGeometry.setIndex(mergeIndices(geometries));',
        );
    if (adapted === source) throw Error('Pinned geometry layout has changed: ' + spec);
    await writeFile(
      file,
      (spec.endsWith('/BufferGeometryUtils.js')
        ? "import { mergeIndices } from '../indexed-geometry.mjs';\n"
        : '') + adapted,
    );
  }
  if (spec.endsWith('/SMAAPass.js')) {
    const file = path.join(output, '../three/SMAAPass.mjs');
    await writeFile(
      file,
      "import { Image } from '../environment.mjs';\n" + (await readFile(file, 'utf8')),
    );
  }
}
await writeFile(
  path.join(output, '../THREE-LICENSE.txt'),
  await readFile(path.join(root, 'node_modules/three/LICENSE'), 'utf8'),
);

retainInputs(
  await build({
    metafile: true,
    entryPoints: [path.join(root, 'node_modules/three/src/renderers/webgl/WebGLLights.js')],
    bundle: true,
    format: 'esm',
    target: 'es2016',
    legalComments: 'inline',
    outfile: path.join(output, '../three-lights.mjs'),
  }),
);
const thirdPartyHashes = {};
for (const name of [...thirdPartyInputs].sort())
  thirdPartyHashes[name.replace(/^node_modules\//, '')] = createHash('sha256')
    .update(await readFile(path.join(root, name)))
    .digest('hex');
await writeFile(
  path.join(output, '../third-party-sources.json'),
  JSON.stringify(
    { package: 'three', version: threePackage.version, license: 'MIT', inputs: thirdPartyHashes },
    null,
    2,
  ) + '\n',
);
