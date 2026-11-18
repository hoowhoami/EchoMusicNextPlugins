// Build-only GLSL interface conversion; preprocessing leaves source lighting/effect math intact.
import { execFileSync } from 'node:child_process';
const align = (n, a) => Math.ceil(n / a) * a;
export function preprocess(code) {
  code = code.replace(/^#version[^\n]*$/gm, '').replace(/^#extension[^\n]*$/gm, '');
  return execFileSync(
    'clang',
    [
      '-E',
      '-P',
      '-x',
      'c',
      '-nostdinc',
      '-undef',
      '-Wno-invalid-pp-token',
      '-D__VERSION__=300',
      '-',
    ],
    { input: code, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  )
    .replace(/\bprecision\s+\w+\s+\w+\s*;/g, '')
    .replace(/\b(highp|mediump|lowp)\s+/g, '');
}
export function nativeShaderPair(
  vertex,
  fragment,
  { drawData = false, attributes = { position: 0, normal: 1, uv: 2, color: 3 } } = {},
) {
  const stages = { vert: preprocess(vertex), frag: preprocess(fragment) },
    structures = new Map(),
    uniforms = new Map(),
    samplers = new Map(),
    varyings = new Map();
  const drawFields = new Set([
    'modelMatrix',
    'modelViewMatrix',
    'normalMatrix',
    'diffuse',
    'emissive',
    'opacity',
    'uMachiGloss',
    'receiveShadow',
  ]);
  const fields = (source) =>
    [...source.matchAll(/\b(\w+)\s+(\w+)\s*(?:\[\s*(\d+)\s*\])?\s*;/g)].map(
      ([, type, name, count]) => ({ type, name, count: Number(count || 1), array: !!count }),
    );
  for (const stage of ['vert', 'frag']) {
    stages[stage] = stages[stage].replace(
      /\bstruct\s+(\w+)\s*\{([^{}]*)\}\s*;/g,
      (source, name, body) => {
        structures.set(name, { source, fields: fields(body) });
        return '';
      },
    );
    stages[stage] = stages[stage].replace(/\buniform\s+(\w+)\s+([^;]+);/g, (_, type, names) => {
      for (const raw of names.split(',')) {
        const m = /^\s*(\w+)\s*(?:\[\s*(\d+)\s*\])?\s*$/.exec(raw);
        if (!m) throw Error('Unrecognized native shader uniform ' + raw);
        const value = { type, name: m[1], count: Number(m[2] || 1), array: !!m[2] };
        if (drawData && drawFields.has(value.name)) continue;
        const target = type.startsWith('sampler') ? samplers : uniforms;
        if (
          target.has(value.name) &&
          JSON.stringify(target.get(value.name)) !== JSON.stringify(value)
        )
          throw Error('Inconsistent native uniform ' + value.name);
        target.set(value.name, value);
      }
      return '';
    });
  }
  let comparison = false;
  for (const stage of ['vert', 'frag']) {
    if (stages[stage].includes('sampler2DShadow')) comparison = true;
    stages[stage] = stages[stage]
      .replace(/sampler2DShadow/g, 'sampler2D')
      .replace(/\btexture\s*\(\s*shadowMap\s*,/g, 'nativeShadowCompare(shadowMap,');
  }
  for (const u of samplers.values())
    if (u.type === 'sampler2DShadow') {
      u.type = 'sampler2D';
      comparison = true;
    }
  uniforms.set('nativeTarget', { type: 'vec4', name: 'nativeTarget', count: 1, array: false });
  const layoutCache = new Map();
  function layout(type) {
    if (layoutCache.has(type)) return layoutCache.get(type);
    const scalar = ['float', 'int', 'uint', 'bool'].includes(type),
      vector = /^[biu]?vec([234])$/.exec(type),
      matrix = /^mat([234])$/.exec(type);
    if (scalar) return { alignment: 4, size: 4, channels: 1 };
    if (vector) {
      const n = Number(vector[1]);
      return { alignment: n === 2 ? 8 : 16, size: n * 4, channels: n };
    }
    if (matrix) {
      const n = Number(matrix[1]);
      return { alignment: 16, size: n * 16, channels: n * n, columns: n };
    }
    const struct = structures.get(type);
    if (!struct) throw Error('Unknown native shader type ' + type);
    let offset = 0,
      maxAlignment = 16;
    const members = [];
    for (const field of struct.fields) {
      const shape = layout(field.type),
        alignment = field.array ? 16 : shape.alignment,
        stride = field.array ? align(shape.size, 16) : shape.size;
      offset = align(offset, alignment);
      members.push({ ...field, ...shape, offset, stride });
      offset += stride * field.count;
      maxAlignment = Math.max(maxAlignment, alignment);
    }
    const value = {
      alignment: align(maxAlignment, 16),
      size: align(offset, align(maxAlignment, 16)),
      members,
    };
    layoutCache.set(type, value);
    return value;
  }
  let offset = 0;
  const metadata = [];
  for (const value of uniforms.values()) {
    const shape = layout(value.type),
      alignment = value.array ? Math.max(16, shape.alignment) : shape.alignment,
      stride = value.array ? align(shape.size, 16) : shape.size;
    offset = align(offset, alignment);
    metadata.push({ ...value, ...shape, offset, stride });
    offset += stride * value.count;
  }
  const bytes = Math.max(16, align(offset, 16));
  const flattenedSamplers = [];
  for (const sampler of samplers.values()) {
    if (!sampler.array) {
      flattenedSamplers.push(sampler);
      continue;
    }
    for (let index = 0; index < sampler.count; ++index) {
      const name = sampler.name + '_' + index;
      for (const stage of ['vert', 'frag'])
        stages[stage] = stages[stage].replace(
          new RegExp('\\b' + sampler.name + '\\s*\\[\\s*' + index + '\\s*\\]', 'g'),
          name,
        );
      flattenedSamplers.push({
        ...sampler,
        name,
        sourceName: sampler.name,
        index,
        count: 1,
        array: false,
      });
    }
    for (const stage of ['vert', 'frag'])
      if (new RegExp('\\b' + sampler.name + '\\s*\\[').test(stages[stage]))
        throw Error('Dynamic sampler arrays require an explicit native source adaptation');
  }
  samplers.clear();
  for (const sampler of flattenedSamplers) samplers.set(sampler.name, sampler);
  let binding = drawData ? 3 : 2;
  for (const sampler of samplers.values()) sampler.binding = binding++;
  if (binding > 32) throw Error('Native shader sampler binding budget exceeded');
  let varyingLocation = 0;
  for (const [, name, count] of stages.vert.matchAll(
    /\bout\s+\w+\s+(\w+)\s*(?:\[\s*(\d+)\s*\])?\s*;/g,
  ))
    if (!varyings.has(name)) {
      varyings.set(name, varyingLocation);
      varyingLocation += Number(count || 1);
    }
  stages.frag = stages.frag.replace(
    /\bin\s+\w+\s+(\w+)\s*(?:\[\s*\d+\s*\])?\s*;/g,
    (source, name) => {
      if (varyings.has(name)) return source;
      if ((stages.frag.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length === 1) return '';
      throw Error('Native fragment input has no vertex output: ' + name);
    },
  );
  function convert(stage) {
    let code = stages[stage].replace(/\blayout\s*\([^)]*\)\s*(?=(?:in|out)\b)/g, '');
    code = code.replace(
      /\b(in|out)\s+(\w+)\s+(\w+)\s*(\[\s*\d+\s*\])?\s*;/g,
      (_, io, type, name, array) => {
        const location =
          stage === 'vert' && io === 'in'
            ? attributes[name]
            : stage === 'frag' && io === 'out'
              ? 0
              : varyings.get(name);
        if (location === undefined)
          throw Error('Native shader location missing for ' + stage + ' ' + name);
        return (
          'layout(location=' + location + ') ' + io + ' ' + type + ' ' + name + (array || '') + ';'
        );
      },
    );
    let native =
      'layout(std140,binding=0) uniform NativeFrame {vec4 nativeViewport;vec4 nativeOutput;mat4 nativeCorrection;};\n';
    native +=
      'layout(std140,binding=1) uniform NativeUniforms {\n' +
      [...uniforms.values()]
        .map((u) => u.type + ' ' + u.name + (u.array ? '[' + u.count + ']' : '') + ';')
        .join('\n') +
      '\n};\n';
    native +=
      [...samplers.values()]
        .map((u) => 'layout(binding=' + u.binding + ') uniform ' + u.type + ' ' + u.name + ';')
        .join('\n') + '\n';
    if (drawData) {
      native += 'layout(binding=2) uniform sampler2D nativeObjects;\n';
      if (stage === 'vert')
        native +=
          'layout(location=4) in float nativeDraw;\nlayout(location=' +
          varyingLocation +
          ') flat out int nativeDrawId;\nint nativeObjectId(){return int(nativeDraw+.5);}\n';
      else
        native +=
          'layout(location=' +
          varyingLocation +
          ') flat in int nativeDrawId;\nint nativeObjectId(){return nativeDrawId;}\n';
      native +=
        'vec4 nativeObject(int column){return texelFetch(nativeObjects,ivec2(column,nativeObjectId()),0);}\n';
      native +=
        '#define modelMatrix mat4(nativeObject(0),nativeObject(1),nativeObject(2),nativeObject(3))\n#define modelViewMatrix mat4(nativeObject(4),nativeObject(5),nativeObject(6),nativeObject(7))\n#define normalMatrix mat3(nativeObject(8).xyz,nativeObject(9).xyz,nativeObject(10).xyz)\n#define diffuse nativeObject(11).rgb\n#define opacity nativeObject(11).a\n#define emissive nativeObject(12).rgb\n#define uMachiGloss nativeObject(13).xy\n#define receiveShadow (nativeObject(14).x>.5)\n';
    }
    if (stage === 'frag' && comparison)
      native +=
        'float nativeShadowCompare(sampler2D image,vec3 p){ivec2 size=textureSize(image,0);vec2 q=p.xy*vec2(size)-.5;ivec2 b=ivec2(floor(q));vec2 f=fract(q);ivec2 hi=size-1;float a=step(p.z,texelFetch(image,clamp(b,ivec2(0),hi),0).r);float c=step(p.z,texelFetch(image,clamp(b+ivec2(1,0),ivec2(0),hi),0).r);float d=step(p.z,texelFetch(image,clamp(b+ivec2(0,1),ivec2(0),hi),0).r);float e=step(p.z,texelFetch(image,clamp(b+ivec2(1,1),ivec2(0),hi),0).r);return mix(mix(a,c,f.x),mix(d,e,f.x),f.y); }\n';
    if (stage === 'frag') {
      code = code.replace(/\bgl_FragCoord\b/g, 'nativeFragCoord()');
      native +=
        'vec4 nativeFragCoord(){return vec4(gl_FragCoord.x,mix(nativeTarget.y-gl_FragCoord.y,gl_FragCoord.y,max(nativeOutput.w,nativeTarget.z)),gl_FragCoord.zw); }\n';
    }
    if (stage === 'vert') {
      code = code.replace(/\bvoid\s+main\s*\(/, 'void nativeSourceMain(');
      code +=
        '\nvoid main(){' +
        (drawData ? 'nativeDrawId=nativeObjectId();' : '') +
        'nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}\n';
    }
    return (
      '#version 440\n// Folia/Three pinned source math; see package notices.\n' +
      [...structures.values()].map((s) => s.source).join('\n') +
      '\n' +
      native +
      code
    );
  }
  return {
    vertex: convert('vert'),
    fragment: convert('frag'),
    bytes,
    uniforms: metadata,
    samplers: [...samplers.values()],
    attributes,
  };
}
