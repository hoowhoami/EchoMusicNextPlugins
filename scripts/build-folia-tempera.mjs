import { resolveFoliaReference } from './folia-reference.mjs';
// Pinned source translation; native layout, shape and clock adapters remain explicit seams.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { transform, build } from 'esbuild';
import ts from 'typescript';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({ options: { reference: { type: 'string' } } });
const reference = await resolveFoliaReference(values.reference);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
if (process.versions.unicode !== '17.0') throw Error('Build with Node24/Unicode17');
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/tempera');
await mkdir(output, { recursive: true });
const config = await resolveConfig(path.join(output, 'kernel.mjs')),
  sha256 = {};
async function source(file) {
  const value = await readFile(path.join(reference, file), 'utf8');
  sha256[file] = createHash('sha256').update(value).digest('hex');
  return value;
}
async function atomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = file + '.tempera-tmp';
  await writeFile(temp, value);
  await rename(temp, file);
}
function collections(code, sub) {
  const used = new Set();
  const tree = ts.createSourceFile('source.ts', code, ts.ScriptTarget.Latest, true);
  const result = ts.transform(tree, [
    (context) => {
      const visit = (node) => {
        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ['flatMap', 'flat', 'at'].includes(node.expression.name.text)
        ) {
          const name = node.expression.name.text;
          used.add(name);
          return context.factory.createCallExpression(
            context.factory.createIdentifier(name),
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
  const value = ts.createPrinter().printFile(result.transformed[0]);
  result.dispose();
  return (
    (used.size ? `import {${[...used].join(',')}} from '${sub ? '../' : './'}compat.mjs';\n` : '') +
    value
  );
}
async function emit(file, code) {
  const js = await transform(collections(code, file.includes('/')), {
    loader: 'ts',
    target: 'es2016',
    format: 'esm',
    legalComments: 'none',
  });
  await atomic(
    path.join(output, file),
    await format(
      '// Derived from Folia a8da4437 (AGPL-3.0-only); see tempera-reference.md.\n' + js.code,
      { ...config, parser: 'babel' },
    ),
  );
}
const prefix = 'src/components/visualizer/tempera/';
for (const folder of ['', 'compositions/'])
  for (const file of await readdir(path.join(reference, prefix, folder))) {
    if (!file.endsWith('.ts') || (!file.startsWith('tempera') && file !== 'types.ts')) continue;
    let code = await source(prefix + folder + file);
    code = code
      .replaceAll("from '../../../utils/lyrics/renderHints'", "from '../../shared/renderHints.mjs'")
      .replaceAll(
        "from '../../../utils/lyrics/graphemeTiming'",
        "from '../../shared/text/graphemeTiming.mjs'",
      )
      .replaceAll(
        "from '../../../utils/lyrics/wordSegmentation'",
        "from '../../shared/text/wordSegmentation.mjs'",
      )
      .replaceAll("from '../../../utils/fontStacks'", "from './font-stacks.mjs'")
      .replaceAll("from '../visualizerSeedHash'", "from './seed-hash.mjs'")
      .replaceAll("from '../colorMix'", "from '../cadenza/color.mjs'")
      .replaceAll("from '../wordColoring'", "from './word-colors.mjs'")
      .replaceAll("from '../pixi/pixiDisplayResources'", "from './display-resources.mjs'")
      .replaceAll("from '../pixiFilterVertex'", "from './filter-vertex.mjs'")
      .replaceAll("from '../sonnet/sonnetPostProcess'", "from '../sonnet/sonnetPostProcess.mjs'")
      .replaceAll("from '@chenglou/pretext'", "from './pretext.mjs'");
    code = code.replace(
      /from '(\.{1,2}\/[^']+)'/g,
      (_, rel) => `from '${rel.endsWith('.mjs') ? rel : rel + '.mjs'}'`,
    );
    if (file === 'temperaProgram.ts') {
      code =
        "import {isPunctuationOnly, isSingleHan} from './unicode.mjs';import {codePoints} from '../../shared/text/codepoints.mjs';\n" +
        code
          .replace(
            'const PUNCTUATION_ONLY = /^[\\s\\p{P}\\p{S}]+$/u;',
            'const PUNCTUATION_ONLY = {test:isPunctuationOnly};',
          )
          .replace(
            'const SINGLE_HAN = /^\\p{Script=Han}$/u;',
            'const SINGLE_HAN = {test:isSingleHan};',
          )
          .replaceAll('Array.from(pool)', 'codePoints(pool)');
      code = code.replace(
        'const compiled = lines.map((line, sourceIndex) => ({\n        sourceIndex,',
        'const compiled = lines.map((line, sourceIndex) => ({\n        sourceIndex: Number.isInteger(line.sourceIndex) ? line.sourceIndex : sourceIndex,',
      );
    }
    if (file === 'temperaShapes.ts') {
      const start = code.indexOf('const createGradientFill ='),
        end = code.indexOf('\n};', start) + 3;
      if (start < 0 || end < start) throw Error('Missing gradient constructor seam');
      const declaration = code.slice(start, end);
      code = code.slice(0, start) + code.slice(end);
      const before = code.indexOf('const buildGradientFill =');
      code = code.slice(0, before) + declaration + '\n' + code.slice(before);
    }
    if (file === 'temperaSceneFilters.ts') {
      const start = code.indexOf('const compressedPassResolution ='),
        end = code.indexOf(';', start) + 1;
      if (start < 0 || end < start) throw Error('Missing compressed pass helper seam');
      const declaration = code.slice(start, end);
      code = code.slice(0, start) + code.slice(end);
      const before = code.indexOf('export const resolveTemperaPassResolution');
      code = code.slice(0, before) + declaration + '\n' + code.slice(before);
    }
    if (file === 'temperaMeasure.ts')
      code += '\nexport const clearLayoutMeasurements=()=>measureCache.clear();';
    await emit(folder + file.replace(/\.ts$/, '.mjs'), code);
  }
for (const [file, name] of [
  ['src/components/visualizer/visualizerSeedHash.ts', 'seed-hash.mjs'],
  ['src/utils/fontStacks.ts', 'font-stacks.mjs'],
  ['src/components/visualizer/wordColoring.ts', 'word-colors.mjs'],
  ['src/components/visualizer/pixi/pixiDisplayResources.ts', 'display-resources.mjs'],
  ['src/components/visualizer/pixiFilterVertex.ts', 'filter-vertex.mjs'],
  ['src/components/visualizer/pixi/pixiTextureBudget.ts', 'texture-budget.mjs'],
])
  await emit(name, await source(file));
const types = await source('src/types.ts');
const declarations = [];
for (const name of [
  'DEFAULT_TEMPERA_TUNING',
  'DEFAULT_TEMPERA_LAYER_IMAGE',
  'TEMPERA_MAX_LAYER_IMAGES',
]) {
  const match = types.match(new RegExp('export const ' + name + '[^=]*= ([\\s\\S]*?)(?:;\\n)'));
  if (!match) throw Error('Missing ' + name);
  declarations.push('export const ' + name + '=' + match[1] + ';');
}
const tuning = await source(prefix + 'tuning.ts');
await emit(
  'kernel.mjs',
  [
    "export * from './types.mjs';export * from './temperaProgram.mjs';export * from './temperaShotProfiles.mjs';export * from './temperaCompositions.mjs';export * from './temperaMotion.mjs';export * from './temperaTransitions.mjs';export * from './temperaCamera.mjs';export * from './temperaPalette.mjs';export * from './temperaLayout.mjs';export * from './temperaImageLayer.mjs';export * from './temperaCreditsLayer.mjs';export * from './texture-budget.mjs';",
    ...declarations,
    "const numberWithin=(value,fallback,min,max)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;",
    tuning.slice(tuning.indexOf('const switchOr ='), tuning.indexOf('\nexport default')),
    "export function tuning(settings={}){const input={};for(const key of Object.keys(DEFAULT_TEMPERA_TUNING))input[key]=settings['tempera'+key[0].toUpperCase()+key.slice(1)];return resolveStoredTemperaTuning(input);}",
  ].join('\n'),
);
const pendoloPretext = await readFile(
  path.join(root, 'plugins/folia-lyrics-skin/qml/styles/pendolo/pretext.mjs'),
  'utf8',
);
sha256['port:pendolo/pretext.mjs'] = createHash('sha256').update(pendoloPretext).digest('hex');
// Tempera's existing isolated bundle retains the original declaration order.
// Cadenza/Pendolo move these independent literal sets for their QML binding
// transport. Restore Tempera's established order without changing any values.
let pretext = pendoloPretext;
const sets = {};
for (const name of ['kinsokuStart', 'leftStickyPunctuation']) {
  const start = pretext.indexOf('var ' + name + ' =');
  const end = pretext.indexOf('\n]);', start) + 5;
  if (start < 0 || end < start) throw new Error('Missing Tempera pretext literal set: ' + name);
  sets[name] = pretext.slice(start, end);
  pretext = pretext.slice(0, start) + pretext.slice(end);
}
if (!pretext.includes('var kinsokuEnd =') || !/var forwardStickyGlue = [^\n]+\n/.test(pretext))
  throw new Error('Missing Tempera pretext declaration-order seam');
pretext = pretext
  .replace('var kinsokuEnd =', sets.kinsokuStart + '\nvar kinsokuEnd =')
  .replace(/var forwardStickyGlue = [^\n]+\n/, (line) => line + sets.leftStickyPunctuation + '\n')
  .replace(
    /\n(?:[ \t]*\n)+(?=var (?:keepAllGlueChars|kinsokuEnd|arabicNoSpaceTrailingPunctuation) =)/g,
    '\n',
  );
await atomic(
  path.join(output, 'pretext.mjs'),
  await format(pretext, { ...config, parser: 'babel' }),
);
await atomic(
  path.join(output, 'PRETEXT-LICENSE.txt'),
  await readFile(path.join(reference, 'node_modules/@chenglou/pretext/LICENSE')),
);
for (const file of [
  'VisualizerTempera.tsx',
  'createTemperaPixiRuntime.ts',
  'README.md',
  'TemperaSettingsPanel.tsx',
  'TemperaSettingsControls.tsx',
  'TemperaImageImportMenu.tsx',
  'TemperaImagePlacementEditor.tsx',
  'temperaImageTextures.ts',
  'entry.tsx',
])
  await source(prefix + file);

console.log('Generated full pinned Tempera source kernels and 13/121 composition families.');
const oracle = await build({
  stdin: {
    contents: [
      'types',
      'temperaProgram',
      'temperaShotProfiles',
      'temperaMotion',
      'temperaTransitions',
      'temperaCamera',
      'temperaPalette',
      'temperaImageLayer',
      'temperaCompositions',
    ]
      .map((name) => `export * from './${prefix + name}.ts';`)
      .join('\n'),
    resolveDir: reference,
  },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  target: 'es2016',
  minify: true,
  legalComments: 'none',
  logLevel: 'silent',
});
const testFile = path.join(root, 'tests/folia-tempera.test.mjs'),
  testCode = await readFile(testFile, 'utf8'),
  a = '// BEGIN Folia Tempera source oracle (generated)',
  b = '// END Folia Tempera source oracle';
if (!testCode.includes(a) || !testCode.includes(b)) throw Error('Missing oracle markers');
await atomic(
  testFile,
  await format(
    testCode.slice(0, testCode.indexOf(a)) +
      a +
      '\nconst sourceOracleCode=' +
      JSON.stringify(oracle.outputFiles[0].text) +
      ';\n' +
      b +
      testCode.slice(testCode.indexOf(b) + b.length),
    { ...(await resolveConfig(testFile)), parser: 'babel' },
  ),
);
await emit('scene-cache.mjs', await source('src/components/visualizer/pixiSceneCache.ts'));
const runtimeSource = await source(prefix + 'createTemperaPixiRuntime.ts');
const frameStart = runtimeSource.indexOf('    private renderFrame = () => {'),
  frameEnd = runtimeSource.indexOf('\n    };', frameStart);
if (frameStart < 0 || frameEnd < frameStart)
  throw Error('Missing original absolute-time frame seam');
let frame = runtimeSource
  .slice(frameStart, frameEnd + '\n    };'.length)
  .replace('    private renderFrame = () => {', 'frame(time) {')
  .replace('        const time = this.options.currentTime.get();', '')
  .replace('        this.songSwap.advance();', '')
  .replace('!this.songSwap.active', 'true')
  .replace('this.options.host.clientWidth', 'this.lastWidth')
  .replace('this.options.host.clientHeight', 'this.lastHeight')
  .replace(/\n    };$/, '\n}');
await emit(
  'native-frame.mjs',
  [
    "import {findTemperaParagraphIndexAtTime} from './temperaProgram.mjs';",
    "import {resolveTemperaCreditsFrame} from './temperaCreditsLayer.mjs';",
    "import {setPixiDisplayTreeVisibility} from './display-resources.mjs';",
    "import {resolveTemperaSceneTransitionFrame,findTemperaActiveShotIndex} from './temperaSceneFrame.mjs';",
    "import {resolveTemperaShotExit,updateTemperaShot} from './temperaShotFrame.mjs';",
    "import {setTemperaTransitionBlur} from './temperaSceneFilters.mjs';",
    frame.replace('frame(time) {', 'export function renderSourceFrame(time) {'),
  ].join('\n'),
);
// Difference keeps the original shader functions; only texture-coordinate carrier and prefix blend change.
const diffCapture = {
  UniformGroup: class {
    constructor(input) {
      this.uniforms = input;
    }
  },
  Filter: class {
    constructor(input) {
      Object.assign(this, input);
    }
  },
  GlProgram: { from: (input) => input },
  Texture: { EMPTY: {} },
};
const { createTemperaDifferenceFilter } = await import(
  new URL(
    '../plugins/folia-lyrics-skin/qml/styles/tempera/temperaDifferenceFilter.mjs',
    import.meta.url,
  )
);
const qsb =
  process.env.FOLIA_QT_BIN ||
  path.resolve(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin');
const uniformBlock = `layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec4 uInputSize;vec4 uOutputFrame;vec3 uInkColor;vec3 uPaperColor;float uInkLuminance;float uPaperLuminance;float uBias;vec3 uTintA;vec3 uTintB;vec3 uTintC;vec3 uTintD;float uTintAmount;};layout(binding=1)uniform sampler2D source;layout(binding=2)uniform sampler2D backdrop;\n#define uTexture source\n#define uBackTexture backdrop\n#define vTextureCoord qt_TexCoord0\n`;
for (const [name, inversion] of [
  ['difference', true],
  ['tint', false],
]) {
  let body = createTemperaDifferenceFilter(diffCapture, {
    ink: '#ffffff',
    paper: '#000000',
    inversion,
  }).glProgram.fragment;
  body = body
    .replace(/(?:in vec2 vTextureCoord;|out vec4 finalColor;|uniform [^;]+;)/g, '')
    .replace(
      'uv.x * uInputSize.x / max(uOutputFrame.z, 1.0)',
      '(uv.x * uInputSize.x-uOutputFrame.x) / max(uOutputFrame.z, 1.0)',
    );
  body = body.replace(
    /\n}\s*$/,
    '\nvec4 back=texture(backdrop,qt_TexCoord0);finalColor=(finalColor+back*(1.0-finalColor.a))*qt_Opacity;\n}',
  );
  const file = path.join(output, name + '.frag');
  await atomic(
    file,
    '#version 440\nlayout(location=0)in vec2 qt_TexCoord0;layout(location=0)out vec4 finalColor;\n' +
      uniformBlock +
      body,
  );
  execFileSync(
    path.join(qsb, 'qsb'),
    ['--glsl', '150,300es', '--hlsl', '50', '--msl', '12', '-o', file + '.qsb.tempera-tmp', file],
    { stdio: 'inherit' },
  );
  await rename(file + '.qsb.tempera-tmp', file + '.qsb');
}
const textureFile = path.join(output, 'texture.frag');
await atomic(
  textureFile,
  '#version 440\nlayout(location=0)in vec2 qt_TexCoord0;layout(location=0)out vec4 fragColor;layout(std140,binding=0)uniform buf{mat4 qt_Matrix;float qt_Opacity;vec2 uvScale;vec2 uvOffset;};layout(binding=1)uniform sampler2D source;void main(){fragColor=texture(source,qt_TexCoord0*uvScale+uvOffset)*qt_Opacity;}',
);
execFileSync(
  path.join(qsb, 'qsb'),
  [
    '--glsl',
    '150,300es',
    '--hlsl',
    '50',
    '--msl',
    '12',
    '-o',
    textureFile + '.qsb.tempera-tmp',
    textureFile,
  ],
  { stdio: 'inherit' },
);
await rename(textureFile + '.qsb.tempera-tmp', textureFile + '.qsb');

await atomic(
  path.join(output, 'sources.json'),
  JSON.stringify({ revision, unicode: '17.0.0', pretext: '0.0.9', sha256 }, null, 2) + '\n',
);
