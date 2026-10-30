import { resolveFoliaReference } from './folia-reference.mjs';
// Build-time source extraction only: no runtime dependency or host mutation.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { deflateSync } from 'node:zlib';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { transform, build } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  { values } = parseArgs({
    options: {
      reference: { type: 'string' },
      'qt-bin': { type: 'string' },
      'chrome-oracle': { type: 'boolean' },
      chrome: { type: 'string' },
    },
  }),
  reference = await resolveFoliaReference(values.reference),
  revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82',
  output = path.join(root, 'plugins/folia-lyrics-skin/qml/backgrounds/monet');
const require = createRequire(import.meta.url);
const compilerLicense = await readFile(
  path.join(path.dirname(require.resolve('typescript/package.json')), 'LICENSE.txt'),
);
await mkdir(output, { recursive: true });
await writeFile(path.join(output, 'LICENSE.TypeScript.txt'), compilerLicense);
const formatting = await resolveConfig(path.join(output, 'api.mjs')),
  sha256 = {};
async function source(name) {
  const text = await readFile(path.join(reference, name), 'utf8');
  sha256[name] = createHash('sha256').update(text).digest('hex');
  return text;
}
function variable(text, name) {
  const tree = ts.createSourceFile(
      'source.ts',
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    statement = tree.statements.find(
      (node) =>
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.some((value) => value.name.getText(tree) === name),
    );
  if (!statement) throw new Error('Missing source declaration ' + name);
  return statement.getText(tree);
}
async function emit(name, text) {
  const result = await transform(text, {
    loader: 'ts',
    format: 'esm',
    target: 'es2016',
    legalComments: 'none',
  });
  await writeFile(
    path.join(output, name),
    await format(
      '// Folia a8da4437 AGPL-3.0-only. See docs/folia/monet-background-reference.md.\n' +
        result.code,
      { ...formatting, parser: 'babel' },
    ),
  );
}
const types = await source('src/types.ts'),
  tuning = await source('src/components/visualizer/backgrounds/monet/tuning.ts'),
  pipeline = await source('src/components/visualizer/monet/monetBackgroundPipeline.ts'),
  layer = await source('src/components/visualizer/backgrounds/monet/MonetBackgroundLayer.tsx'),
  card = await source(
    'src/components/visualizer/backgrounds/monet/MonetBackgroundSettingsCard.tsx',
  );
const sliders = {},
  cardTree = ts.createSourceFile('card.tsx', card, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function collectSlider(node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(cardTree) === 'SliderRow') {
    const attributes = new Map(
      node.attributes.properties
        .filter(ts.isJsxAttribute)
        .map((attribute) => [attribute.name.getText(cardTree), attribute.initializer]),
    );
    const value = attributes.get('value').expression;
    if (
      !ts.isPropertyAccessExpression(value) ||
      value.expression.getText(cardTree) !== 'resolvedTuning'
    )
      throw new Error('Unexpected source slider binding');
    sliders[value.name.text] = Object.fromEntries(
      ['min', 'max', 'step'].map((name) => [
        name,
        Number(attributes.get(name).expression.getText(cardTree)),
      ]),
    );
  }
  ts.forEachChild(node, collectSlider);
}
collectSlider(cardTree);
if (Object.keys(sliders).length !== 7) throw new Error('Original Monet slider set changed');
await emit(
  'controls.mjs',
  'export const MONET_BACKGROUND_SLIDERS = ' + JSON.stringify(sliders) + ';',
);
await emit('defaults.mjs', variable(types, 'DEFAULT_MONET_BACKGROUND_TUNING'));
await emit(
  'source-tuning.mjs',
  "import {DEFAULT_MONET_BACKGROUND_TUNING} from './defaults.mjs';\n" +
    tuning.slice(
      tuning.indexOf('const backgroundSource ='),
      tuning.indexOf('export default defineBackgroundTuning'),
    ),
);
await emit(
  'source-drift.mjs',
  await source('src/components/visualizer/backgrounds/monet/monetBackgroundDrift.ts'),
);
let paint = await source('src/components/visualizer/monet/monetBackgroundPaint.ts');
paint = paint
  .replace("'../colorMix'", "'../../styles/cadenza/color.mjs'")
  .replace(/import type[^;]+;\n/, '');
paint += '\nexport {applyBackgroundPostProcessing};';
await emit('source-paint.mjs', paint);
await emit(
  'source-pipeline.mjs',
  variable(pipeline, 'resolveSourceUrl') + '\n' + variable(pipeline, 'getMonetBackgroundCacheKey'),
);
await emit('source-layer.mjs', variable(layer, 'resolveMonetSourceUrl'));
// Original async decode/cache/serial paint queue; DOM endpoints are injected, never faked.
let runtimePipeline = pipeline
  .replace(/^import type[^;]+;\s*/gm, '')
  .replaceAll('import.meta.env.DEV', 'false')
  .replace(
    'if (isCanvasFilterSupportedCached !== null) {',
    "if(typeof environment.filterSupported==='boolean')return environment.filterSupported;\nif (isCanvasFilterSupportedCached !== null) {",
  )
  .replace(
    "new URL('./monetBackground.worker.ts', import.meta.url)",
    "environment.workerUrl || 'monet-background-worker'",
  )
  .replace(/export (const|let|function|class) /g, '$1 ');
runtimePipeline = runtimePipeline
  .replace('const ensurePainter = (): Worker => {', 'function ensurePainter(): Worker {')
  .replace('return worker;\n};', 'return worker;\n}');
runtimePipeline = runtimePipeline.replace(
  'queuedPaints.push({ request, wanted, settle });',
  'if(released){request.image.close();settle(undefined);return;}\nqueuedPaints.push({ request, wanted, settle });',
);
const pipelineFactory = `export function createMonetPipeline(environment,limits={}){
const {Image,createImageBitmap,Worker,URL,document}=environment;
let released=false;
${runtimePipeline}
const maxEntries=Number.isInteger(limits.maxEntries)?Math.max(1,Math.min(32,limits.maxEntries)):16;
function prune(target){monetBackgroundCache.forEach((entry,key)=>{if(monetBackgroundCache.size>target&&entry.holders===0){monetBackgroundCache.delete(key);entry.url.then(url=>{if(url)URL.revokeObjectURL(url);});}});}
return {
 getMonetBackgroundCacheKey,checkCanvasFilterSupport,
 get cacheEntries(){return monetBackgroundCache.size;},
 wantMonetBackgroundUrl(options){
  if(released)throw new Error('Monet image pipeline is released');
  const key=getMonetBackgroundCacheKey(options);
  if(!monetBackgroundCache.has(key)){prune(maxEntries-1);if(monetBackgroundCache.size>=maxEntries)throw new Error('Monet picture lease budget exceeded');}
  const lease=wantMonetBackgroundUrl(options);
  return {url:lease.url,release(){lease.release();prune(maxEntries);}};
 },
 dispose(){
  if(released)return;released=true;
  if(painter){painter.onmessage=null;painter.onerror=null;painter.terminate();}painter=null;
  if(painting){painting.request.image.close();painting.settle(null);painting=null;}
  for(const job of queuedPaints){job.request.image.close();job.settle(undefined);}queuedPaints.length=0;
  for(const entry of monetBackgroundCache.values())entry.url.then(url=>{if(url)URL.revokeObjectURL(url);});monetBackgroundCache.clear();
 }
};
}`;
// QV4 can retain this async state across messages; lower async/generator syntax through TS.
const lowered = ts.transpileModule(pipelineFactory, {
  compilerOptions: {
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.ESNext,
    downlevelIteration: true,
  },
}).outputText;
const helperTree = ts.createSourceFile(
  'pipeline.js',
  lowered,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
const ordered = ts.transform(helperTree, [
  (context) =>
    function visit(node) {
      node = ts.visitEachChild(node, visit, context);
      if (ts.isVariableStatement(node)) {
        const declarations = Array.from(node.declarationList.declarations);
        if (declarations.map((value) => value.name.getText(helperTree)).join(',') === '_,f,y,t,g')
          return ts.factory.updateVariableStatement(
            node,
            node.modifiers,
            ts.factory.updateVariableDeclarationList(node.declarationList, [
              declarations[3],
              ...declarations.slice(0, 3),
              declarations[4],
            ]),
          );
      }
      return node;
    },
]);
await emit('pipeline.mjs', ts.createPrinter().printFile(ordered.transformed[0]));
ordered.dispose();

await emit(
  'api.mjs',
  "export * from './defaults.mjs';export * from './source-tuning.mjs';export * from './source-drift.mjs';export * from './source-paint.mjs';export * from './source-pipeline.mjs';export * from './source-layer.mjs';export * from './pipeline.mjs';export * from './layer-state.mjs';export * from './drift.mjs';export * from './controls.mjs';export * from './presentation.mjs';export * from './gpu-plan.mjs';export * from './native-environment.mjs';",
);
await source('src/components/visualizer/monet/monetBackground.worker.ts');
await source('src/components/visualizer/backgrounds/monet/MonetBackgroundSettingsCard.tsx');
await writeFile(
  path.join(output, 'sources.json'),
  JSON.stringify(
    {
      revision,
      width: 1920,
      height: 1080,
      jpegQuality: 0.92,
      driftFrames: 157,
      driftDurationMs: 240000,
      pipelineDebounceMs: 180,
      transitionMs: 800,
      thirdParty: {
        typescript: {
          version: ts.version,
          license: 'Apache-2.0',
          file: 'LICENSE.TypeScript.txt',
          sha256: createHash('sha256').update(compilerLicense).digest('hex'),
        },
      },
      sha256,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Generated original Monet background painter, 157-keyframe drift, settings and image identity. Typed native pipeline and four static GPU shader programs are separate QML endpoints.',
);

const qsb = path.join(
  values['qt-bin'] || path.join(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin'),
  'qsb',
);
for (const name of ['cover-blur', 'color-overlay', 'scene-gradient', 'picture'])
  execFileSync(qsb, [
    '--glsl',
    '100 es,120,150',
    '--hlsl',
    '50',
    '--msl',
    '12',
    '-o',
    path.join(output, name + '.frag.qsb'),
    path.join(output, name + '.frag'),
  ]);

// Optional reproducible source Canvas + actual JSX/Chrome references, outside the package.
if (values['chrome-oracle']) {
  const directory = path.join(root, 'build/folia-monet-background-oracle');
  await mkdir(directory, { recursive: true });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const name = Buffer.from(type),
      size = Buffer.alloc(4),
      crc = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
    return Buffer.concat([size, name, data, crc]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(64);
  header.writeUInt32BE(48, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc(48 * (1 + 64 * 4));
  for (let y = 0; y < 48; y++)
    for (let x = 0; x < 64; x++) {
      const i = y * 257 + 1 + x * 4;
      pixels[i] = (x * 17 + y * 3) % 256;
      pixels[i + 1] = (x * 5 + y * 19) % 256;
      pixels[i + 2] = (x * 11 + y * 7) % 256;
      pixels[i + 3] = 255;
    }
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  await writeFile(path.join(directory, 'input.png'), png);
  const original = await build({
    stdin: {
      contents:
        "export * from './src/components/visualizer/monet/monetBackgroundPaint.ts';export {DEFAULT_MONET_BACKGROUND_TUNING} from './src/types.ts';",
      resolveDir: reference,
    },
    bundle: true,
    write: false,
    format: 'iife',
    globalName: 'Original',
  });
  await writeFile(path.join(directory, 'original.js'), original.outputFiles[0].text);
  const html = `<!doctype html><script src="original.js"></script><script>async function main(){const image=new Image();image.src='input.png';await image.decode();const result={};for(const sigma of [0,6,60]){const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;Original.paintMonetBackground(canvas.getContext('2d'),image,{backgroundColor:'#172331',primaryColor:'#f3e7d1',accentColor:'#93b9f1'},{...Original.DEFAULT_MONET_BACKGROUND_TUNING,backgroundBlurPx:sigma},sigma);result[sigma]=canvas.toDataURL('image/png').split(',')[1];}document.body.textContent=JSON.stringify(result);}addEventListener('load',main);</script><body></body>`;
  await writeFile(path.join(directory, 'reference.html'), html);
  const chrome = values.chrome || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const common = [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--allow-file-access-from-files',
    '--hide-scrollbars',
    '--user-data-dir=' + path.join(directory, 'chrome-profile'),
  ];
  const dom = execFileSync(
    chrome,
    [
      ...common,
      '--virtual-time-budget=10000',
      '--dump-dom',
      pathToFileURL(path.join(directory, 'reference.html')).href,
    ],
    {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const references = JSON.parse(/<body>([\s\S]*?)<\/body>/.exec(dom)[1]);
  for (const sigma of [0, 6, 60])
    await writeFile(
      path.join(directory, 'chrome-' + sigma + '.png'),
      Buffer.from(references[sigma], 'base64'),
    );
  execFileSync(
    process.execPath,
    [
      '--test',
      '--test-name-pattern=presentation geometry',
      'tests/folia-monet-background.test.mjs',
    ],
    {
      cwd: root,
      env: { ...process.env, FOLIA_WRITE_MONET_CSS_ORACLE: '1' },
      stdio: 'inherit',
      timeout: 30000,
    },
  );
  for (const [name, width] of [
    ['full', 640],
    ['half639', 639],
    ['half640', 640],
    ['half1024', 1024],
  ])
    execFileSync(
      chrome,
      [
        ...common,
        '--force-device-scale-factor=1',
        '--window-size=' + width + ',360',
        '--virtual-time-budget=2000',
        '--screenshot=' + path.join(directory, 'css-' + name + '.png'),
        pathToFileURL(path.join(directory, 'css-' + name + '.html')).href,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'], timeout: 30000 },
    );
  await writeFile(
    path.join(directory, 'reference.json'),
    JSON.stringify(
      {
        revision,
        chrome: execFileSync(chrome, ['--version'], { encoding: 'utf8' }).trim(),
        inputSha256: createHash('sha256').update(png).digest('hex'),
        width: 1920,
        height: 1080,
        sourceSigma: [0, 6, 60],
      },
      null,
      2,
    ) + '\n',
  );
  console.log('Actual source Canvas and JSX CSS Chrome references saved in ' + directory);
}
