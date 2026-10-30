import { resolveFoliaReference } from './folia-reference.mjs';
// AGPL-3.0-only shader port; native Metal points and a portable expanded-quad path.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reference = await resolveFoliaReference(process.argv[2]);
const revision = 'a8da4437cf19723555bd75e4685ca20815fe5b82';
const sourcePath = 'src/components/visualizer/backgrounds/sora/SoraBackground.tsx';
const source = await readFile(path.join(reference, sourcePath), 'utf8');
const shader = (name) => {
  const match = source.match(new RegExp('const ' + name + '_SHADER = `([\\s\\S]*?)`;'));
  if (!match) throw new Error('Missing original ' + name + ' shader');
  return match[1];
};
const uniform = `layout(std140,binding=0) uniform buf {
mat4 qt_Matrix;
float qt_Opacity;
vec2 u_resolution;
float u_time;
vec4 u_particle_color;
vec4 u_particle_accent_color;
};\n`;
let vertex = shader('VERTEX')
  .replace('attribute float a_index;', '')
  .replace('uniform vec2 u_resolution;', '')
  .replace('uniform float u_time;', '')
  .replace('varying float v_color_type;', 'layout(location=1) out float v_color_type;')
  .replace('varying float v_intensity_base;', 'layout(location=2) out float v_intensity_base;')
  .replace(
    'void main() {',
    `void main() {
  // Four columns per point separate its quad from the next with degenerate triangles.
  // No connecting triangle covers pixels, and the original 150 point order is retained.
  float column=floor(qt_MultiTexCoord0.x*597.+.5);
  float slot=mod(column,4.);
  float a_index=floor(column/4.)+(slot>2.5?1.:0.);
  vec2 corner=vec2(slot<.5||slot>2.5?0.:1.,
                   slot<1.5?qt_MultiTexCoord0.y:(slot<2.5?1.:0.));
  v_pointCoord=corner;`,
  )
  .replace('gl_Position = vec4(ndc_x, ndc_y, 0.0, 1.0);', '')
  .replace(
    'gl_PointSize = max(2.0, pointSize);',
    `vec2 center=vec2((ndc_x+1.)*.5*u_resolution.x,(1.-ndc_y)*.5*u_resolution.y);
  vec2 position=center+(corner-.5)*max(2.,pointSize);
  gl_Position=qt_Matrix*vec4(position,0.,1.);`,
  );
let fragment = shader('FRAGMENT')
  .replace('precision mediump float;', '')
  .replace('uniform vec3 u_particle_color;', '')
  .replace('uniform vec3 u_particle_accent_color;', '')
  .replace('varying float v_color_type;', 'layout(location=1) in float v_color_type;')
  .replace('varying float v_intensity_base;', 'layout(location=2) in float v_intensity_base;')
  .replaceAll('gl_PointCoord', 'v_pointCoord')
  .replace(
    'u_particle_accent_color : u_particle_color',
    'u_particle_accent_color.rgb : u_particle_color.rgb',
  )
  .replace(
    'gl_FragColor = vec4(baseColor * alpha, alpha);',
    'fragColor = vec4(baseColor * alpha, alpha)*qt_Opacity;',
  );
vertex =
  '#version 440\nlayout(location=0) in vec4 qt_Vertex;\nlayout(location=1) in vec2 qt_MultiTexCoord0;\nlayout(location=0) out vec2 v_pointCoord;\n' +
  uniform +
  vertex;
fragment =
  '#version 440\nlayout(location=0) in vec2 v_pointCoord;\nlayout(location=0) out vec4 fragColor;\n' +
  uniform +
  fragment;
// Metal point sprites and triangle varyings rasterize fractional pixel centres
// differently. Keep the original point primitive and its render-target direction.
const pointVertex =
  '#version 440\nlayout(location=0) in vec4 qt_Vertex;\nlayout(location=1) in vec2 qt_MultiTexCoord0;\n' +
  uniform +
  shader('VERTEX')
    .replace('attribute float a_index;', '')
    .replace('uniform vec2 u_resolution;', '')
    .replace('uniform float u_time;', '')
    .replace('varying float v_color_type;', 'layout(location=1) out float v_color_type;')
    .replace('varying float v_intensity_base;', 'layout(location=2) out float v_intensity_base;')
    .replace('void main() {', 'void main() { float a_index=qt_MultiTexCoord0.x;')
    .replace(
      'gl_Position = vec4(ndc_x, ndc_y, 0.0, 1.0);',
      'gl_Position = vec4(ndc_x, -ndc_y, 0.0, 1.0);',
    );
const pointFragment = fragment
  .replace('layout(location=0) in vec2 v_pointCoord;', '')
  .replaceAll('v_pointCoord', 'gl_PointCoord');
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/backgrounds/sora');
await mkdir(output, { recursive: true });
const qt = process.env.FOLIA_QT_BIN;
for (const [name, code] of [
  ['sora.vert', vertex],
  ['sora.frag', fragment],
  ['sora-points.vert', pointVertex],
  ['sora-points.frag', pointFragment],
]) {
  const file = path.join(output, name);
  await writeFile(file, '// Original Folia Sora shader, a8da4437, AGPL-3.0-only.\n' + code);
  execFileSync(
    qt ? path.join(qt, 'qsb') : 'qsb',
    ['--glsl', '100 es,120,150', '--hlsl', '50', '--msl', '12', '-o', file + '.qsb', file],
    { stdio: 'inherit' },
  );
}
await writeFile(
  path.join(output, 'source.json'),
  JSON.stringify(
    {
      revision,
      sourcePath,
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      particleCount: 150,
      gridColumns: 597,
      adaptation:
        'Original GLSL formulas. Metal retains 150 point primitives in the source render-target direction; other backends retain the ordered independent quad transport.',
    },
    null,
    2,
  ) + '\n',
);
// Acceptance-only browser harness uses the original GL_POINTS shaders unchanged.
const oracle = path.join(root, 'build/folia-sora-reference');
await mkdir(oracle, { recursive: true });
await writeFile(
  path.join(oracle, 'index.html'),
  '<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0}canvas{display:block;width:800px;height:400px}</style><canvas width="800" height="400" id="stars"></canvas><script type="module" src="reference.js"></script>',
);
await build({
  stdin: {
    contents: `import * as twgl from 'twgl.js';
const canvas=document.getElementById('stars');
const gl=twgl.getContext(canvas,{alpha:false,depth:false,antialias:false,preserveDrawingBuffer:true});
if(!gl)throw new Error('Reference GL context unavailable');
const program=twgl.createProgramInfo(gl,[${JSON.stringify(shader('VERTEX'))},${JSON.stringify(shader('FRAGMENT'))}]);
const indices=new Float32Array(150);for(let i=0;i<150;i++)indices[i]=i;
const buffer=twgl.createBufferInfoFromArrays(gl,{a_index:{numComponents:1,data:indices}});
let time=0,mode='dark';
function render(){twgl.resizeCanvasToDisplaySize(canvas);gl.viewport(0,0,canvas.width,canvas.height);const light=mode.indexOf('light')>=0;gl.clearColor(light?1:0,light?1:0,light?1:0,1);gl.clear(gl.COLOR_BUFFER_BIT);if(mode.indexOf('blank')===0)return;gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(program.program);twgl.setBuffersAndAttributes(gl,program,buffer);twgl.setUniforms(program,{u_resolution:[canvas.width,canvas.height],u_time:time,u_particle_color:light?[0,0,0]:[1,1,1],u_particle_accent_color:[102/255,153/255,1]});twgl.drawBufferInfo(gl,buffer,gl.POINTS);}
window.reference={setMode(value){mode=value;render();},setTime(value){time=value;render();},describe(){return [{width:canvas.width,height:canvas.height,particleCount:150}];}};render();window.referenceReady=true;`,
    resolveDir: reference,
    loader: 'js',
    sourcefile: 'sora-reference.js',
  },
  bundle: true,
  format: 'esm',
  platform: 'browser',
  outfile: path.join(oracle, 'reference.js'),
});
await writeFile(
  path.join(oracle, 'reference.json'),
  JSON.stringify(
    {
      prefix: 'sora',
      foliaRevision: revision,
      logicalWidth: 800,
      logicalHeight: 400,
      times: [0, 1, 3],
      modes: ['dark', 'light', 'blank-dark', 'blank-light'],
      fixture:
        'Unchanged original GL_POINTS shader with authored theme colors; twgl logical-pixel canvas sizing.',
    },
    null,
    2,
  ) + '\n',
);
