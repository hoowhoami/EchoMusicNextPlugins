import { resolveFoliaReference } from './folia-reference.mjs';
// Exact Folia a8da4437 JSX/Paper 0.0.80 parameters and GLSL, without a browser renderer.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { transform, build } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  reference = await resolveFoliaReference(
    process.argv.slice(2).find((value) => !value.startsWith('--')),
  ),
  output = path.join(root, 'plugins/folia-lyrics-skin/qml/backgrounds/nomand'),
  revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const paper = path.join(reference, 'node_modules/@paper-design/shaders'),
  react = path.join(reference, 'node_modules/@paper-design/shaders-react'),
  config = await resolveConfig(path.join(output, 'kernel.mjs')),
  sha256 = {};
if (JSON.parse(await readFile(path.join(paper, 'package.json'), 'utf8')).version !== '0.0.80')
  throw Error('Paper 0.0.80 required');
await mkdir(output, { recursive: true });
async function atomic(file, data) {
  if (typeof data === 'string' && /\.(frag|vert)$/.test(file)) data = data.replace(/[\t ]+$/gm, '');
  if (typeof data === 'string' && file.endsWith('.json'))
    data = await format(data, { ...config, parser: 'json' });
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file + '.nomand-tmp', data);
  await rename(file + '.nomand-tmp', file);
}
async function read(file) {
  const value = await readFile(path.join(reference, file), 'utf8');
  sha256[file] = createHash('sha256').update(value).digest('hex');
  return value;
}
async function emit(file, code) {
  const result = await transform(code, {
    target: 'es2016',
    loader: 'tsx',
    format: 'esm',
    jsxFactory: 'React.createElement',
  });
  await atomic(
    path.join(output, file),
    await format(
      '// Folia a8da4437 / Paper0.0.80. See nomand-reference.md.\n' +
        result.code.replace(
          'var __getOwnPropDescs = Object.getOwnPropertyDescriptors;',
          `var __getOwnPropDescs = function(value){const result=Object.create(null);Object.getOwnPropertyNames(value).concat(Object.getOwnPropertySymbols(value)).forEach(function(key){result[key]=Object.getOwnPropertyDescriptor(value,key);});return result;};`,
        ),
      {
        ...config,
        parser: 'babel',
      },
    ),
  );
}
function declaration(code, name) {
  const ast = ts.createSourceFile(
    'source.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let found;
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node;
    ts.forEachChild(node, visit);
  };
  visit(ast);
  if (!found) throw Error('Missing ' + name);
  return found;
}
const prefix = 'src/components/visualizer/backgrounds/nomand/',
  layer = await read(prefix + 'NomandBackgroundLayer.tsx'),
  adjustments = await read(prefix + 'nomandShaderAdjustments.ts'),
  tuning = await read(prefix + 'tuning.ts'),
  types = await read('src/types.ts');
await emit('adjustments.mjs', adjustments);
const defaults = declaration(types, 'DEFAULT_NOMAND_BACKGROUND_TUNING').initializer.getText();
const resolver = tuning.slice(
  tuning.indexOf('const resolveNomandBackgroundSource'),
  tuning.indexOf('\nexport default'),
);
await emit(
  'tuning.mjs',
  `export const DEFAULT_NOMAND_BACKGROUND_TUNING=${defaults};\n${resolver}\nexport const defaults=DEFAULT_NOMAND_BACKGROUND_TUNING;`,
);
const colorSource = await read(
  'node_modules/@paper-design/shaders/dist/get-shader-color-from-string.js',
);
// Keep original constants before callers for Qt's lexical-use diagnostic.
const colorConstants = /const clamp =[^\n]+\nconst fallbackColor =[^\n]+\n/.exec(colorSource)[0];
await emit('colors.mjs', colorConstants + colorSource.replace(colorConstants, ''));
const components = [
  ['FlutedGlass', 'fluted-glass', 'flutedGlassFragmentShader'],
  ['PaperTexture', 'paper-texture', 'paperTextureFragmentShader'],
  ['HalftoneDots', 'halftone-dots', 'halftoneDotsFragmentShader'],
  ['LensDistortion', 'lens-distortion', 'lensDistortionFragmentShader'],
  ['ImageDithering', 'image-dithering', 'imageDitheringFragmentShader'],
];
const rawShaders = {};
for (const [component, file, fragmentName] of components) {
  const code = await read('node_modules/@paper-design/shaders-react/dist/shaders/' + file + '.js'),
    d = declaration(code, 'defaultPreset'),
    fn = declaration(code, component).initializer.arguments[0];
  const exports = await import(pathToFileURL(path.join(paper, 'dist/shaders/' + file + '.js'))),
    sizing = await import(pathToFileURL(path.join(paper, 'dist/shader-sizing.js')));
  const enums = {};
  for (const key of Object.keys(exports))
    if (typeof exports[key] === 'object') enums[key] = exports[key];
  rawShaders[file === 'image-dithering' ? 'dithering' : file] = exports[fragmentName];
  await read('node_modules/@paper-design/shaders/dist/shaders/' + file + '.js');
  const name = file === 'image-dithering' ? 'dithering' : file;
  await emit(
    'profiles/' + file + '.mjs',
    `import {getShaderColorFromString} from '../colors.mjs';const window={};const getShaderNoiseTexture=()=>true;const ShaderMount=0;const jsx=(_,props)=>{const result={uniforms:props.uniforms,fragmentShader:'${name}',speed:props.speed,frame:props.frame,minPixelRatio:props.minPixelRatio,maxPixelCount:props.maxPixelCount};if(props.mipmaps)result.mipmaps=props.mipmaps;return result;};\nconst {defaultObjectSizing,ShaderFitOptions}=${JSON.stringify(sizing)};const ${fragmentName}='${name}';${Object.keys(
      enums,
    )
      .map((key) => `const ${key}=${JSON.stringify(enums[key])};`)
      .join(
        '\n',
      )}\nconst defaultPreset=${d.initializer.getText()};\nexport const ${component}=${fn.getText()};`,
  );
}
const render = declaration(layer, 'renderShader').initializer.getText(),
  context = await read('src/utils/paperShaderContext.ts'),
  resolve = declaration(layer, 'resolveNomandSourceUrl').initializer.getText();
const imports = components
  .map(([name, file]) => `import {${name}} from './profiles/${file}.mjs';`)
  .join('\n');
await emit(
  'source-layer.mjs',
  `${imports}\nimport {getLensDistortionOverscan,getPaperTextureOverscan,NOMAND_LENS_SHAPE,NOMAND_PAPER_TEXTURE_SHAPE,resolveDaylightInversion,resolveHalftoneInversion} from './adjustments.mjs';\nconst PAPER_SHADER_CONTEXT_ATTRIBUTES={antialias:false,depth:false};const React={createElement(type,props){const next=Object.assign({},props);delete next.key;return type(next);}};\nexport const resolveNomandSourceUrl=${resolve};\nexport function profile(tuning,theme,isDaylight,sourceUrl){const shaderRef={current:null};const renderShader=${render};return renderShader();}`,
);
await emit(
  'kernel.mjs',
  `import {defaults,resolveStoredNomandBackgroundTuning} from './tuning.mjs';export {defaults};export * from './adjustments.mjs';export {profile} from './source-layer.mjs';import {resolveNomandSourceUrl} from './source-layer.mjs';export function resolveSourceUrl(cover,uploaded,tuning){return resolveNomandSourceUrl(cover,uploaded?{url:uploaded}:null,tuning);}\nexport function tuning(settings={}){const input={};for(const key of Object.keys(defaults))input[key]=settings['nomand'+key[0].toUpperCase()+key.slice(1)];return resolveStoredNomandBackgroundTuning(input);}\nexport function pixelBudget(width,height,dpr){if(!(width>0&&height>0))return{width:1,height:1,pixelRatio:1};const w=Math.max(1,Math.round(width)),h=Math.max(1,Math.round(height)),ratio=Math.max(1,dpr),correction=Math.min(1,Math.sqrt(1920*1080)/Math.sqrt(w*h*ratio*ratio)),pw=Math.max(1,Math.round(w*ratio*correction));return{width:pw,height:Math.max(1,Math.round(h*ratio*correction)),pixelRatio:pw/w};}`,
);
// Independent oracle executes the original JSX and real Paper React factories in Node (no DOM/rendering).
const oracleResult = await build({
  stdin: {
    contents: `import React from 'react';import {PAPER_SHADER_CONTEXT_ATTRIBUTES} from './src/utils/paperShaderContext.ts';import {FlutedGlass,PaperTexture,HalftoneDots,LensDistortion,ImageDithering} from '@paper-design/shaders-react';import {getLensDistortionOverscan,getPaperTextureOverscan,NOMAND_LENS_SHAPE,NOMAND_PAPER_TEXTURE_SHAPE,resolveDaylightInversion,resolveHalftoneInversion} from './${prefix}nomandShaderAdjustments.ts';export function sourceProfile(tuning,theme,isDaylight,sourceUrl){const shaderRef={current:null};const renderShader=${render};return renderShader();}`,
    resolveDir: reference,
    loader: 'tsx',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  target: 'es2016',
  logLevel: 'silent',
});
const oracleFile = path.join(root, 'build/folia-nomand-reference/oracle.mjs');
await atomic(oracleFile, oracleResult.outputFiles[0].text);
const oracle = await import(pathToFileURL(oracleFile));
const { defaults: defaultValues } = await import(pathToFileURL(path.join(output, 'tuning.mjs'))),
  records = [];
for (const effect of [
  'dithering',
  'fluted-glass',
  'paper-texture',
  'halftone-dots',
  'lens-distortion',
])
  for (const daylight of [false, true])
    for (const variant of [0, 1, 2]) {
      const t = Object.assign({}, defaultValues, { effect });
      if (variant === 1)
        Object.assign(t, {
          originalColors: true,
          inverted: true,
          halftoneDotsOriginalColors: true,
          halftoneDotsInverted: true,
          paperTextureRoughness: 1,
          paperTextureFiber: 1,
          lensDistortionBulge: 1,
          lensDistortionSpread: 1,
          flutedGlassBlur: 1,
        });
      if (variant === 2)
        Object.assign(t, {
          ditheringType: '2x2',
          size: 0.5,
          colorSteps: 7,
          lensDistortionBulge: -1,
          flutedGlassSize: 0.1,
          halftoneDotsRadius: 2,
          halftoneDotsContrast: 1,
        });
      const theme = daylight
        ? {
            backgroundColor: '#efeadd',
            primaryColor: '#181e28',
            secondaryColor: '#4d6877',
            accentColor: '#cc3366',
          }
        : {
            backgroundColor: '#181e28',
            primaryColor: '#efeadd',
            secondaryColor: '#4d6877',
            accentColor: '#cc3366',
          };
      const element = oracle.sourceProfile(t, theme, daylight, 'fixture-cover'),
        actual = element.type.type(element.props).props,
        expected = {
          uniforms: actual.uniforms,
          fragmentShader: effect,
          speed: actual.speed,
          frame: actual.frame,
          minPixelRatio: actual.minPixelRatio,
          maxPixelCount: actual.maxPixelCount,
        };
      if (actual.mipmaps) expected.mipmaps = actual.mipmaps;
      delete expected.uniforms.u_noiseTexture;
      records.push({ tuning: t, theme, daylight, expected });
    }
await atomic(
  path.join(root, 'tests/fixtures/nomand/profiles.json'),
  JSON.stringify(records, null, 2) + '\n',
);
// Every declaration is reflected into one identical native UBO, preserving source scalar types.
const vertex = (await import(pathToFileURL(path.join(paper, 'dist/vertex-shader.js'))))
  .vertexShaderSource;
await read('node_modules/@paper-design/shaders/dist/vertex-shader.js');
await read('node_modules/@paper-design/shaders/dist/shader-sizing.js');
await read('node_modules/@paper-design/shaders/dist/shader-utils.js');
await read('node_modules/@paper-design/shaders/dist/shader-mount.js');
const uniformMap = new Map();
for (const code of [vertex, ...Object.values(rawShaders)])
  for (const match of code.matchAll(/uniform (\w+) (u_\w+);/g))
    if (match[1] !== 'sampler2D') uniformMap.set(match[2], match[1]);
const nativeName = (name) => (uniformMap.get(name) === 'vec4' ? 'c_' + name.slice(2) : name);
const block =
  'layout(std140,binding=0) uniform buf{mat4 qt_Matrix;float qt_Opacity;' +
  [...uniformMap].map(([name, type]) => type + ' ' + nativeName(name) + ';').join('') +
  '};\n';
const imageBlock = vertex.slice(vertex.indexOf('  vec2 imageBoxSize;'), vertex.lastIndexOf('\n}'));
// Preserve WebGL's actual raster orientation, not just its numerical fragment
// coordinates. Mirroring gl_FragCoord alone changes the implicit texture LOD's
// quad orientation for non-linear UVs. The final copy restores Qt's orientation.
const imageVertex = `#version 440\nprecision mediump float;\nlayout(location=0)in vec4 qt_Vertex;layout(location=1)in vec2 qt_MultiTexCoord0;layout(location=0)out vec2 qt_TexCoord0;layout(location=1)out vec2 v_imageUV;${block}\nvoid main(){gl_Position=qt_Matrix*qt_Vertex;gl_Position.y=-gl_Position.y;qt_TexCoord0=qt_MultiTexCoord0;vec2 uv=vec2(qt_MultiTexCoord0.x-.5,.5-qt_MultiTexCoord0.y);vec2 boxOrigin=vec2(.5-u_originX,u_originY-.5);float r=u_rotation*3.14159265358979323846/180.;mat2 graphicRotation=mat2(cos(r),sin(r),-sin(r),cos(r));vec2 graphicOffset=vec2(-u_offsetX,u_offsetY);${imageBlock}\n}`;
await atomic(path.join(output, 'image.vert'), imageVertex);
const colors = [...uniformMap]
  .filter(([, type]) => type === 'vec4')
  .map(([name]) => '#define ' + name + ' (straightColor(' + nativeName(name) + '))')
  .join('\n');
for (const [name, source] of Object.entries(rawShaders)) {
  let body = source
    .replace(/^#version[^\n]+\n/, '')
    .replace(/precision \w+ float;/g, '')
    .replace(/uniform \w+ u_\w+;/g, '')
    .replace(/out vec4 fragColor;/g, '')
    .replace(/in vec2 v_imageUV;/g, '');
  body = body
    .replaceAll('gl_FragCoord.xy', 'sourceFragCoord()')
    .replace(/\n}\s*$/, '\nfragColor*=qt_Opacity;\n}');
  await atomic(
    path.join(output, name + '.frag'),
    `#version 440\nprecision mediump float;\nlayout(location=0)in vec2 qt_TexCoord0;layout(location=1)in vec2 v_imageUV;layout(location=0)out vec4 fragColor;${block}\nlayout(binding=1)uniform sampler2D u_image;layout(binding=2)uniform sampler2D u_noiseTexture;\nvec4 straightColor(vec4 color){return color.a>0.?vec4(color.rgb/color.a,color.a):vec4(0.);}\nvec2 sourceFragCoord(){return gl_FragCoord.xy;}\n${colors}\n${body}`,
  );
}
const noise = await read('node_modules/@paper-design/shaders/dist/get-shader-noise-texture.js'),
  base64 = /const noiseSrc = "data:image\/png;base64,([^"]+)"/.exec(noise);
if (!base64) throw Error('Missing exact Paper noise');
await atomic(path.join(output, 'paper-noise.png'), Buffer.from(base64[1], 'base64'));
await atomic(path.join(output, 'PAPER-LICENSE.txt'), await readFile(path.join(paper, 'LICENSE')));
await atomic(
  path.join(output, 'PAPER-NOTICE.txt'),
  'Paper shaders 0.0.80, Copyright Paper Design. Apache-2.0.\nOriginal GLSL/vertex/sizing/color/noise bytes translated to QSB. Folia composition AGPL-3.0-only.\n',
);
// QML bridge properties are generated from the same reflected types rather than hand-maintained aliases.
const declarations = [...uniformMap]
  .filter(([name]) => !['u_resolution', 'u_pixelRatio', 'u_imageAspectRatio'].includes(name))
  .map(([name, type]) =>
    type === 'vec4'
      ? `property color ${nativeName(name)}:rgba(profile.uniforms.${name})`
      : `property ${type === 'bool' ? 'bool' : 'real'} ${name}:profile.uniforms.${name}===undefined?${type === 'bool' ? 'false' : '0'}:profile.uniforms.${name}`,
  )
  .join('\n');
await atomic(
  path.join(output, 'NomandShader.qml'),
  `// Generated native bridge for exact Paper uniforms.\npragma ComponentBehavior: Bound\nimport QtQuick\nShaderEffect {\nproperty var profile:({uniforms:{},fragmentShader:'dithering'})\nfunction rgba(value){const c=value||[0,0,0,0];return Qt.rgba(c[0],c[1],c[2],c[3]);}\nproperty vector2d u_resolution:Qt.vector2d(width,height)\nproperty real u_pixelRatio:1\nproperty real u_imageAspectRatio:1\nproperty var u_image:null\nproperty var u_noiseTexture:null\n${declarations}\nvertexShader:Qt.resolvedUrl('image.vert.qsb')\nfragmentShader:Qt.resolvedUrl(profile.fragmentShader+'.frag.qsb')\n}`,
);
for (const name of ['straight', 'copy'])
  await atomic(
    path.join(output, name + '.frag'),
    `#version 440
layout(location=0)in vec2 qt_TexCoord0;layout(location=0)out vec4 fragColor;
layout(std140,binding=0)uniform buf{mat4 qt_Matrix;float qt_Opacity;};
layout(binding=1)uniform sampler2D source;
void main(){vec4 c=texture(source,${name === 'straight' ? 'qt_TexCoord0' : 'vec2(qt_TexCoord0.x,1.-qt_TexCoord0.y)'});${name === 'straight' ? 'fragColor=c.a>0.?vec4(c.rgb/c.a,c.a):vec4(0.);' : 'fragColor=c*qt_Opacity;'}}
`,
  );
const qt =
  process.env.FOLIA_QT_BIN ||
  path.resolve(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin');
for (const file of [
  'image.vert',
  'straight.frag',
  'copy.frag',
  ...Object.keys(rawShaders).map((name) => name + '.frag'),
]) {
  const full = path.join(output, file);
  execFileSync(
    path.join(qt, 'qsb'),
    ['--glsl', '150,300es', '--hlsl', '50', '--msl', '12', '-o', full + '.qsb.nomand-tmp', full],
    { stdio: 'inherit' },
  );
  await rename(full + '.qsb.nomand-tmp', full + '.qsb');
}
await atomic(
  path.join(output, 'NomandShader.qml'),
  execFileSync(path.join(qt, 'qmlformat'), [path.join(output, 'NomandShader.qml')], {
    encoding: 'utf8',
  }),
);
await atomic(
  path.join(output, 'sources.json'),
  JSON.stringify({ revision, paper: '0.0.80', sha256 }, null, 2) + '\n',
);
console.info('Generated all five original Nomand/Paper shaders and real React uniform oracle.');
// Optional hardware browser oracle uses unmodified original WebGL programs and texture upload.
if (process.argv.includes('--browser-oracle')) {
  const imageData =
    'data:image/png;base64,' +
    (await readFile(path.join(root, 'tests/fixtures/nomand/patches.png'))).toString('base64');
  const noiseData =
    'data:image/png;base64,' +
    (await readFile(path.join(output, 'paper-noise.png'))).toString('base64');
  const cases = records
    .filter((item) => !item.daylight && item.tuning.effect && item.tuning.overlayOpacity === 0.35)
    .filter((_, i) => i % 3 === 0);
  const mipmapData =
    'data:image/png;base64,' +
    (await readFile(path.join(root, 'tests/fixtures/nomand/mipmap.png'))).toString('base64');
  const payload = { vertex, fragments: rawShaders, cases, imageData, mipmapData, noiseData };
  const html = `<!DOCTYPE html><html><body>pending<script>
 const input=${JSON.stringify(payload)};
 (async()=>{
 const images=[await load(input.imageData),await load(input.mipmapData)],noise=await load(input.noiseData),results=[];
 const canvas=document.createElement('canvas');
 const gl=canvas.getContext('webgl2',{antialias:false,depth:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL2 unavailable');
 const debug=gl.getExtension('WEBGL_debug_renderer_info'),renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 function compile(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
 for(const target of [{logicalWidth:320,logicalHeight:240,pixelRatio:2},{logicalWidth:320,logicalHeight:240,pixelRatio:1},{logicalWidth:321,logicalHeight:241,pixelRatio:1}])for(let imageIndex=0;imageIndex<images.length;imageIndex++)for(const item of input.cases){const {logicalWidth,logicalHeight,pixelRatio}=target,width=logicalWidth*pixelRatio,height=logicalHeight*pixelRatio;canvas.width=width;canvas.height=height;const image=images[imageIndex],effect=item.expected.fragmentShader,p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,input.vertex));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,input.fragments[effect]));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 let slot=0;function texture(name,img,mipmap){const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+slot);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);if(mipmap){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}gl.uniform1i(gl.getUniformLocation(p,name),slot++);}
 texture('u_image',image,!!item.expected.mipmaps);texture('u_noiseTexture',noise,false);
 const uniforms=Object.assign({},item.expected.uniforms,{u_resolution:[width,height],u_pixelRatio:pixelRatio,u_imageAspectRatio:2,u_time:0});
 for(const name of Object.keys(uniforms)){if(name==='u_image')continue;const value=uniforms[name],u=gl.getUniformLocation(p,name);if(u===null)continue;if(Array.isArray(value)){if(value.length===4)gl.uniform4fv(u,value);else if(value.length===2)gl.uniform2fv(u,value);}else if(typeof value==='boolean')gl.uniform1i(u,value?1:0);else if(typeof value==='number')gl.uniform1f(u,value);}
 gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);gl.finish();if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL render error');
 const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);const samples=[];
 // Retina Qt Quick item grab preserves the 640x480 physical target texels.
 for(let y=14;y<height;y+=39)for(let x=18;x<width;x+=47){const i=((height-1-y)*width+x)*4,rgba=Array.from(pixels.subarray(i,i+4));const bg=[24,30,40],rgb=rgba.slice(0,3).map((v,c)=>Math.round(v+bg[c]*(1-rgba[3]/255)));samples.push({x,y,rgb});}
 results.push({effect,fixture:imageIndex?'mipmap.png':'patches.png',...target,width,height,samples});gl.deleteProgram(p);gl.deleteBuffer(buffer);
 }
 document.body.textContent=JSON.stringify({renderer,width:640,height:480,physicalWidth:640,physicalHeight:480,results});
 })().catch(error=>document.body.textContent=JSON.stringify({error:String(error)}));
 function load(url){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;});}
 </script></body></html>`;
  const file = path.join(root, 'build/folia-nomand-reference/webgl.html');
  await atomic(file, html);
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const dom = execFileSync(
    chrome,
    [
      '--headless',
      '--use-angle=metal',
      '--no-first-run',
      '--disable-background-networking',
      '--user-data-dir=' + path.join(root, 'build/folia-nomand-reference/chrome'),
      '--virtual-time-budget=10000',
      '--dump-dom',
      pathToFileURL(file).href,
    ],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  const match = /<body>([^<]+)<\/body>/.exec(dom);
  if (!match) throw Error('Browser oracle did not finish');
  const parsed = JSON.parse(
    match[1].replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'),
  );
  if (parsed.error) throw Error(parsed.error);
  if (!/Metal|Apple/.test(parsed.renderer))
    throw Error('Hardware Metal oracle required: ' + parsed.renderer);
  await atomic(
    path.join(root, 'tests/fixtures/nomand/webgl.json'),
    JSON.stringify(parsed, null, 2) + '\n',
  );
  await atomic(
    path.join(root, 'tests/fixtures/nomand/webgl.mjs'),
    await format('export const oracle=' + JSON.stringify(parsed) + ';\n', {
      ...config,
      parser: 'babel',
    }),
  );
  console.info('Original hardware browser pixel oracle:', parsed.renderer);
}
