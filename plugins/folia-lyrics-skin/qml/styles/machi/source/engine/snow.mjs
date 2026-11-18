// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/snow.ts
import * as THREE from '../../three.mjs';
const MACHI_SNOW_MAX_ROOFS = 4;
const createMachiSnowUniforms = () => ({
  uMachiSnow: { value: 0 },
  uMachiSnowColor: { value: new THREE.Color(15922682) },
  uMachiViewUp: { value: new THREE.Vector3(0, 1, 0) },
  uMachiRoofs: { value: Array.from({ length: MACHI_SNOW_MAX_ROOFS }, () => new THREE.Vector4()) },
  uMachiRoofY: { value: Array.from({ length: MACHI_SNOW_MAX_ROOFS }, () => -100) },
  uMachiWet: { value: 0 },
});
const setMachiSnowRoofs = (uniforms, roofs) => {
  var _a, _b, _c, _d, _e;
  for (let index = 0; index < MACHI_SNOW_MAX_ROOFS; index += 1) {
    const roof = roofs[index];
    uniforms.uMachiRoofs.value[index].set(
      (_a = roof == null ? void 0 : roof.x0) != null ? _a : 0,
      (_b = roof == null ? void 0 : roof.z0) != null ? _b : 0,
      (_c = roof == null ? void 0 : roof.x1) != null ? _c : 0,
      (_d = roof == null ? void 0 : roof.z1) != null ? _d : 0,
    );
    uniforms.uMachiRoofY.value[index] = (_e = roof == null ? void 0 : roof.y) != null ? _e : -100;
  }
};
const VERTEX_PARS =
  /* glsl */
  `
varying vec3 vMachiWorld;
`;
const VERTEX =
  /* glsl */
  `
{
    vec4 machiLocal = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
        machiLocal = instanceMatrix * machiLocal;
    #endif
    vMachiWorld = (modelMatrix * machiLocal).xyz;
}
`;
const FRAGMENT_PARS =
  /* glsl */
  `
uniform float uMachiSnow;
uniform vec3 uMachiSnowColor;
uniform vec3 uMachiViewUp;
uniform vec4 uMachiRoofs[${MACHI_SNOW_MAX_ROOFS}];
uniform float uMachiRoofY[${MACHI_SNOW_MAX_ROOFS}];
varying vec3 vMachiWorld;
float machiSnowHash(vec2 p) { return fract(sin(dot(p, vec2(41.7, 289.3))) * 43758.5453); }
float machiSnowNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(machiSnowHash(i), machiSnowHash(i + vec2(1.0, 0.0)), u.x), mix(machiSnowHash(i + vec2(0.0, 1.0)), machiSnowHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float machiSheltered(vec3 p) {
    for (int i = 0; i < ${MACHI_SNOW_MAX_ROOFS}; i++) {
        vec4 r = uMachiRoofs[i];
        if (p.x > r.x && p.x < r.z && p.z > r.y && p.z < r.w && p.y < uMachiRoofY[i] - 0.05) return 1.0;
    }
    return 0.0;
}
`;
const FRAGMENT =
  /* glsl */
  `
if (uMachiSnow > 0.001) {
    float machiUp = dot(normalize(normal), uMachiViewUp);
    float machiNoise = machiSnowNoise(vMachiWorld.xz * 2.6) * 0.65 + machiSnowNoise(vMachiWorld.xz * 7.1) * 0.35;
    // \u79EF\u5F97\u8D8A\u591A\uFF0C\u566A\u58F0\u7684\u95E8\u69DB\u8D8A\u4F4E\uFF1A\u5148\u662F\u4E00\u5757\u5757\u7684\uFF0C\u540E\u6765\u8FDE\u6210\u4E00\u7247\u3002
    float machiCover = smoothstep(0.5, 0.85, machiUp) * smoothstep(1.0 - uMachiSnow * 0.9, 1.16 - uMachiSnow * 0.9, machiNoise + 0.25);
    machiCover *= 1.0 - machiSheltered(vMachiWorld);
    diffuseColor.rgb = mix(diffuseColor.rgb, uMachiSnowColor, machiCover * min(1.0, uMachiSnow * 1.4));
}
`;
const injectMachiSnow = (shader, uniforms) => {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
${VERTEX_PARS}`,
    )
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
${VERTEX}`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
${FRAGMENT_PARS}`,
    )
    .replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
${FRAGMENT}`,
    );
};
export { MACHI_SNOW_MAX_ROOFS, createMachiSnowUniforms, injectMachiSnow, setMachiSnowRoofs };
