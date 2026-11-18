import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import * as original from '../plugins/folia-lyrics-skin/qml/styles/metaphor/source/metaphorShaders.mjs';
const out = fileURLToPath(
  new URL('../plugins/folia-lyrics-skin/qml/styles/metaphor/', import.meta.url),
);
const notice =
  '// Derived from Folia 8006b40f (AGPL-3.0-only). Original field/develop expressions retained.\n';
const attributes =
  'layout(location=0) in vec4 qt_Vertex;\nlayout(location=1) in vec2 qt_MultiTexCoord0;\n';
const glyphBlock =
  'mat4 qt_Matrix; float qt_Opacity; vec2 viewport; vec4 camera; float uTime; float uMelt; float uPop; float uReveal; float uShakeTime; float uWobble; float uOutputTint; float uEnabled;';
const shapeBlock =
  'mat4 qt_Matrix; float qt_Opacity; vec2 viewport; vec4 camera; float uTime; float uWobble; vec3 uAccent; float uOutputTint; float uEnabled; float uCount;';
const project = `
vec4 projectWorld(vec2 world) {
  vec2 p = world - camera.xy;
  float c = cos(camera.w), s = sin(camera.w);
  vec2 view = vec2(p.x*c + p.y*s, -p.x*s + p.y*c);
  float scale = viewport.y * .5 / (max(camera.z, .001) * tan(radians(15.0)));
  return qt_Matrix * vec4(viewport*.5 + view*vec2(1.,-1.)*scale,0.,1.);
}
vec2 instanceCorner(out int index) {
  int count = textureSize(instanceData, 0).y;
  float row = floor(qt_MultiTexCoord0.y * (float(count)*4.-1.) + .5);
  float part = mod(row,4.);
  index = min(count-1, int(floor(row/4.) + (part>2.5?1.:0.)));
  return part<.5 ? vec2(qt_MultiTexCoord0.x,1.) : part<1.5 ? vec2(qt_MultiTexCoord0.x,0.) : part<2.5 ? vec2(1.,0.) : vec2(0.,1.);
}
`;
function adapt(code, direction) {
  let location = 0;
  return code
    .replace(/^attribute[^;]+;\s*/gm, '')
    .replace(/^uniform[^;]+;\s*/gm, '')
    .replace(
      /^varying ([^;]+);/gm,
      (_, declaration) => `layout(location=${location++}) ${direction} ${declaration};`,
    )
    .replace(/^layout\(location = 1\) out highp vec4 outTint;\s*/m, '')
    .replaceAll('texture2D(', 'texture(');
}
const block = (value) => `layout(std140,binding=0) uniform buf {${value}};\n`;
let vertex = adapt(original.METAPHOR_GLYPH_VERTEX, 'out');
vertex = vertex
  .replace(
    'void main() {',
    `void main() {
  int index; vec2 corner = instanceCorner(index);
  vec4 p0=texelFetch(instanceData,ivec2(0,index),0), p1=texelFetch(instanceData,ivec2(1,index),0), p2=texelFetch(instanceData,ivec2(2,index),0);
  vec2 c=corner*2.-1.; float halfCell=p0.z*(128./72.)*.5;
  vec2 aOffset=vec2(c.x*cos(p0.w)-c.y*sin(p0.w),c.x*sin(p0.w)+c.y*cos(p0.w))*halfCell;
  vec3 position=vec3(p0.xy,0.); vec2 aTime=p1.xy; vec3 aMeta=vec3(p1.zw,p0.z); vec3 aTint=p2.rgb;
  int cell=int(p2.w); vec2 atlasSize=vec2(textureSize(uAtlas,0));
  vec2 uv=(vec2(cell%8,cell/8)*128.+vec2(corner.x,1.-corner.y)*128.)/atlasSize;
`,
  )
  .replace('(modelMatrix * vec4(p, 1.0)).xy', 'p.xy')
  .replace(/    int corner =[^;]+;\s*vQuad =[^;]+;/, '    vQuad = c;')
  .replace('projectionMatrix * modelViewMatrix * vec4(p, 1.0)', 'projectWorld(p.xy)');
await writeFile(
  out + 'glyph.vert',
  '#version 440\n' +
    notice +
    attributes +
    block(glyphBlock) +
    'layout(binding=1) uniform sampler2D uAtlas;\nlayout(binding=2) uniform sampler2D instanceData;\n' +
    project +
    vertex,
);
let shape = adapt(original.METAPHOR_SHAPE_VERTEX, 'out');
shape = shape
  .replace(
    'void main() {',
    `void main() {
 int index; vec2 corner=instanceCorner(index);
 vec4 p0=texelFetch(instanceData,ivec2(0,index),0),p1=texelFetch(instanceData,ivec2(1,index),0),p2=texelFetch(instanceData,ivec2(2,index),0);
 vec2 position=corner*2.-1.,iPos=p0.xy,iScale=p0.zw;
 float iRot=p1.x,iShape=p2.x,iParam=p2.y; vec3 iMix=p1.yzw;
`,
  )
  .replace('projectionMatrix * modelViewMatrix * vec4(iPos + o, 0.0, 1.0)', 'projectWorld(iPos+o)');
await writeFile(
  out + 'shape.vert',
  '#version 440\n' +
    notice +
    attributes +
    block(shapeBlock) +
    'layout(binding=1) uniform sampler2D instanceData;\n' +
    project.replace(
      'int count = textureSize(instanceData, 0).y;',
      'int count = max(1, int(uCount));',
    ) +
    shape,
);
for (const [name, source, uniforms, samplers] of [
  [
    'glyph',
    original.METAPHOR_GLYPH_FRAGMENT,
    glyphBlock,
    'layout(binding=1) uniform sampler2D uAtlas;',
  ],
  ['shape', original.METAPHOR_SHAPE_FRAGMENT, shapeBlock, ''],
]) {
  const fragment = adapt(source, 'in').replace('void main()', 'void sourceMain()');
  await writeFile(
    out + name + '.frag',
    '#version 440\n' +
      notice +
      block(uniforms) +
      samplers +
      '\nlayout(location=0) out vec4 fragColor;\nvec4 fieldColor,tintColor;\n#define gl_FragColor fieldColor\n#define outTint tintColor\n' +
      fragment +
      '\nvoid main(){sourceMain();fragColor=(uOutputTint>.5?tintColor:fieldColor)*qt_Opacity*uEnabled;}\n',
  );
}
const developBlock =
  'mat4 qt_Matrix; float qt_Opacity; vec2 uRes; float uPixelRatio; float uTime; float uFlow; float uGrain; float uDot; float uAngle; float uFlood; float uInvert; float uSeed; float uSeeThrough; vec3 uPaper; vec3 uInk; vec3 uAccent; vec3 uTone;';
await writeFile(
  out + 'develop.frag',
  '#version 440\n' +
    notice +
    block(developBlock) +
    'layout(binding=1) uniform sampler2D uField;\nlayout(binding=2) uniform sampler2D uTint;\nlayout(location=0) out vec4 fragColor;\n' +
    adapt(original.METAPHOR_DEVELOP_FRAGMENT, 'in')
      .replaceAll('gl_FragColor', 'fragColor')
      .replace(' * alpha, alpha)', ' * alpha, alpha) * qt_Opacity'),
);
// Default Qt vertex shader supplies qt_TexCoord0 at location 0, used as vUv above.
