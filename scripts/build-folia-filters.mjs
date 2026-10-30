import { resolveFoliaReference } from './folia-reference.mjs';
// Generate the exact pinned Folia/Pixi fragment bodies for the native scene filter chain.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { build } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const uniformBlock = `layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix; float qt_Opacity;
 vec4 uInputSize; vec4 uInputClamp; vec4 uOutputFrame;
 vec2 uUvScale; vec2 uFramePhysicalSize;
 float uFlipFragY; float uTargetPhysicalHeight; float uDistortion; float uDispersion;
 float uNoise; float uSeed; float uContrast; float uAlpha;
 float uAmount; float uStrength; vec2 uDirection;
};
layout(binding=1) uniform sampler2D source;
#define uTexture source
#define vTextureCoord (qt_TexCoord0*uUvScale)
vec2 sourceFragCoord(){float y=qt_TexCoord0.y*uFramePhysicalSize.y; return vec2(qt_TexCoord0.x*uFramePhysicalSize.x,mix(y,uTargetPhysicalHeight-y,uFlipFragY));}
`;
export async function buildFoliaFilters(options = {}) {
  const reference = await resolveFoliaReference(options.reference);
  const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/sonnet/filters'),
    sha256 = {};
  await mkdir(output, { recursive: true });
  const pixi = path.join(reference, 'node_modules/pixi.js'),
    pkg = JSON.parse(await readFile(path.join(pixi, 'package.json'), 'utf8'));
  if (pkg.version !== '8.21.0') throw new Error('Pinned Pixi 8.21.0 shader source required');
  async function read(relative) {
    const source = await readFile(path.join(reference, relative), 'utf8');
    sha256[relative] = createHash('sha256').update(source).digest('hex');
    return source;
  }
  async function atomic(file, data) {
    await writeFile(file + '.filter-tmp', data);
    await rename(file + '.filter-tmp', file);
  }
  function fragment(source, name) {
    const found = source.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
    if (!found) throw new Error('Missing source fragment ' + name);
    return found[1];
  }
  const prefix = 'src/components/visualizer/sonnet/',
    lens = await read(prefix + 'sonnetLensFilter.ts'),
    print = await read(prefix + 'sonnetPrintFilters.ts'),
    glitch = await read(prefix + 'sonnetGlitchFilter.ts');
  const sources = {
    lens: fragment(lens, 'fragment'),
    rgb: fragment(print, 'rgbShiftFragment'),
    halftone: fragment(print, 'halftoneFragment'),
    vignette: fragment(print, 'vignetteFragment'),
    glitch: fragment(glitch, 'fragment'),
  };
  const pixiPrefix = 'node_modules/pixi.js/lib/filters/defaults/';
  for (const [name, file] of [
    ['noise', 'noise/noise.frag.mjs'],
    ['contrast', 'color-matrix/colorMatrixFilter.frag.mjs'],
  ]) {
    await read(pixiPrefix + file);
    sources[name] = (
      await import(pathToFileURL(path.join(pixi, 'lib/filters/defaults', file)).href)
    ).default;
  }
  await read(pixiPrefix + 'color-matrix/ColorMatrixFilter.mjs');
  await read(pixiPrefix + 'blur/BlurFilterPass.mjs');
  await read(pixiPrefix + 'blur/const.mjs');
  await read('src/components/visualizer/sonnet/sonnetPostProcess.ts');
  await read('src/components/visualizer/pixiFilterVertex.ts');
  const { generateBlurFragSource } = await import(
    pathToFileURL(path.join(pixi, 'lib/filters/defaults/blur/gl/generateBlurFragSource.mjs')).href
  );
  for (const size of [5, 7, 9, 11, 13, 15]) {
    let body = generateBlurFragSource(size);
    body = body
      .replace('in vec2 vBlurTexCoords[' + size + '];', '')
      .replace(
        'void main(void)\n{',
        'void main(void)\n{\nvec2 vBlurTexCoords[' +
          size +
          '];\n' +
          Array.from(
            { length: size },
            (_, i) =>
              'vBlurTexCoords[' +
              i +
              ']=vTextureCoord+uDirection*' +
              (i - Math.floor(size / 2)).toFixed(1) +
              '*uStrength*uInputSize.zw;',
          ).join('\n'),
      );
    sources['blur' + size] = body;
  }
  const blendSource = await read(
    'node_modules/pixi.js/lib/rendering/renderers/gl/state/mapWebGLBlendModesToPixi.mjs',
  );
  if (
    !blendSource.includes(
      'blendMap.screen = [gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA]',
    )
  )
    throw new Error('Pixi premultiplied screen factors changed');
  const screen = `#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 uvScaleA;vec2 uvScaleB;vec2 uvOffsetA;vec2 uvOffsetB;float amountA;float amountB;};
layout(binding=1) uniform sampler2D sourceA;
layout(binding=2) uniform sampler2D sourceB;
void main(){vec4 a=texture(sourceA,qt_TexCoord0*uvScaleA+uvOffsetA)*amountA;vec4 b=texture(sourceB,qt_TexCoord0*uvScaleB+uvOffsetB)*amountB;fragColor=vec4(a.rgb+b.rgb-a.rgb*b.rgb,a.a+b.a-a.a*b.a)*qt_Opacity;}
`;
  const screenFile = path.join(output, 'screen.frag');
  await atomic(screenFile, screen);
  const qtScreen =
    options.qtBin ||
    process.env.FOLIA_QT_BIN ||
    path.resolve(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin');
  execFileSync(
    path.join(qtScreen, 'qsb'),
    [
      '--glsl',
      '150,300es',
      '--hlsl',
      '50',
      '--msl',
      '12',
      '-o',
      screenFile + '.qsb.filter-tmp',
      screenFile,
    ],
    { stdio: 'inherit' },
  );
  await rename(screenFile + '.qsb.filter-tmp', screenFile + '.qsb');
  sources.copy = 'void main(){finalColor=texture(uTexture,vTextureCoord);}';
  for (const [name, raw] of Object.entries(sources)) {
    let body = raw
      .replace(/^\s*(?:in|out)\s+(?:vec[234])\s+\w+\s*;\s*$/gm, '')
      .replace(/^\s*uniform\s+(?:highp\s+)?(?:\w+)\s+\w+(?:\[\d+\])?\s*;\s*$/gm, '')
      .replaceAll('gl_FragCoord.xy', 'sourceFragCoord()');
    if (name === 'contrast')
      body = body.replace(/uColorMatrix\[(\d+)\]/g, (_, index) =>
        [0, 6, 12].includes(Number(index))
          ? '(1.0+uContrast)'
          : [4, 9, 14].includes(Number(index))
            ? '(-0.5*uContrast)'
            : Number(index) === 18
              ? '1.0'
              : '0.0',
      );
    body = body.replace(/\bfinalColor\b/g, 'fragColor');
    const at = body.lastIndexOf('}');
    body = body.slice(0, at) + 'fragColor*=qt_Opacity;\n' + body.slice(at);
    const code =
      '#version 440\n// Derived from Folia a8da4437 / Pixi8.21 (AGPL-3.0-only / MIT).\nlayout(location=0) in vec2 qt_TexCoord0;\nlayout(location=0) out vec4 fragColor;\n' +
      uniformBlock +
      body;
    const file = path.join(output, name + '.frag');
    await atomic(file, code);
    const qt =
      options.qtBin ||
      process.env.FOLIA_QT_BIN ||
      path.resolve(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin');
    const temp = file + '.qsb.filter-tmp';
    execFileSync(
      path.join(qt, 'qsb'),
      ['--glsl', '150,300es', '--hlsl', '50', '--msl', '12', '-o', temp, file],
      { stdio: 'inherit' },
    );
    await rename(temp, file + '.qsb');
  }
  const blurClass = await read(pixiPrefix + 'blur/BlurFilterPass.mjs'),
    blurInitial = blurClass.match(/_calculateInitialStrength\(\) \{([\s\S]*?)\n  \}/);
  if (!blurInitial) throw new Error('Missing primary Pixi initial blur strength seam');
  const oracle = await build({
    stdin: {
      contents:
        "export {createSonnetPostProcessFilters} from './src/components/visualizer/sonnet/sonnetPostProcess.ts';\nexport function sourceBlurInitial(){" +
        blurInitial[1] +
        '\n}',
      resolveDir: reference,
    },
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    target: 'es2016',
    minify: true,
    legalComments: 'none',
    logLevel: 'silent',
  });
  const testFile = path.join(root, 'tests/folia-filters.test.mjs'),
    testCode = await readFile(testFile, 'utf8'),
    start = '// BEGIN Folia source filter oracle (generated)',
    end = '// END Folia source filter oracle';
  if (!testCode.includes(start) || !testCode.includes(end))
    throw new Error('Missing source filter oracle markers');
  const block =
    start + '\nconst sourceOracleCode=' + JSON.stringify(oracle.outputFiles[0].text) + ';\n' + end;
  await atomic(
    testFile,
    await format(
      testCode.slice(0, testCode.indexOf(start)) +
        block +
        testCode.slice(testCode.indexOf(end) + end.length),
      { ...(await resolveConfig(testFile)), parser: 'babel' },
    ),
  );
  // Registered screens are real in Pixi8.21 ViewSystem, despite older Folia POT-only comments.
  await read('node_modules/pixi.js/lib/rendering/renderers/shared/texture/TexturePool.mjs');
  await read(
    'node_modules/pixi.js/lib/rendering/renderers/shared/texture/utils/ScreenSizeRegistry.mjs',
  );
  await read('node_modules/pixi.js/lib/rendering/renderers/shared/view/ViewSystem.mjs');
  const poolSource = path.join(pixi, 'lib/rendering/renderers/shared/texture/TexturePool.mjs');
  const { TexturePoolClass } = await import(pathToFileURL(poolSource).href);
  const screenSets = [
    [],
    [{ width: 1500, height: 1050 }],
    [
      { width: 1920, height: 1080 },
      { width: 750, height: 1200 },
    ],
  ];
  const poolCases = [];
  for (const screens of screenSets)
    for (const [width, height, resolution] of [
      [1000, 700, 1.5],
      [256, 128, 1.4],
      [781, 850, 1024 / 850],
      [20.2, 300.1, 0.75],
      [1280, 720, 2],
    ]) {
      const pool = new TexturePoolClass();
      screens.forEach((screen, index) =>
        pool.setScreenSize(index + 1, screen.width, screen.height),
      );
      poolCases.push({
        width,
        height,
        resolution,
        screens,
        expected: pool.getOptimalSize(width, height, resolution),
      });
    }
  const poolTest = path.join(root, 'tests/folia-filters.test.mjs'),
    poolText = await readFile(poolTest, 'utf8'),
    poolA = '// BEGIN Pixi8.21 real pool goldens (generated)',
    poolB = '// END Pixi8.21 real pool goldens';
  if (!poolText.includes(poolA) || !poolText.includes(poolB))
    throw Error('Missing real Pixi pool oracle');
  const poolComplete = await format(
    poolText.slice(0, poolText.indexOf(poolA)) +
      poolA +
      '\nconst poolSourceGoldens=' +
      JSON.stringify(poolCases) +
      ';\n' +
      poolB +
      poolText.slice(poolText.indexOf(poolB) + poolB.length),
    { ...(await resolveConfig(poolTest)), parser: 'babel' },
  );
  await writeFile(poolTest + '.filter-tmp', poolComplete);
  await rename(poolTest + '.filter-tmp', poolTest);

  await atomic(
    path.join(output, 'sources.json'),
    JSON.stringify({ revision, pixi: pkg.version, sha256 }, null, 2) + '\n',
  );
  await atomic(path.join(output, 'PIXI-LICENSE.txt'), await readFile(path.join(pixi, 'LICENSE')));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: { reference: { type: 'string' }, 'qt-bin': { type: 'string' } },
  });
  await buildFoliaFilters({ reference: values.reference, qtBin: values['qt-bin'] });
}
