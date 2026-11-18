// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/fx/steam.ts
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
const VERTEX =
  /* glsl */
  `
uniform float uTime;
uniform vec2 uWind;
attribute vec4 aSource; // xyz \u51FA\u6C14\u53E3\uFF0Cw \u5468\u671F
attribute vec2 aSeed;   // \u76F8\u4F4D\u3001\u5927\u5C0F
varying vec2 vUv;
varying float vFade;
varying float vSeed;
void main() {
    float life = fract(uTime / aSource.w + aSeed.x);
    float rise = life * 1.6;
    vec3 center = aSource.xyz + vec3(uWind.x * life * 1.8 + sin(life * 6.0 + aSeed.x * 20.0) * 0.08, rise, uWind.y * life * 1.8);
    float size = (0.25 + life * 0.9) * aSeed.y;
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 world = center + (right * position.x + up * position.y) * size;
    vUv = uv;
    vFade = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.55, 1.0, life));
    vSeed = aSeed.x * 31.0;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;
const FRAGMENT =
  /* glsl */
  `
uniform vec3 uColor;
uniform float uTime;
varying vec2 vUv;
varying float vFade;
varying float vSeed;
float sHash(vec2 p) { return fract(sin(dot(p, vec2(12.7, 61.3))) * 43758.5453); }
float sNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), u.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
    vec2 c = vUv - 0.5;
    float shape = 1.0 - smoothstep(0.15, 0.5, length(c));
    float puff = sNoise(vUv * 3.0 + vec2(vSeed, uTime * 0.2)) * 0.6 + sNoise(vUv * 6.5 - vec2(uTime * 0.3, vSeed)) * 0.4;
    float alpha = shape * smoothstep(0.25, 0.75, puff) * vFade;
    gl_FragColor = vec4(uColor * alpha, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
class MachiSteam {
  constructor(materials, blend, sources) {
    __publicField(this, 'blend', blend);
    __publicField(this, 'mesh');
    __publicField(this, 'material');
    const quad = new THREE.PlaneGeometry(1, 1);
    const geometry = new THREE.InstancedBufferGeometry();
    geometry.index = quad.index;
    geometry.setAttribute('position', quad.getAttribute('position'));
    geometry.setAttribute('uv', quad.getAttribute('uv'));
    const source = [];
    const seeds = [];
    sources.forEach((item) => {
      for (let index = 0; index < item.puffs; index += 1) {
        source.push(item.position.x, item.position.y, item.position.z, item.period);
        seeds.push(index / item.puffs, item.size * (0.8 + (0.4 * ((index * 7) % 5)) / 5));
      }
    });
    geometry.setAttribute(
      'aSource',
      new THREE.InstancedBufferAttribute(new Float32Array(source), 4),
    );
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(seeds), 2));
    geometry.instanceCount = seeds.length / 2;
    this.material = materials.track(
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uWind: { value: new THREE.Vector2() },
          uColor: { value: new THREE.Color() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = 'Steam';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.syncColors();
  }
  syncColors() {
    this.material.uniforms.uColor.value
      .copy(this.blend.get('skyBottom'))
      .lerp(new THREE.Color(14542578), 0.5)
      .multiplyScalar(0.32);
  }
  update(time, wind) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uWind.value.copy(wind);
  }
  dispose() {
    this.mesh.geometry.dispose();
  }
}
export { MachiSteam };
