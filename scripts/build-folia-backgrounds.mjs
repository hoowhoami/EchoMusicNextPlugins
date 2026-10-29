import { withoutBeatAnalysis } from './folia-visual-scope.mjs';
import { resolveFoliaReference } from './folia-reference.mjs';
// Build-time source port. Folia AGPL3; Paper 0.0.80 Apache2.0 (bundled notices).
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';
import { format, resolveConfig } from 'prettier';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = await resolveFoliaReference(process.argv[2]);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/backgrounds/latent');
await mkdir(output, { recursive: true });
const formatting = await resolveConfig(path.join(output, 'helpers.mjs'));
const hashes = {};
async function read(file) {
  const code = await readFile(path.join(reference, file), 'utf8');
  hashes[file] = createHash('sha256').update(code).digest('hex');
  return code;
}
async function emit(name, code) {
  await writeFile(path.join(output, name), await format(code, { ...formatting, parser: 'babel' }));
}
const source = await read('src/components/visualizer/backgrounds/latent/LatentBackground.tsx');
const a = source.indexOf('const MAX_SHADER_PIXELS ='),
  b = source.indexOf('const LatentBackground:');
if (a < 0 || b < a) throw new Error('Latent source boundaries changed');
await emit(
  'helpers.mjs',
  '// Generated Folia a8da4437, AGPL-3.0-only.\n' +
    (
      await transform(withoutBeatAnalysis(source.slice(a, b), 'helpers.mjs'), {
        loader: 'ts',
        format: 'esm',
        target: 'es2016',
      })
    ).code,
);
let palette = await read('src/utils/colorPalette.ts');
palette = palette.replaceAll(".toString(16).padStart(2, '0')", '.toString(16)');
// ES2016 lacks padStart. Keep exactly two hex digits without altering the median-cut algorithm.
palette = palette.replace(
  /const toHex = [\s\S]*?;\n\n\/\/ Uses/,
  'const hex=(v:number)=>(v<16?"0":"")+v.toString(16);\nconst toHex=({r,g,b}:WeightedColor)=>`#${hex(r)}${hex(g)}${hex(b)}`;\n\n// Uses',
);
await emit(
  'palette.mjs',
  '// Generated Folia a8da4437, AGPL-3.0-only.\n' +
    (await transform(palette, { loader: 'ts', format: 'esm', target: 'es2016' })).code,
);
const types = await read('src/types.ts');
const defaults = types.match(
  /export const DEFAULT_LATENT_BACKGROUND_TUNING[^=]*= (\{[\s\S]*?\n\});/,
);
if (!defaults) throw new Error('Missing Latent defaults');
await emit(
  'defaults.mjs',
  '// Source defaults. AGPL-3.0-only.\nexport const defaults=' + defaults[1] + ';',
);
for (const f of [
  'src/components/visualizer/backgrounds/latent/tuning.ts',
  'src/utils/colorExtractor.ts',
  'node_modules/@paper-design/shaders/dist/vertex-shader.js',
  'node_modules/@paper-design/shaders/dist/shader-utils.js',
  'node_modules/@paper-design/shaders/dist/shader-sizing.js',
  'node_modules/@paper-design/shaders-react/dist/shaders/dithering.js',
])
  await read(f);
const paper = 'node_modules/@paper-design/shaders/';
if (JSON.parse(await read(paper + 'package.json')).version !== '0.0.80')
  throw new Error('Expected Paper0.0.80');
for (const f of ['dithering', 'mesh-gradient']) await read(paper + 'dist/shaders/' + f + '.js');
const { ditheringFragmentShader } = await import(
  pathToFileURL(path.join(reference, paper, 'dist/shaders/dithering.js'))
);
const { meshGradientFragmentShader } = await import(
  pathToFileURL(path.join(reference, paper, 'dist/shaders/mesh-gradient.js'))
);
function port(code, prefix, argumentsText, mappings) {
  code = code
    .replace(/^#version[^\n]*\n/gm, '')
    .replace(/^precision[^\n]*;\n/gm, '')
    .replace(/^uniform[^\n]*;\n/gm, '')
    .replace(/^(in|out) [^\n]*;\n/gm, '');
  const names = new Set([
    'PI',
    'TWO_PI',
    ...Array.from(code.matchAll(/(?:float|vec[234]|mat[234])\s+(\w+)\s*\(/g), (m) => m[1]).filter(
      (n) => n !== 'main',
    ),
  ]);
  for (const name of names)
    code = code.replace(new RegExp('\\b' + name + '\\b', 'g'), prefix + name);
  for (const [name, value] of Object.entries(mappings))
    code = code.replace(new RegExp('\\b' + name + '\\b', 'g'), value);
  return code
    .replace('void main()', `vec4 ${prefix}sample(${argumentsText})`)
    .replace('fragColor = vec4(color, opacity);', 'return vec4(color, opacity);');
}
const dither = port(ditheringFragmentShader, 'd_', 'vec2 fragmentCoord', {
  u_time: 'ditherTime',
  u_resolution: 'resolution',
  u_pixelRatio: 'pixelRatio',
  u_originX: '.5',
  u_originY: '.5',
  u_worldWidth: '0.',
  u_worldHeight: '0.',
  u_fit: '0.',
  u_scale: '.6',
  u_rotation: '0.',
  u_offsetX: '0.',
  u_offsetY: '0.',
  u_pxSize: 'pixelSize',
  u_colorBack: 'straightColor(ditherBack)',
  u_colorFront: 'straightColor(ditherFront)',
  u_shape: '2.',
  u_type: '3.',
}).replaceAll('gl_FragCoord.xy', 'fragmentCoord');
let mesh = port(meshGradientFragmentShader, 'm_', 'vec2 v_objectUV', {
  u_time: 'meshTime',
  u_colorsCount: '6.',
  u_distortion: 'distortion',
  u_swirl: 'swirl',
  u_grainMixer: '0.',
  u_grainOverlay: '.01',
}).replaceAll('u_colors[i]', 'meshColor(i)');
if (mesh.includes('u_colors[')) throw new Error('Unported mesh color array');
const prelude = `#version 440
// Paper0.0.80 Apache2.0 shader bodies; Folia a8da4437 composition AGPL3.
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix;
 float qt_Opacity;
 vec2 resolution;
 float pixelRatio;
 float ditherTime;
 float meshTime;
 float pixelSize;
 float distortion;
 float swirl;
 float ditherOpacity;
 float ditherScale;
 float meshScale;
 float saturation;
 float brightness;
 float displayMode;
 float overlayOpacity;
 vec4 backgroundColor;
 vec4 ditherBack;
 vec4 ditherFront;
 vec4 mesh0; vec4 mesh1; vec4 mesh2; vec4 mesh3; vec4 mesh4; vec4 mesh5;
};
vec4 straightColor(vec4 c){return c.a>0.?vec4(c.rgb/c.a,c.a):vec4(0.);}
vec4 meshColor(int i){if(i==0)return straightColor(mesh0);if(i==1)return straightColor(mesh1);if(i==2)return straightColor(mesh2);if(i==3)return straightColor(mesh3);if(i==4)return straightColor(mesh4);return straightColor(mesh5);}
`;
const rawMesh = `
void main(){
 vec2 uv=vec2(qt_TexCoord0.x,1.-qt_TexCoord0.y);
 fragColor=m_sample((uv-.5)*resolution/min(resolution.x,resolution.y))*qt_Opacity;
}
`;
const rawDither = `
void main(){
 vec2 uv=vec2(qt_TexCoord0.x,1.-qt_TexCoord0.y);
 fragColor=d_sample(floor(uv*resolution)+vec2(.5))*qt_Opacity;
}
`;
const composite = `
layout(binding=1) uniform sampler2D meshSource;
layout(binding=2) uniform sampler2D ditherSource;
vec4 over(vec4 base,vec4 top){return top+base*(1.-top.a);}
vec3 softLight(vec3 base,vec3 blend){
 vec3 d=mix(((16.*base-12.)*base+4.)*base,sqrt(max(base,vec3(0.))),step(vec3(.25),base));
 return mix(base-(1.-2.*blend)*base*(1.-base),base+(2.*blend-1.)*(d-base),step(vec3(.5),blend));
}
void main(){
 vec4 color=backgroundColor;
 if(displayMode<1.5){
  vec4 mesh=texture(meshSource,(qt_TexCoord0-.5)/meshScale+.5);
  vec3 rgb=mesh.a>0.?mesh.rgb/mesh.a:vec3(0.);
  float l=dot(rgb,vec3(.2126,.7152,.0722));
  rgb=clamp((vec3(l)+(rgb-vec3(l))*saturation)*brightness,0.,1.);
  mesh.rgb=rgb*mesh.a;
  color=over(color,mesh);
 }
 if(displayMode<.5||displayMode>1.5){
  vec4 dither=texture(ditherSource,(qt_TexCoord0-.5)/ditherScale+.5);
  if(displayMode<.5){
   vec3 backdrop=color.a>0.?color.rgb/color.a:vec3(0.);
   vec3 source=dither.a>0.?dither.rgb/dither.a:vec3(0.);
   dither.rgb=mix(dither.rgb,softLight(backdrop,source)*dither.a,color.a);
   dither*=ditherOpacity;
  }
  color=over(color,dither);
 }
 color=over(color,backgroundColor*overlayOpacity);
 fragColor=color*qt_Opacity;
}
`;
const qt =
  process.env.FOLIA_QT_BIN ||
  path.resolve(root, '../EchoMusicNext/build/qt-official/6.12.0/macos/bin');
for (const [name, body] of [
  ['mesh', mesh + rawMesh],
  ['dithering', dither + rawDither],
  ['latent', composite],
]) {
  const shader = path.join(output, name + '.frag');
  await writeFile(shader, prelude + body);
  execFileSync(
    path.join(qt, 'qsb'),
    ['--glsl', '150,300es', '--hlsl', '50', '--msl', '12', '-o', shader + '.qsb', shader],
    { stdio: 'inherit' },
  );
}
for (const [f, n] of [
  ['LICENSE', 'PAPER-LICENSE.txt'],
  ['NOTICE', 'PAPER-NOTICE.txt'],
])
  await copyFile(path.join(reference, paper, f), path.join(output, n));
await writeFile(
  path.join(output, 'sources.json'),
  JSON.stringify({ revision, paper: '0.0.80', sha256: hashes }, null, 2) + '\n',
);
console.log('Generated exact Paper shader bodies and Folia Latent helpers.');
