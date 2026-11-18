// Translate the pinned source GLSL into explicit RHI interfaces. No effect math is rewritten.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as scene from '../plugins/folia-lyrics-skin/qml/styles/nebbia/source/nebbiaShaders.mjs';
import * as mask from '../plugins/folia-lyrics-skin/qml/styles/nebbia/source/nebbiaMaskGl.mjs';
import * as flake from '../plugins/folia-lyrics-skin/qml/styles/nebbia/source/nebbiaSnowGl.mjs';
import * as firefly from '../plugins/folia-lyrics-skin/qml/styles/nebbia/source/nebbiaFireflyGl.mjs';
const output = fileURLToPath(
  new URL('../plugins/folia-lyrics-skin/qml/styles/nebbia/shaders/', import.meta.url),
);
await mkdir(output, { recursive: true });
const programs = [];
for (const outside of ['night', 'aquarium'])
  for (const glass of ['rain', 'dew', 'snow']) {
    const values = scene.nebbiaSceneShaders(outside, glass);
    for (const kind of ['fog', 'main', 'mainFallback'])
      programs.push({
        name: outside + '-' + glass + '-' + kind,
        vs: scene.NEBBIA_VS,
        fs: values[kind],
        attributes: { aPos: 0 },
      });
  }
for (const [name, vs, fs, attributes] of [
  ['sprite', scene.NEBBIA_SPRITE_VS, scene.NEBBIA_SPRITE_FS, { aCorner: 0, aRect: 1, aParam: 2 }],
  ['mask', mask.NEBBIA_MASK_VS, mask.NEBBIA_MASK_FS, { aCorner: 0, aSeg: 1, aParam: 2 }],
  ['buildings', scene.NEBBIA_VS, scene.NEBBIA_BLD_FILL_FS, { aPos: 0 }],
  ['noise', scene.NEBBIA_VS, scene.NEBBIA_NOISE_FS, { aPos: 0 }],
  ['flake', flake.NEBBIA_FLAKE_VS, flake.NEBBIA_FLAKE_FS, { aCorner: 0, aA: 1, aB: 2, aC: 3 }],
  [
    'firefly',
    firefly.NEBBIA_FIREFLY_VS,
    firefly.NEBBIA_FIREFLY_FS,
    { aCorner: 0, aA: 1, aB: 2, aC: 3 },
  ],
])
  programs.push({ name, vs, fs, attributes });
const uniformRE = /\buniform\s+(?:(?:highp|mediump|lowp)\s+)?(\w+)\s+([^;]+);/g;
const align = (n, a) => Math.ceil(n / a) * a;
const registry = {};
function key(vs, fs) {
  let a = 2166136261,
    b = 0x9e3779b9;
  const s = vs + '\n' + fs;
  for (let i = 0; i < s.length; ++i) {
    a = Math.imul(a ^ s.charCodeAt(i), 16777619);
    b = Math.imul(b ^ s.charCodeAt(i), 0x85ebca6b);
  }
  return (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16) + '-' + s.length;
}
for (const program of programs) {
  const uniforms = new Map(),
    samplers = new Map();
  for (const code of [program.vs, program.fs])
    for (const [, type, names] of code.matchAll(uniformRE))
      for (const raw of names.split(',')) {
        const m = /^\s*(\w+)\s*(?:\[\s*(\d+)\s*\])?\s*$/.exec(raw);
        if (!m) throw Error('Unsupported source uniform ' + raw);
        const name = m[1],
          count = Number(m[2] || 1),
          isArray = !!m[2];
        const target = type.startsWith('sampler') ? samplers : uniforms;
        if (target.has(name) && target.get(name).type !== type)
          throw Error('Inconsistent source uniform ' + name);
        target.set(name, { name, type, count, isArray });
      }
  uniforms.set('uNativeTarget', { name: 'uNativeTarget', type: 'vec4', count: 1, isArray: false });
  let offset = 0;
  for (const value of uniforms.values()) {
    const channels = Number(/vec([234])/.exec(value.type)?.[1] || 1);
    const alignment = value.isArray ? 16 : channels === 1 ? 4 : channels === 2 ? 8 : 16;
    offset = align(offset, alignment);
    value.offset = offset;
    value.stride = value.isArray ? 16 : channels * 4;
    value.channels = channels;
    offset += value.stride * value.count;
  }
  let binding = 2;
  for (const value of samplers.values()) value.binding = binding++;
  const block =
    'layout(std140,binding=0) uniform NativeFrame { vec4 nativeViewport; vec4 nativeOutput; mat4 nativeCorrection; };\n' +
    'layout(std140,binding=1) uniform NebbiaUniforms {\n' +
    [...uniforms.values()]
      .map((u) => '  ' + u.type + ' ' + u.name + (u.isArray ? '[' + u.count + ']' : '') + ';')
      .join('\n') +
    '\n};\n';
  const varyingNames = new Map();
  const stripped = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  for (const match of stripped(program.vs).matchAll(/\b(out)\s+(?:highp\s+)?\w+\s+(\w+)\s*;/g))
    varyingNames.set(match[2], varyingNames.size);
  function convert(code, stage) {
    code = code
      .replace(/^#version[^\n]*\n/, '')
      .replace(/\bprecision\s+\w+\s+\w+\s*;/g, '')
      .replace(uniformRE, '');
    code = code.replace(
      /(?:layout\s*\(\s*location\s*=\s*\d+\s*\)\s*)?(flat\s+)?\b(in|out)\s+(\w+)\s+(\w+)\s*;/g,
      (_, flat, io, type, name) => {
        const loc =
          stage === 'vert' && io === 'in'
            ? program.attributes[name]
            : stage === 'frag' && io === 'out'
              ? 0
              : varyingNames.get(name);
        if (loc === undefined) throw Error('Missing location ' + stage + ' ' + name);
        return 'layout(location=' + loc + ') ' + (flat || '') + io + ' ' + type + ' ' + name + ';';
      },
    );
    code = code.replace(/\blevel\s*\(/g, 'nebbiaLevel(');
    let helpers = '';
    if (stage === 'vert') {
      code = code.replace(/\bvoid\s+main\s*\(/, 'void nebbiaSourceMain(');
      code +=
        '\nvoid main() { nebbiaSourceMain(); if (nativeOutput.w < .5 && uNativeTarget.z > .5) gl_Position.y = -gl_Position.y; gl_Position = nativeCorrection * gl_Position; }\n';
    } else {
      code = code.replace(/\bgl_FragCoord\b/g, 'nebbiaFragCoord()');
      helpers =
        'vec4 nebbiaFragCoord() { return vec4(gl_FragCoord.x, mix(uNativeTarget.y-gl_FragCoord.y,gl_FragCoord.y,max(nativeOutput.w,uNativeTarget.z)),gl_FragCoord.zw); }\n';
    }
    return (
      '#version 440\n// Folia 8006b40f · AGPL-3.0-only · ' +
      program.name +
      '\n' +
      block +
      [...samplers.values()]
        .map((u) => 'layout(binding=' + u.binding + ') uniform ' + u.type + ' ' + u.name + ';')
        .join('\n') +
      '\n' +
      helpers +
      code
    );
  }
  await writeFile(path.join(output, program.name + '.vert'), convert(program.vs, 'vert'));
  await writeFile(path.join(output, program.name + '.frag'), convert(program.fs, 'frag'));
  const id = key(program.vs, program.fs);
  registry[id] = {
    name: program.name,
    bytes: align(offset, 16),
    uniforms: [...uniforms.values()],
    samplers: [...samplers.values()],
    attributes: program.attributes,
  };
}
await writeFile(
  path.join(output, 'registry.mjs'),
  '// Generated pinned GLSL interface; AGPL-3.0-only\nexport const programs = ' +
    JSON.stringify(registry, null, 2) +
    ';\n',
);
console.log('Generated ' + programs.length + ' original Nebbia programs');
