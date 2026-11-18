// Original pinned Three shader expansion is a build-time operation only.
import { mkdir, writeFile, readFile, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { expandMachiMaterial } from './folia-reference/machi-program.mjs';
import { nativeShaderPair } from './folia-reference/rhi-glsl.mjs';
import { createNativeMachiRuntime } from '../plugins/folia-lyrics-skin/qml/styles/machi/runtime-factory.mjs';
import { shaderKey } from '../plugins/folia-lyrics-skin/qml/styles/machi/shader-key.mjs';
import { DEFAULT_DARK_THEME } from '../plugins/folia-lyrics-skin/qml/shared/theme/kernel.mjs';
import * as Native from '../plugins/folia-lyrics-skin/qml/styles/lumiere/native-measure.mjs';
import { configureNativePixels } from '../plugins/folia-lyrics-skin/qml/styles/machi/environment.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'plugins/folia-lyrics-skin/qml/styles/machi/shaders');
await mkdir(output, { recursive: true });
const registry = {};
const stages = new Map();
async function stage(source, extension) {
  const file =
    'stage-' + createHash('sha256').update(source).digest('hex').slice(0, 24) + '.' + extension;
  if (stages.has(file) && stages.get(file) !== source) throw Error('Shader stage digest collision');
  if (!stages.has(file)) {
    stages.set(file, source);
    await writeFile(path.join(output, file), source);
  }
  return file;
}
function plain(v) {
  if (v === null || v === undefined || typeof v !== 'object') return v;
  if (v.isTexture) return null;
  if (v.toArray) return v.toArray();
  if (Array.isArray(v) || ArrayBuffer.isView(v)) return Array.from(v, plain);
  return Object.fromEntries(
    Object.keys(v)
      .filter((k) => k !== 'properties')
      .map((k) => [k, plain(v[k])]),
  );
}
for (const dpr of [0.5, 0.75, 1, 1.5, 2, 3])
  for (const scene of ['konbini', 'station', 'kowloon'])
    for (const weather of ['clear', 'rain', 'snow', 'fog'])
      for (const shadowQuality of ['high', 'off'])
        for (const aa of ['off', 'fxaa', 'smaa', 'ssaa']) {
          Native.configure({ discovery: true });
          configureNativePixels([]);
          const r = createNativeMachiRuntime({
            width: 640,
            height: 480,
            resolution: dpr,
            program: [],
            seed: 'native',
            metadata: { title: 'Native', artist: 'Folia', album: '' },
            theme: { ...DEFAULT_DARK_THEME, fontFamily: 'PingFang SC' },
            tuning: {
              scene,
              weather,
              timeOfDay: 'night',
              quality: { antialias: aa, adaptive: false, shadows: shadowQuality },
            },
          });
          // Include every source material even when the fixture camera clips it.
          r.runtime.renderer.frustumCulling = false;
          try {
            for (const command of r.frame(10)) {
              if (command.type !== 'render') continue;
              const lights = command.lightState || {};
              for (const name of [
                'directional',
                'point',
                'spot',
                'hemi',
                'rectArea',
                'directionalShadowMap',
                'pointShadowMap',
                'spotShadowMap',
                'spotLightMap',
              ])
                if (!lights[name]) lights[name] = [];
              lights.numSpotLightShadowsWithMaps ||= 0;
              lights.numLightProbes ||= 0;
              for (const mesh of command.meshes) {
                const material = mesh.material,
                  geometry = mesh.geometry;
                const shadows = !command.depthOnly && command.lights.some((l) => l.castShadow);
                const key = shaderKey(material, geometry, lights, command.fog, shadows);
                if (registry[key]) continue;
                const object = Object.assign(Object.create(mesh.object), {
                  isInstancedMesh: material.isShaderMaterial && mesh.object.isInstancedMesh,
                  isBatchedMesh: false,
                });
                const expanded = expandMachiMaterial(material, object, lights, {
                  shadows,
                  scene: { fog: command.fog },
                });
                const drawData = !material.isShaderMaterial;
                const attributes = { position: 0, normal: 1, uv: 2, color: 3 };
                let at = 5;
                if (material.isShaderMaterial && mesh.object.isInstancedMesh) {
                  attributes.instanceMatrix = at;
                  at += 4;
                }
                for (const name of Object.keys(geometry.attributes).sort())
                  if (attributes[name] === undefined) attributes[name] = at++;
                let converted;
                try {
                  converted = nativeShaderPair(expanded.vertex, expanded.fragment, {
                    drawData,
                    attributes,
                  });
                } catch (error) {
                  console.error(
                    scene,
                    weather,
                    aa,
                    material.type,
                    material.name,
                    command.depthOnly,
                    key,
                  );
                  await writeFile(path.join(output, 'failed.vert'), expanded.vertex);
                  await writeFile(path.join(output, 'failed.frag'), expanded.fragment);
                  throw error;
                }
                // Opaque post targets store CoC/coverage in alpha. Preserve that
                // data; only straight-alpha blended materials need conversion.
                if (
                  !command.depthOnly &&
                  material.transparent &&
                  material.blending !== 0 &&
                  !material.premultipliedAlpha
                ) {
                  converted.fragment =
                    converted.fragment.replace(/\bvoid\s+main\s*\(/, 'void nativeSourceFragment(') +
                    '\nvoid main(){nativeSourceFragment();pc_fragColor.rgb*=pc_fragColor.a;}\n';
                }
                if (command.depthOnly)
                  converted.fragment = converted.fragment.replace(
                    /layout\(location=0\) out (\w+) (\w+);/g,
                    '$1 $2;',
                  );
                const name = 'program-' + key;
                const vertexShader = await stage(converted.vertex, 'vert');
                const fragmentShader = await stage(converted.fragment, 'frag');
                const { vertex, fragment, ...meta } = converted;
                registry[key] = {
                  ...meta,
                  name,
                  vertexShader,
                  fragmentShader,
                  drawData,
                  depthOnly: !!command.depthOnly,
                  defaults: Object.fromEntries(
                    Object.entries(expanded.uniforms).map(([k, v]) => [k, plain(v.value)]),
                  ),
                };
              }
            }
          } finally {
            r.destroy();
          }
        }
await writeFile(
  path.join(output, 'registry.mjs'),
  '// Pinned Folia AGPL-3.0-only / Three MIT; build-only expansion.\nexport const programs=' +
    JSON.stringify(registry, null, 2) +
    ';\n',
);
const configPath = path.join(root, 'plugins/folia-lyrics-skin/plugin.config.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
config.shaders = config.shaders.filter((v) => !v.source.startsWith('qml/styles/machi/shaders/'));
for (const file of stages.keys()) {
  const source = 'qml/styles/machi/shaders/' + file;
  config.shaders.push({ source, output: source + '.qsb', target: 'rhi' });
}
for (const file of [
  'prepare.vert',
  'canvas.frag',
  'gradient.frag',
  'background.frag',
  'present.vert',
  'present.frag',
]) {
  const source = 'qml/styles/machi/shaders/' + file;
  config.shaders.push({ source, output: source + '.qsb', target: 'rhi' });
}
await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
console.log(
  'Generated',
  Object.keys(registry).length,
  'pinned native Machi programs with',
  stages.size,
  'unique stages',
);

const wanted = new Set(stages.keys());
for (const file of await readdir(output))
  if (/^(?:program|stage)-.*\.(?:vert|frag)$/.test(file) && !wanted.has(file))
    await unlink(path.join(output, file));
