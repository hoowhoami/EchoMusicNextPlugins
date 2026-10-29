import { resolveFoliaReference } from './folia-reference.mjs';
// Build-time only: pinned Folia algorithms, no runtime npm dependency.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { transform } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({
  options: { reference: { type: 'string' }, 'qt-bin': { type: 'string' } },
});
const reference = await resolveFoliaReference(values.reference);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
if (process.versions.unicode !== '17.0') throw new Error('Build with Node24 Unicode17');
const require = createRequire(import.meta.url),
  ts = require('typescript');
const sourceRoot = path.join(reference, 'src/components/visualizer/lumiere'),
  output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/lumiere'),
  formatting = await resolveConfig(path.join(output, 'api.mjs')),
  sha256 = {};
const own = (name) => path.join(output, name),
  shared = (name) => path.join(root, 'plugins/folia-lyrics-skin/qml/shared', name),
  cadenza = (name) => path.join(root, 'plugins/folia-lyrics-skin/qml/styles/cadenza', name);
function relative(from, to) {
  let result = path.relative(path.dirname(from), to).replaceAll(path.sep, '/');
  if (!result.startsWith('.')) result = './' + result;
  return result;
}
async function source(file) {
  const text = await readFile(file, 'utf8');
  sha256[path.relative(reference, file)] = createHash('sha256').update(text).digest('hex');
  return text;
}
async function emit(
  file,
  text,
  notice = '// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.\n',
) {
  await mkdir(path.dirname(file), { recursive: true });
  const result = await transform(text, {
    loader: 'ts',
    format: 'esm',
    target: 'es2016',
    legalComments: 'none',
  });
  await writeFile(file, await format(notice + result.code, { ...formatting, parser: 'babel' }));
}
const external = new Map(
  [
    ['src/utils/lyrics/graphemeTiming', shared('text/graphemeTiming.mjs')],
    ['src/utils/lyrics/renderHints', shared('renderHints.mjs')],
    ['src/utils/lyrics/wordSegmentation', own('word-segmentation.mjs')],
    ['src/utils/fontStacks', own('source/fontStacks.mjs')],
    ['src/components/visualizer/visualizerSeedHash', own('source/visualizerSeedHash.mjs')],
    ['src/components/visualizer/pixi/pixiTextureBudget', own('source/pixiTextureBudget.mjs')],
    ['src/components/visualizer/colorMix', cadenza('color.mjs')],
    ['src/components/visualizer/wordColoring', cadenza('word-coloring.mjs')],
    ['src/components/visualizer/pixiFilterVertex', own('source/pixiFilterVertex.mjs')],
    ['src/types', own('source/app-defaults.mjs')],
    ['src/services/lucideIconResolver', own('icon-resolver.mjs')],
    ['src/components/visualizer/pixiSceneCache', own('source/pixiSceneCache.mjs')],
    ['src/components/visualizer/pixiSongSwap', own('source/pixiSongSwap.mjs')],
    ...['loadPixi', 'pixiProgramLinks', 'pixiWebGLContext'].map((name) => [
      'src/components/visualizer/pixi/' + name,
      own('runtime-browser.mjs'),
    ]),
  ].map(([key, value]) => [path.join(reference, key), value]),
);
function rewrite(code, from, to) {
  const imports = new Set();
  if (from.endsWith('/createLumierePixiRuntime.ts'))
    code =
      'import {runtimeWindow as window,runtimePerformance as performance,setRuntimeTimeout as setTimeout,clearRuntimeTimeout as clearTimeout} from ' +
      JSON.stringify(relative(to, own('runtime-environment.mjs'))) +
      ';\n' +
      code;
  code = code.replaceAll('globalThis.devicePixelRatio', '0'); // Source neutral offset subtracts identical expressions; stays zero on every DPR.
  if (code.includes("document.createElement('canvas')")) {
    code =
      'import {createCanvas} from ' +
      JSON.stringify(relative(to, own('canvas.mjs'))) +
      ';\n' +
      code.replaceAll("document.createElement('canvas')", 'createCanvas()');
  }
  code = code.replace('/[\\p{L}\\p{N}]/u', "propertyTest(['L','N'])");
  if (code.includes('propertyTest(')) {
    imports.add('propertyTest');
  }
  if (from.endsWith('/glyphLine.ts')) {
    const a = code.indexOf('const UPRIGHT ='),
      b = code.indexOf('\n', a);
    code =
      code.slice(0, a) +
      `const UPRIGHT={test(text:string){for(const char of text){const cp=char.codePointAt(0)!;if([[0x1100,0x11ff],[0x2e80,0x2fff],[0x3000,0x303f],[0x3040,0x30ff],[0x3100,0x31ff],[0x3200,0x9fff],[0xac00,0xd7af],[0xf900,0xfaff],[0xfe30,0xfe4f],[0xff00,0xffef],[0x20000,0x3134f]].some(([a,b])=>cp>=a&&cp<=b))return true;}return false;}};` +
      code.slice(b);
  }
  const file = ts.createSourceFile(from, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const rewritten = ts.transform(file, [
    (context) => {
      const f = context.factory;
      const helper = (name) => {
        imports.add(name);
        return f.createIdentifier(name);
      };
      function visit(node) {
        node = ts.visitEachChild(node, visit, context);
        if (
          ts.isStringLiteral(node) &&
          node.parent &&
          (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent))
        ) {
          const value = node.text;
          if (value.endsWith('.mjs')) return node;
          let target;
          if (value === '@chenglou/pretext' || value === '@chenglou/pretext/rich-inline')
            target = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/monet/pretext.mjs');
          else if (value.startsWith('.')) {
            const absolute = path.resolve(path.dirname(from), value);
            target = external.get(absolute);
            if (!target && absolute.startsWith(sourceRoot + path.sep))
              target = own('source/' + path.relative(sourceRoot, absolute) + '.mjs');
            if (!target) throw new Error('Unmapped Lumiere import ' + from + ':' + value);
          }
          if (target) return f.createStringLiteral(relative(to, target));
        }
        if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
          const receiver = node.expression.expression,
            name = node.expression.name.text,
            args = node.arguments;
          if (name === 'flatMap')
            return f.createCallExpression(helper('flatMap'), undefined, [receiver, ...args]);
          if (name === 'at') {
            if (
              args.length !== 1 ||
              !ts.isPrefixUnaryExpression(args[0]) ||
              args[0].operator !== ts.SyntaxKind.MinusToken ||
              args[0].operand.text !== '1'
            )
              throw new Error('Unported at call');
            return f.createElementAccessExpression(
              receiver,
              f.createBinaryExpression(
                f.createPropertyAccessExpression(receiver, 'length'),
                ts.SyntaxKind.MinusToken,
                f.createNumericLiteral(1),
              ),
            );
          }
          if (
            ts.isIdentifier(receiver) &&
            receiver.text === 'Object' &&
            ['fromEntries', 'values', 'entries'].includes(name)
          )
            return f.createCallExpression(helper(name), undefined, args);
          if (
            ts.isIdentifier(receiver) &&
            receiver.text === 'Array' &&
            name === 'from' &&
            (ts.isStringLiteral(args[0]) || (ts.isIdentifier(args[0]) && args[0].text === 'title'))
          )
            return f.createCallExpression(helper('codePoints'), undefined, args);
        }
        return node;
      }
      return (node) => ts.visitNode(node, visit);
    },
  ]);
  let text = ts.createPrinter().printFile(rewritten.transformed[0]);
  rewritten.dispose();
  for (const name of imports) {
    let target =
      name === 'propertyTest'
        ? cadenza('unicode-properties.mjs')
        : name === 'codePoints'
          ? shared('text/codepoints.mjs')
          : name === 'flatMap'
            ? shared('text/compat.mjs')
            : own('compat.mjs');
    text = `import {${name}} from ${JSON.stringify(relative(to, target))};\n` + text;
  }
  return text;
}
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith('.ts') && entry.name !== 'tuning.ts') {
      const target = own('source/' + path.relative(sourceRoot, file).replace(/\.ts$/, '.mjs'));
      await emit(target, rewrite(await source(file), file, target));
    }
  }
}
await mkdir(output, { recursive: true });
await walk(sourceRoot);
for (const file of [
  'src/utils/fontStacks.ts',
  'src/components/visualizer/visualizerSeedHash.ts',
  'src/components/visualizer/pixi/pixiTextureBudget.ts',
  'src/utils/lumiereTuning.ts',
  'src/components/visualizer/pixiFilterVertex.ts',
  'src/components/visualizer/pixiSceneCache.ts',
  'src/components/visualizer/pixiSongSwap.ts',
]) {
  const target = own('source/' + path.basename(file, '.ts') + '.mjs');
  await emit(
    target,
    rewrite(await source(path.join(reference, file)), path.join(reference, file), target),
  );
}
const types = await source(path.join(reference, 'src/types.ts')),
  defaults = types.slice(
    types.indexOf('export const DEFAULT_LUMIERE_TUNING'),
    types.indexOf('\n};', types.indexOf('export const DEFAULT_LUMIERE_TUNING')) + 3,
  );
await emit(own('source/app-defaults.mjs'), defaults);
await emit(
  own('api.mjs'),
  [
    'catalog',
    'lumiereProgram',
    'lumiereKernel',
    'lumiereRandom',
    'lumiereSceneFrames',
    'lumiereUnitLayout',
    'lumiereRuntimeTuning',
    'lumiereAudio',
    'lumiereTuning',
    'types',
    'light/rig',
    'text/lineWrap',
    'text/reveal',
    'text/wordStyle',
    'text/windowSlots',
    'text/windowTiming',
  ]
    .map((name) => `export * from './source/${name}.mjs';`)
    .join('\n') +
    "\nexport * from './field-frame.mjs';\nexport * from './backend.mjs';\nexport * from './bloom-plan.mjs';\nexport * from './scene-frame.mjs';\nexport * from './scene-job.mjs';\nexport * from './frame-plan.mjs';\nexport * from './runtime-frame.mjs';",
);
await copyFile(
  path.join(reference, 'node_modules/lucide-react/LICENSE'),
  own('LUCIDE-LICENSE.txt'),
);
await writeFile(
  own('sources.json'),
  JSON.stringify(
    {
      revision,
      unicode: '17.0.0',
      pretext: '0.0.9 (Monet portable module)',
      lucide: '1.48.0',
      compatibility: [
        'ES2016 library calls via scoped helpers',
        'Qt Unicode17 EGC/properties',
        'native ICU word pieces',
        'UPRIGHT original explicit ranges, no Unicode extension broadening',
        'DPR neutral-offset inputs replaced by zero; identical subtraction is always zero',
      ],
      sha256,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Generated Lumiere source compiler, all 100 rigs, scene/text/light algorithms. Native adapter separate.',
);
// Original field GLSL; only adapt the uniform storage and QML fragment interface.
const fieldSource = await source(path.join(sourceRoot, 'light/lightFieldShader.ts'));
let fragment = /const fragment = `([\s\S]*?)`;/.exec(fieldSource)[1].replace('${MAX_BEAMS}', '6');
const uniforms = [];
fragment = fragment.replace(
  /uniform (vec[34]) (\w+)(\[MAX_BEAMS\])?;[^\n]*\n/g,
  (_all, type, name, array) => {
    if (array)
      for (let i = 0; i < 6; i++) uniforms.push({ type, name: name + i, parent: name, index: i });
    else uniforms.push({ type, name });
    return '';
  },
);
fragment = fragment
  .replace(/precision highp float;|in vec2 vPos;|in float vAlpha;|out vec4 finalColor;/g, '')
  .replaceAll('finalColor', 'fragColor')
  .replaceAll('vAlpha', 'qt_Opacity')
  .replaceAll('gl_FragCoord.xy', 'sourceFragCoord()');
let accessors = '';
for (const letter of 'ABCDEF') {
  accessors += `vec4 beam${letter}(int index){${Array.from({ length: 5 }, (_, i) => `if(index==${i})return uBeam${letter}${i};`).join('')}return uBeam${letter}5;}\n`;
  fragment = fragment.replaceAll(`uBeam${letter}[i]`, `beam${letter}(i)`);
}
const header = `#version 440\n// Folia a8da4437 AGPL-3.0-only: original light-field formulas.\nlayout(location=0) in vec2 qt_TexCoord0;\nlayout(location=0) out vec4 fragColor;\nlayout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 uExtent;vec2 uOrigin;float uPhysicalHeight;${uniforms.map((v) => v.type + ' ' + v.name + ';').join('\n')}};\n#define vPos (qt_TexCoord0*uExtent+uOrigin)\nvec2 sourceFragCoord(){return vec2(gl_FragCoord.x,uPhysicalHeight-gl_FragCoord.y);}\n`;
await writeFile(own('light-field.frag'), header + accessors + fragment);
const properties = uniforms
  .map(
    (v) =>
      `property ${v.type === 'vec3' ? 'vector3d' : 'vector4d'} ${v.name}: root.vector(${JSON.stringify(v.parent || v.name)},${v.index === undefined ? 0 : v.index},${v.type === 'vec3' ? 3 : 4})`,
  )
  .join('\n');
await writeFile(
  own('LightField.qml'),
  `// Original source light field: QML uniform bindings only.\npragma ComponentBehavior: Bound\nimport QtQuick\nShaderEffect {\nid:root\nproperty var uniforms: ({})\nproperty real resolution: 1\nproperty vector2d origin: Qt.vector2d(0,0)\nproperty vector2d uExtent: Qt.vector2d(width,height)\nproperty vector2d uOrigin: origin\nproperty real uPhysicalHeight: height*resolution\nfunction vector(key:string,index:int,count:int):var {const values=uniforms[key]||[],o=index*4;return count===3?Qt.vector3d(values[o]||0,values[o+1]||0,values[o+2]||0):Qt.vector4d(values[o]||0,values[o+1]||0,values[o+2]||0,values[o+3]||0);}\n${properties}\nfragmentShader:Qt.resolvedUrl('light-field.frag.qsb')\n}\n`,
);
const qsb = path.join(
  values['qt-bin'] || path.join(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin'),
  'qsb',
);
execFileSync(qsb, [
  '--glsl',
  '100 es,120,150',
  '--hlsl',
  '50',
  '--msl',
  '12',
  '-o',
  own('light-field.frag.qsb'),
  own('light-field.frag'),
]);
// Data only: do not ship the React package or import executable icon components.
const lucideRoot = path.join(reference, 'node_modules/lucide-react/dist/esm');
const dynamic = await source(path.join(lucideRoot, 'dynamicIconImports.mjs'));
const iconCache = new Map();
function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNumericLiteral(node))
    return ts.isNumericLiteral(node) ? Number(node.text) : node.text;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  if (ts.isObjectLiteralExpression(node)) {
    const result = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) throw new Error('Nonliteral Lucide property');
      Object.defineProperty(result, property.name.text, {
        value: literal(property.initializer),
        enumerable: true,
      });
    }
    return result;
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken)
    return -literal(node.operand);
  throw new Error('Nonliteral Lucide node');
}
async function iconData(file) {
  if (iconCache.has(file)) return iconCache.get(file);
  const text = await source(file),
    tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  let found = null;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.text === '__iconData')
      found = literal(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  if (!found) {
    const alias = /export\s*{\s*default\s*}\s*from\s*['"]([^'"]+)['"]/.exec(text);
    if (!alias) throw new Error('Unknown Lucide icon shape ' + file);
    found = await iconData(path.resolve(path.dirname(file), alias[1]));
  }
  if (!Array.isArray(found.node)) throw new Error('Invalid Lucide node data');
  iconCache.set(file, found);
  return found;
}
const nodes = {};
for (const match of dynamic.matchAll(/"([^"]+)": \(\) => import\('([^']+)'\)/g))
  nodes[match[1]] = (await iconData(path.resolve(lucideRoot, match[2]))).node;
await emit(
  own('icon-nodes.mjs'),
  'export const nodes=' + JSON.stringify(nodes) + ';',
  '// Lucide1.48.0 ISC data only. See LUCIDE-LICENSE.txt.\n',
);
await writeFile(
  own('sources.json'),
  JSON.stringify(
    {
      revision,
      unicode: '17.0.0',
      pretext: '0.0.9 (Monet portable module)',
      lucide: '1.48.0',
      lucideDataKeys: Object.keys(nodes).length,
      compatibility: [
        'ES2016 library calls via scoped helpers',
        'Qt Unicode17 EGC/properties',
        'native ICU word pieces',
        'UPRIGHT original explicit ranges, no Unicode extension broadening',
        'DPR neutral-offset inputs replaced by zero; identical subtraction is always zero',
      ],
      sha256,
    },
    null,
    2,
  ) + '\n',
);
console.log('Generated Lucide vector node data:', Object.keys(nodes).length);
// Original bloom fragments; the Pixi filter globals become typed QML uniforms.
const bloomSource = await source(path.join(sourceRoot, 'light/bloomFilter.ts'));
for (const name of ['down', 'up', 'combine']) {
  let code = new RegExp('const ' + name + 'Fragment = `([\\s\\S]*?)`;').exec(bloomSource)[1];
  code = code
    .replace(
      /in vec2 vTextureCoord;|out vec4 finalColor;|uniform sampler2D (uTexture|uAdd);|uniform vec4 (\w+);[^\n]*/g,
      '',
    )
    .replaceAll('finalColor', 'fragColor');
  const uniforms =
    'mat4 qt_Matrix;float qt_Opacity;vec2 uUvScale;vec4 uInputPixel;vec4 uInputClamp;vec4 uParams;vec4 uAddMap;vec4 uAddClamp;vec4 uTint;';
  code = code.replace(/\n}\s*$/, '\nfragColor*=qt_Opacity;\n}\n');
  const header =
    '#version 440\n// Folia a8da4437 AGPL-3.0-only: original bloom formula.\nlayout(location=0) in vec2 qt_TexCoord0;\nlayout(location=0) out vec4 fragColor;\nlayout(std140,binding=0) uniform buf{' +
    uniforms +
    '};\nlayout(binding=1) uniform sampler2D uTexture;\nlayout(binding=2) uniform sampler2D uAdd;\n#define vTextureCoord (qt_TexCoord0*uUvScale)\n';
  const file = own('bloom-' + name + '.frag');
  await writeFile(file, header + code);
  execFileSync(qsb, [
    '--glsl',
    '100 es,120,150',
    '--hlsl',
    '50',
    '--msl',
    '12',
    '-o',
    file + '.qsb',
    file,
  ]);
}
execFileSync(path.join(path.dirname(qsb), 'qmlformat'), ['-i', own('LightField.qml')]);
await writeFile(
  own('texture-slice.frag'),
  `#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf{mat4 qt_Matrix;float qt_Opacity;vec4 uUvRect;vec3 uTint;};
layout(binding=1) uniform sampler2D source;
void main(){fragColor=texture(source,uUvRect.xy+qt_TexCoord0*uUvRect.zw)*vec4(uTint,1.0)*qt_Opacity;}
`,
);
execFileSync(qsb, [
  '--glsl',
  '100 es,120,150',
  '--hlsl',
  '50',
  '--msl',
  '12',
  '-o',
  own('texture-slice.frag.qsb'),
  own('texture-slice.frag'),
]);
// The three original Pixi Canvas text paint methods used by Lumiere credit labels.
const paintSource = await source(
  path.join(reference, 'node_modules/pixi.js/lib/scene/text/canvas/CanvasTextGenerator.mjs'),
);
const paintTree = ts.createSourceFile(
    'CanvasTextGenerator.mjs',
    paintSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  ),
  paintMethods = [];
function paintVisit(node) {
  if (
    ts.isMethodDeclaration(node) &&
    ['_renderTextToCanvas', '_drawLetterSpacing', '_getAlignmentOffset'].includes(node.name.text)
  )
    paintMethods.push(node.getText(paintTree));
  ts.forEachChild(node, paintVisit);
}
paintVisit(paintTree);
if (paintMethods.length !== 3) throw new Error('Pixi original text paint methods changed');
const fontSource = await source(
  path.join(
    reference,
    'node_modules/pixi.js/lib/scene/text/canvas/utils/fontStringFromTextStyle.mjs',
  ),
);
await emit(
  own('pixi-text-paint.mjs'),
  `import {graphemeSegments} from '../../shared/text/unicode.mjs';
import {color} from '../sonnet/scene-graph.mjs';
${fontSource.replace(/export \{ fontStringFromTextStyle \};/, '')}
const CanvasTextMetrics={experimentalLetterSpacingSupported:false,experimentalLetterSpacing:false,graphemeSegmenter:text=>graphemeSegments(text).map(value=>value.segment)};
function countSpaces(text){let count=0;for(let i=0;i<text.length;i++)if(text.charCodeAt(i)===32)count++;return count;}
class SourceTextPainter {${paintMethods.join('\n')}
_setFillAndStrokeStyles(context,style){if(style.dropShadow||style._stroke||style._fill&&style._fill.fill)throw new Error('Unsupported Lumiere credit text paint');context.fillStyle=color(style.fill);}
}
export const sourceTextPainter=new SourceTextPainter();
`,
  '// Pixi8.21.0 MIT source methods. See Sonnet/PIXI-TEXT-LICENSE.txt.\n',
);

// Pure readiness decisions remain the original source; React's scheduling is hosted by QML.
const handoverFile = path.join(reference, 'src/components/visualizer/songHandover.ts');
let handover = await source(handoverFile);
handover = handover.slice(0, handover.indexOf('export const useVisualizerSongCommit ='));
handover = handover.replace(/^import .*;\n/gm, '');
// QV4 6.12 misbinds a second object-pattern parameter; TS lowers binding syntax only.
const loweredHandover = ts.transpileModule(handover, {
  compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ESNext },
}).outputText;
await emit(own('source/songHandover.mjs'), loweredHandover);
// Persist hashes after every extracted source, including Pixi's text painter.
await writeFile(
  own('sources.json'),
  JSON.stringify(
    {
      revision,
      unicode: '17.0.0',
      pretext: '0.0.9 (Monet portable module)',
      lucide: '1.48.0',
      lucideDataKeys: Object.keys(nodes).length,
      compatibility: [
        'ES2016 library calls via scoped helpers',
        'Qt Unicode17 EGC/properties',
        'native ICU word pieces',
        'UPRIGHT original explicit ranges, no Unicode extension broadening',
        'DPR neutral-offset inputs replaced by zero; identical subtraction is always zero',
        'original runtime class with data-only app/environment adapters',
      ],
      sha256,
    },
    null,
    2,
  ) + '\n',
);

// The source scene waits for completed text textures before publishing leaves.
// Prime the immutable full-resolution capture with one transparent QSG pixel.
await writeFile(
  own('glyph-prime.frag'),
  '#version 440\n// A preparation-only consumer. The original full-resolution capture stays unchanged.\nlayout(location=0) in vec2 qt_TexCoord0;\nlayout(location=0) out vec4 fragColor;\nlayout(std140,binding=0) uniform buf{mat4 qt_Matrix;float qt_Opacity;float outputAlpha;};\nlayout(binding=1) uniform sampler2D source;\nvoid main(){fragColor=texture(source,qt_TexCoord0)*outputAlpha*qt_Opacity;}\n',
);
execFileSync(qsb, [
  '--glsl',
  '100 es,120,150',
  '--hlsl',
  '50',
  '--msl',
  '12',
  '-o',
  own('glyph-prime.frag.qsb'),
  own('glyph-prime.frag'),
]);
