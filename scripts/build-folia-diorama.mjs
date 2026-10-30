import { withoutBeatAnalysis } from './folia-visual-scope.mjs';
import { resolveFoliaReference } from './folia-reference.mjs';
// Translate the complete pinned 3D scene. React and browser APIs are explicit native recorder seams.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { build, transform } from 'esbuild';
import ts from 'typescript';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const { values } = parseArgs({ options: { reference: { type: 'string' } } });
const reference = await resolveFoliaReference(values.reference);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
if (process.versions.unicode !== '17.0') throw Error('Build with Node24/Unicode17');
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/diorama');
await mkdir(output, { recursive: true });
const config = await resolveConfig(path.join(output, 'kernel.mjs')),
  sha256 = {};
async function source(file) {
  const code = await readFile(path.join(reference, file), 'utf8');
  sha256[file] = createHash('sha256').update(code).digest('hex');
  return code;
}
async function emit(file, code, loader = 'ts') {
  const js = await transform(withoutBeatAnalysis(code, loader === 'tsx' ? file + '.tsx' : file), {
    loader,
    target: 'es2016',
    format: 'esm',
    legalComments: 'none',
    minifySyntax: true,
  });
  await writeFile(
    path.join(output, file),
    await format(
      '// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.\n' + js.code,
      { ...config, parser: 'babel' },
    ),
  );
}
const prefix = 'src/components/visualizer/diorama/';
for (const file of await readdir(path.join(reference, prefix))) {
  if (!/\.tsx?$/.test(file)) continue;
  if (file === 'dioramaBeatRipples.ts') continue;
  let code = await source(prefix + file);
  if (
    file === 'VisualizerDiorama.tsx' ||
    file === 'dioramaBeatRipples.ts' ||
    file === 'entry.tsx' ||
    /^Diorama.*Settings/.test(file) ||
    file === 'DioramaFoldRow.tsx'
  )
    continue;
  if (file === 'tuning.ts') {
    code = code.slice(0, code.indexOf('export default'));
    code = code.replace(/^import .*tuningDefinition.*\n/m, '');
  }
  code = code
    .replaceAll("from '../../../types'", "from './defaults.mjs'")
    .replaceAll(
      "from '../../../utils/lyrics/graphemeTiming'",
      "from '../../shared/text/graphemeTiming.mjs'",
    )
    .replaceAll("from '../../../utils/lyrics/renderHints'", "from '../../shared/renderHints.mjs'")
    .replaceAll("from '../../../utils/fontStacks'", "from '../sonnet/font-stacks.mjs'")
    .replaceAll("from '../wordColoring'", "from '../tempera/word-colors.mjs'")
    .replaceAll("from 'three'", "from './three.mjs'")
    .replaceAll("from 'react'", "from './react.mjs'")
    .replaceAll("from '@react-three/fiber'", "from './react.mjs'");
  code = code.replace(
    /from '(\.{1,2}\/[^']+)'/g,
    (_, rel) => `from '${rel.endsWith('.mjs') ? rel : rel + '.mjs'}'`,
  );
  if (file === 'dioramaTextRaster.ts')
    code =
      "import {document} from './canvas.mjs';\n" +
      code +
      '\nexport function clearDioramaMeasureContext(){measureCtx=null;}';
  if (file === 'dioramaLineRasterCache.ts')
    code = "import {requestAnimationFrame,cancelAnimationFrame} from './environment.mjs';\n" + code;
  if (file === 'DioramaScene.tsx') code = "import {document} from './canvas.mjs';\n" + code;
  if (file === 'dioramaParticleSurfaces.ts')
    code += '\nexport function clearDioramaSurfaceCache(){surfaceCache.clear();}';
  await emit(file.replace(/\.tsx?$/, '.mjs'), code, file.endsWith('.tsx') ? 'tsx' : 'ts');
}
await source('src/components/visualizer/settingsPanels.tsx');
const types = await source('src/types.ts'),
  tree = ts.createSourceFile('types.ts', types, ts.ScriptTarget.Latest, true);
const declarations = tree.statements
  .filter(
    (node) =>
      ts.isVariableStatement(node) &&
      node.declarationList.declarations.some((d) => d.name.getText(tree).includes('DIORAMA_')),
  )
  .map((node) => node.getText(tree));
await emit('defaults.mjs', declarations.join('\n'));
await emit(
  'kernel.mjs',
  [
    "export * from './defaults.mjs';export * from './cameraPath.mjs';export * from './dioramaSequencer.mjs';export * from './dioramaTransition.mjs';export * from './dioramaGeometry.mjs';export * from './dioramaMoteField.mjs';export * from './dioramaParticleModel.mjs';export * from './dioramaParticleSurfaces.mjs';export * from './dioramaParticleCorridor.mjs';export * from './dioramaSceneConstants.mjs';export * from './dioramaSceneUnits.mjs';export * from './dioramaKeywordColor.mjs';export * from './dioramaSceneLayout.mjs';export * from './dioramaSceneFrame.mjs';export * from './dioramaParticleMaterials.mjs';",
    "import {DEFAULT_DIORAMA_TUNING} from './defaults.mjs';import {resolveStoredDioramaTuning} from './tuning.mjs';",
    "export function tuning(settings={}){const input={};for(const key of Object.keys(DEFAULT_DIORAMA_TUNING))input[key]=settings['diorama'+key[0].toUpperCase()+key.slice(1)];input.geometryVisibility=Object.assign({},input.geometryVisibility||{});for(const key of ['enabled','mode','strands','blobs','ribbons','rings']){const value=settings['dioramaGeometry'+key[0].toUpperCase()+key.slice(1)];if(value!==undefined)input.geometryVisibility[key]=value;}return resolveStoredDioramaTuning(input);}",
  ].join('\n'),
);
const threeExports =
  'Vector2,Vector3,Quaternion,Matrix4,Color,Fog,Group,Mesh,Points,PerspectiveCamera,PlaneGeometry,BufferGeometry,BufferAttribute,MeshBasicMaterial,PointsMaterial,ShaderMaterial,CanvasTexture,SRGBColorSpace,NormalBlending,AdditiveBlending,MathUtils,Scene';
const three = await build({
  stdin: { contents: `export {${threeExports}} from 'three';`, resolveDir: reference },
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  target: 'es2016',
  minify: true,
  legalComments: 'none',
  logLevel: 'silent',
});
const threeCode = three.outputFiles[0].text;
const threeTree = ts.createSourceFile(
  'three.js',
  threeCode,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.JS,
);
const hoisted = [];
for (const statement of threeTree.statements)
  if (
    ts.isVariableStatement(statement) &&
    !(statement.declarationList.flags & ts.NodeFlags.BlockScoped)
  )
    for (const declaration of statement.declarationList.declarations)
      if (ts.isIdentifier(declaration.name)) hoisted.push(declaration.name.text);
// JS var declarations are already hoisted. State that explicitly for QML's eager diagnostic pass;
// all initializers stay in their original order, and no prototype or binding is altered.
await emit('three.mjs', 'var ' + hoisted.join(',') + ';\n' + threeCode, 'js');
await copyFile(
  path.join(reference, 'node_modules/three/LICENSE'),
  path.join(output, 'THREE-LICENSE.txt'),
);
sha256['node_modules/three/package.json'] = createHash('sha256')
  .update(await readFile(path.join(reference, 'node_modules/three/package.json')))
  .digest('hex');
await source('node_modules/three/build/three.core.js');
await source('node_modules/three/build/three.module.js');
for (const file of [
  'ShaderChunk/tonemapping_pars_fragment.glsl.js',
  'ShaderChunk/colorspace_pars_fragment.glsl.js',
  'ShaderChunk/fog_fragment.glsl.js',
  'ShaderLib/points.glsl.js',
  'ShaderLib/meshbasic.glsl.js',
])
  await source('node_modules/three/src/renderers/shaders/' + file);
await source('node_modules/three/src/renderers/webgl/WebGLMaterials.js');
await source('node_modules/three/src/renderers/shaders/UniformsUtils.js');
const visualizer = await source(prefix + 'VisualizerDiorama.tsx');
await emit(
  'sequencer-state.mjs',
  [
    "import {useRef,useState,useEffect} from './react.mjs';import {runtimeWindow as window} from './environment.mjs';import {createSequencerState,activeSegment,appendSegment,updateActiveSegmentLines,pruneSegments} from './dioramaSequencer.mjs';import {getFrame} from './cameraPath.mjs';import {pickTransitionOffset,TRANSITION_DURATION} from './dioramaTransition.mjs';const LOOP_RESTART_MAX_INDEX=1,PRUNE_MARGIN_BEHIND=4;",
    'export function useSequencer({gatedSeed,effectiveLines,effectiveLineIndex}){',
    visualizer.slice(
      visualizer.indexOf('    const seqRef ='),
      visualizer.indexOf('    // Only show the "waiting for music"'),
    ),
    'return {seq,globalIndex,transitionEpoch:transitionEpochRef.current,transitionOutgoingIndex:transition?.outgoingIndex??null,hasEverActive:hasEverActiveRef.current};}',
  ].join('\n'),
);
await emit(
  'instrumental.mjs',
  visualizer
    .slice(
      visualizer.indexOf('const INSTRUMENTAL_FRAMES'),
      visualizer.indexOf('// A new song holds'),
    )
    .replace('const buildInstrumentalPhantomLines', 'export const buildInstrumentalPhantomLines'),
);
const oracle = await build({
  stdin: {
    contents: [
      'cameraPath',
      'dioramaSequencer',
      'dioramaTransition',
      'dioramaGeometry',
      'dioramaParticleModel',
      'dioramaParticleSurfaces',
      'dioramaParticleCorridor',
      'dioramaMoteField',
      'dioramaSceneUnits',
      'dioramaSceneConstants',
      'dioramaKeywordColor',
      'dioramaParticleMaterials',
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
const testFile = path.join(root, 'tests/folia-diorama.test.mjs'),
  testCode = await readFile(testFile, 'utf8'),
  a = '// BEGIN Folia Diorama source oracle (generated)',
  b = '// END Folia Diorama source oracle';
if (!testCode.includes(a) || !testCode.includes(b)) throw Error('Missing Diorama oracle markers');
await writeFile(
  testFile,
  await format(
    testCode.slice(0, testCode.indexOf(a)) +
      a +
      '\nconst sourceOracleCode=' +
      JSON.stringify(oracle.outputFiles[0].text) +
      ';\n' +
      b +
      testCode.slice(testCode.indexOf(b) + b.length),
    { ...config, parser: 'babel' },
  ),
);
await writeFile(
  path.join(output, 'sources.json'),
  JSON.stringify({ revision, unicode: '17.0.0', three: '0.185.1', sha256 }, null, 2) + '\n',
);
const { DIORAMA_PARTICLE_VERTEX_SHADER: vertex, DIORAMA_PARTICLE_FRAGMENT_SHADER: fragment } =
  await import(
    new URL(
      '../plugins/folia-lyrics-skin/qml/styles/diorama/dioramaParticleShaders.mjs',
      import.meta.url,
    )
  );
const ripple = Array.from(
  { length: 9 },
  (_, i) => `vec4 uRippleSource${i};vec4 uRippleShape${i};`,
).join('\n');
const block = `layout(std140,binding=0)uniform buf{mat4 qt_Matrix;float qt_Opacity;mat4 viewMatrix;mat4 projectionMatrix;vec3 cameraPosition;vec2 viewport;float resolution;float pointCount;float uTime;float uCorridor;float uAmplitude;float uMaxSwell;float uWaveNumberMax;float uDetail;float uOffsetGain;float uFlow;float uFormation;float uScatter;float uPulse;float uSpectralCentroid;float uViewportHeight;float uSizeBase;float uSizeGain;float uGlow;float uGlowPass;vec3 uPrimaryColor;vec3 uAccentColor;vec3 uSecondaryColor;${ripple}float metalPointRaster;};`;
const header = '#version 440\n';
const getters = ['Source', 'Shape']
  .map(
    (kind) =>
      `vec4 getRipple${kind}(int i){${Array.from({ length: 8 }, (_, i) => `if(i==${i})return uRipple${kind}${i};`).join('')}return uRipple${kind}8;}`,
  )
  .join('\n');
const coord = `float row=floor(qt_MultiTexCoord0.y*(pointCount*4.0-1.0)+.5);float part=mod(row,4.0);int index=int(min(pointCount-1.0,floor(row/4.0)+(part>2.5?1.0:0.0)));vec2 corner=part<.5?vec2(qt_MultiTexCoord0.x,1.0):part<1.5?vec2(qt_MultiTexCoord0.x,0.0):part<2.5?vec2(1.0,0.0):vec2(0.0,1.0);vPoint=corner;vec4 p0=texelFetch(pointData,ivec2(0,index),0),p1=texelFetch(pointData,ivec2(1,index),0),p2=texelFetch(pointData,ivec2(2,index),0),p3=texelFetch(pointData,ivec2(3,index),0),p4=texelFetch(pointData,ivec2(4,index),0);vec3 position=p0.xyz,aNormal=p1.xyz,aAnchor=p2.xyz,aScale=vec3(p1.w,p2.w,p3.w),aStyle=p3.xyz;float aPhase=p0.w;vec2 aWave=p4.xy;`;
const projection = `vec4 clip=projectionMatrix*mvPosition;vec2 pixel=vec2((clip.x+clip.w)*.5*viewport.x,(clip.w-clip.y)*.5*viewport.y);if(metalPointRaster>.5){vec2 center=(clip.xy/clip.w*.5+.5)*viewport*resolution;vec2 low=center-pointSize*.5;vec2 high=center+pointSize*.5;vec2 origin=floor(low*256.0+.5)/256.0;vec2 span=(floor(high*16.0+.5)-floor(low*16.0+.5))/16.0;vec2 physical=origin+corner*span;pixel=vec2(physical.x,viewport.y*resolution-physical.y)/resolution*clip.w;vPoint=vec2(corner.x,1.0-corner.y);}else{pixel+=(corner-vec2(.5))*vec2(1.0,-1.0)*(pointSize/resolution)*clip.w;}gl_Position=qt_Matrix*vec4(pixel,0.0,clip.w);if(clip.z < -clip.w||clip.z>clip.w||mvPosition.z>=0.0)gl_Position=vec4(2.0,2.0,2.0,1.0);`;
const v = vertex
  .replace(/(?:attribute [^;]+;|uniform [^;]+;)/g, '')
  .replace('varying vec3 vColor;', 'layout(location=1)out vec3 vColor;')
  .replace('varying float vAlpha;', 'layout(location=2)out float vAlpha;')
  .replace('varying float vReaction;', 'layout(location=3)out float vReaction;')
  .replace('void main() {', 'void main() {' + coord)
  .replaceAll('uRippleSource[i]', 'getRippleSource(i)')
  .replaceAll('uRippleShape[i]', 'getRippleShape(i)')
  .replace('gl_PointSize = clamp', 'float pointSize = clamp')
  .replace('gl_Position = projectionMatrix * mvPosition;', projection);
await writeFile(
  path.join(output, 'particles.vert'),
  header +
    'layout(location=0)in vec4 qt_Vertex;layout(location=1)in vec2 qt_MultiTexCoord0;layout(location=0)out vec2 vPoint;layout(binding=1)uniform sampler2D pointData;\n' +
    block +
    getters +
    v,
);
const f = fragment
  .replace(/uniform [^;]+;/g, '')
  .replace('varying vec3 vColor;', 'layout(location=1)in vec3 vColor;')
  .replace('varying float vAlpha;', 'layout(location=2)in float vAlpha;')
  .replace('varying float vReaction;', 'layout(location=3)in float vReaction;')
  .replaceAll('gl_PointCoord', 'vPoint')
  .replaceAll(
    'gl_FragColor = vec4(dioramaLinearToSRGB(vColor * (1.0 + uGlow * 0.25)), alpha);',
    'fragColor = vec4(clamp(dioramaLinearToSRGB(vColor * (1.0 + uGlow * 0.25)),vec3(0),vec3(1))*alpha, alpha)*qt_Opacity;',
  )
  .replaceAll(
    'gl_FragColor = vec4(dioramaLinearToSRGB(vColor * emission), alpha);',
    'fragColor = vec4(clamp(dioramaLinearToSRGB(vColor * emission),vec3(0),vec3(1))*alpha, alpha)*qt_Opacity;',
  );
await writeFile(
  path.join(output, 'particles.frag'),
  header + 'layout(location=0)in vec2 vPoint;layout(location=0)out vec4 fragColor;\n' + block + f,
);
const qsb = path.join(
  process.env.FOLIA_QT_BIN ||
    path.resolve(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin'),
  'qsb',
);
for (const file of await readdir(output))
  if (/\.(vert|frag)$/.test(file))
    execFileSync(
      qsb,
      [
        '--glsl',
        '150,300es',
        '--hlsl',
        '50',
        '--msl',
        '12',
        '-o',
        path.join(output, file + '.qsb'),
        path.join(output, file),
      ],
      { stdio: 'inherit', env: { ...process.env, QT_HASH_SEED: '0' } },
    );
// Qt6.12 QRhi does not consume QSGTexture anisotropy. The pinned source requires
// a fixed 4x sampler, so specialize only this Metal MSL20 plane variant. Keep the
// generated main0 entry, reflection, all binding maps and all non-MSL bytes.
const shaderPackDir = path.join(root, 'build/folia-diorama-shader-pack');
await mkdir(shaderPackDir, { recursive: true });
await writeFile(
  path.join(shaderPackDir, 'specialize.cpp'),
  '#include <QtCore/QCoreApplication>\n#include <QtCore/QFile>\n#include <rhi/qshader.h>\n#include <cstdio>\nstatic void copyMetadata(QShader &out, const QShaderKey &to, const QShader &source, const QShaderKey &from) {\n const auto bindings=source.nativeResourceBindingMap(from);if(bindings.isEmpty())out.removeResourceBindingMap(to);else out.setResourceBindingMap(to,bindings);\n const auto samplers=source.separateToCombinedImageSamplerMappingList(from);if(samplers.isEmpty())out.removeSeparateToCombinedImageSamplerMappingList(to);else out.setSeparateToCombinedImageSamplerMappingList(to,samplers);\n const auto info=source.nativeShaderInfo(from);if(info.flags==0&&info.extraBufferBindings.isEmpty())out.removeNativeShaderInfo(to);else out.setNativeShaderInfo(to,info);\n}\nstatic void remove(QShader &out,const QShaderKey &key) {\n out.removeShader(key);out.removeResourceBindingMap(key);out.removeSeparateToCombinedImageSamplerMappingList(key);out.removeNativeShaderInfo(key);\n}\nint main(int argc,char **argv) {\n QCoreApplication app(argc,argv);\n if(argc!=2)return 1;\n QFile file(QString::fromLocal8Bit(argv[1]));if(!file.open(QIODevice::ReadOnly))return 2;\n const QShader original=QShader::fromSerialized(file.readAll());file.close();\n const QShaderKey oldKey(QShader::MslShader,QShaderVersion(12)),newKey(QShader::MslShader,QShaderVersion(20));\n if(!original.isValid()||!original.availableShaders().contains(oldKey)||original.availableShaders().contains(newKey))return 3;\n const QShaderCode oldCode=original.shader(oldKey);QByteArray code=oldCode.shader();\n const QByteArray declaration="using namespace metal;",sample="source.sample(sourceSmplr, in.vUv)";\n if(oldCode.entryPoint()!="main0"||code.count(declaration)!=1||code.count(sample)!=1)return 4;\n code.replace(declaration,declaration+"\\nconstexpr sampler foliaSampler4(coord::normalized, address::clamp_to_edge, filter::linear, mip_filter::linear, max_anisotropy(4));");\n code.replace(sample,"source.sample(foliaSampler4, in.vUv)");\n QShader output=original;output.setShader(newKey,QShaderCode(code,oldCode.entryPoint()));copyMetadata(output,newKey,original,oldKey);remove(output,oldKey);\n const QByteArray packed=output.serialized();output=QShader::fromSerialized(packed);\n if(!output.isValid()||output.description().toJson()!=original.description().toJson())return 5;\n for(const auto &key:original.availableShaders())if(key.source()!=QShader::MslShader&&output.shader(key)!=original.shader(key))return 6;\n // A full metadata round trip also checks bindings and backend mappings byte for byte.\n QShader restored=output;remove(restored,newKey);restored.setShader(oldKey,oldCode);copyMetadata(restored,oldKey,original,oldKey);\n if(restored!=original)return 7;\n if(output.shader(newKey).entryPoint()!=oldCode.entryPoint())return 8;\n if(!file.open(QIODevice::WriteOnly|QIODevice::Truncate)||file.write(packed)!=packed.size())return 9;\n printf("MSL 2.0 fixed4 sampler: preserved main0, reflection, bindings, all non-MSL payloads and metadata (%d variants)\\n",int(original.availableShaders().size()-1));\n}\n',
);
await writeFile(
  path.join(shaderPackDir, 'CMakeLists.txt'),
  `cmake_minimum_required(VERSION 3.25)
project(FoliaDioramaShaderPack LANGUAGES CXX)
find_package(Qt6 6.12.0 EXACT REQUIRED COMPONENTS Gui GuiPrivate)
add_executable(specialize specialize.cpp)
target_compile_features(specialize PRIVATE cxx_std_20)
target_link_libraries(specialize PRIVATE Qt6::Gui Qt6::GuiPrivate)
`,
);
execFileSync(
  'cmake',
  [
    '-S',
    shaderPackDir,
    '-B',
    path.join(shaderPackDir, 'out'),
    '-G',
    'Ninja',
    '-DCMAKE_BUILD_TYPE=Release',
    '-DCMAKE_PREFIX_PATH=' + path.dirname(path.dirname(qsb)),
  ],
  { stdio: 'inherit' },
);
execFileSync('cmake', ['--build', path.join(shaderPackDir, 'out'), '--parallel', '2'], {
  stdio: 'inherit',
});
execFileSync(
  path.join(shaderPackDir, 'out', 'specialize'),
  [path.join(output, 'plane-linear.frag.qsb')],
  { stdio: 'inherit', env: { ...process.env, QT_HASH_SEED: '0' } },
);
// Handwritten host seams obey the same package parser target as the translated source.
for (const file of [
  'native-measure.mjs',
  'canvas.mjs',
  'environment.mjs',
  'react.mjs',
  'scene.mjs',
  'preparation-job.mjs',
  'worker.mjs',
])
  await emit(file, await readFile(path.join(output, file), 'utf8'), 'js');
console.log(
  'Generated complete pinned Diorama camera, scene, geometry, particle shader and transition source.',
);
