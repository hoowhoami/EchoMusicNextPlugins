import { withoutBeatAnalysis } from './folia-visual-scope.mjs';
import { resolveFoliaReference } from './folia-reference.mjs';
// Build-time source port. Folia AGPL3; Paper 0.0.80 Apache2.0 (bundled notices).
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
// Keep the former Quick sources as exact source comparisons. They are never baked or consumed.
const comparisons = {};
for (const [name, body] of [
  ['mesh', mesh + rawMesh],
  ['dithering', dither + rawDither],
  ['latent', composite],
]) {
  comparisons[name] = prelude + body;
  await writeFile(path.join(output, name + '.frag'), comparisons[name]);
}

// Source-owned RHI ABI and boundary adapters. QSB generation belongs exclusively to plugin.config.json.
await mkdir(path.join(output, 'gpu'), { recursive: true });
await writeFile(
  path.join(output, 'gpu/frame.glsl'),
  `// EchoGpuSurface public frame ABI; not the Qt Quick ShaderEffect uniform block.
layout(std140,binding=0) uniform Frame {
 vec4 viewport;
 vec4 outputInfo;
 mat4 correction;
} frame;
`,
);
await writeFile(
  path.join(output, 'gpu/parameters.glsl'),
  `// 13 std140 vec4 slots, packed by ../gpu.mjs. Colors are premultiplied sRGB.
layout(std140,binding=1) uniform Parameters {
 vec4 targetInfo;
 vec4 animation;
 vec4 effect;
 vec4 grade;
 vec4 backgroundColor;
 vec4 ditherBack;
 vec4 ditherFront;
 vec4 mesh0; vec4 mesh1; vec4 mesh2; vec4 mesh3; vec4 mesh4; vec4 mesh5;
};
#define resolution targetInfo.xy
#define pixelRatio targetInfo.z
#define ditherTime animation.x
#define meshTime animation.y
#define pixelSize animation.z
#define distortion animation.w
#define swirl effect.x
#define ditherOpacity effect.y
#define ditherScale effect.z
#define meshScale effect.w
#define saturation grade.x
#define brightness grade.y
#define displayMode grade.z
#define overlayOpacity grade.w
vec4 straightColor(vec4 c){return c.a>0.?vec4(c.rgb/c.a,c.a):vec4(0.);}
vec4 meshColor(int i){if(i==0)return straightColor(mesh0);if(i==1)return straightColor(mesh1);if(i==2)return straightColor(mesh2);if(i==3)return straightColor(mesh3);if(i==4)return straightColor(mesh4);return straightColor(mesh5);}
`,
);
await writeFile(
  path.join(output, 'gpu/fullscreen.vert'),
  `#version 440
#extension GL_GOOGLE_include_directive : require
#include "frame.glsl"
layout(location=0) out vec2 uv;
void main(){
 vec2 p=vec2((gl_VertexIndex<<1)&2,gl_VertexIndex&2);
 uv=p; // Logical top-left origin on every RHI backend.
 gl_Position=frame.correction*vec4(p.x*2.-1.,1.-p.y*2.,0.,1.);
}
`,
);
await writeFile(
  path.join(output, 'gpu/color.glsl'),
  `// Paper sources are encoded premultiplied sRGB. EchoGpuSurface accepts linear premultiplied RGBA.
// Its SDR output pass encodes back to RGBA8, preserving the original Quick source sampling space.
vec3 srgbToLinear(vec3 c){
 return mix(c/12.92,pow((c+vec3(.055))/1.055,vec3(2.4)),step(vec3(.04045),c));
}
vec4 sourceToLinear(vec4 color){
 vec3 straight=color.a>0.?color.rgb/color.a:vec3(0.);
 return vec4(srgbToLinear(straight)*color.a,color.a);
}
`,
);
const rhiPrelude = (source) => `#version 440
#extension GL_GOOGLE_include_directive : require
// RHI adaptation of ../${source}; Paper 0.0.80 Apache-2.0, Folia a8da4437 AGPL-3.0-only.
// The algorithm below is retained verbatim; only bindings, entry coordinates and output ABI differ.
#include "parameters.glsl"
#include "color.glsl"
layout(location=0) in vec2 uv;
layout(location=0) out vec4 fragColor;
`;
for (const [name, marker, sample] of [
  ['mesh', '#define m_TWO_PI', 'm_sample((paperUV-.5)*resolution/min(resolution.x,resolution.y))'],
  ['dithering', 'vec3 d_permute', 'd_sample(floor(paperUV*resolution)+vec2(.5))'],
]) {
  const original = comparisons[name];
  const algorithm = original.slice(original.indexOf(marker), original.lastIndexOf('void main()'));
  await writeFile(
    path.join(output, 'gpu', name + '.frag'),
    rhiPrelude(name + '.frag') +
      algorithm +
      `void main(){
 vec2 paperUV=vec2(uv.x,1.-uv.y);
 fragColor=sourceToLinear(${sample});
}
`,
  );
}
// Full-resolution Quick composition preserves the original CSS color space and opacity ABI.
await writeFile(path.join(output, 'gpu/composition.frag'), comparisons.latent);
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
