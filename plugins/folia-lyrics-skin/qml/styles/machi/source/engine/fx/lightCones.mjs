// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/fx/lightCones.ts
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
import { mergeGeometries } from '../../../three/BufferGeometryUtils.mjs';
const VERTEX =
  /* glsl */
  `
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vViewDir;
varying vec3 vWorld;
attribute float aGain;
varying float vGain;
void main() {
    vUv = uv;
    vGain = aGain;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 view = viewMatrix * world;
    vNormalView = normalize(normalMatrix * normal);
    // \u6B63\u4EA4\u6295\u5F71\uFF1A\u89C6\u7EBF\u65B9\u5411\u5904\u5904\u4E00\u6837\u3002
    vViewDir = vec3(0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * view;
}
`;
const FRAGMENT =
  /* glsl */
  `
uniform vec3 uColor;
uniform float uTime;
uniform float uLevel;
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vViewDir;
varying vec3 vWorld;
varying float vGain;
float cHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float cNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(cHash(i), cHash(i + vec2(1.0, 0.0)), u.x), mix(cHash(i + vec2(0.0, 1.0)), cHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
void main() {
    float facing = abs(dot(normalize(vNormalView), vViewDir));
    // \u63D2\u503C\u51FA\u6765\u7684 uv \u53EF\u80FD\u662F\u6781\u5C0F\u7684\u8D1F\u6570\uFF0Cpow \u7684\u5E95\u5FC5\u987B\u5939\u5230\u975E\u8D1F\uFF0C\u5426\u5219 D3D \u4E0B\u5F97\u5230 NaN\uFF0Cbloom \u4F1A\u628A\u5B83\u94FA\u6EE1\u5168\u5C4F\u3002
    float axial = pow(clamp(vUv.y, 0.0, 1.0), 1.6);
    float haze = 0.7 + 0.6 * cNoise(vec2(vWorld.x * 1.3 + vWorld.z, vWorld.y * 2.0 - uTime * 0.6));
    float alpha = facing * facing * axial * haze * vGain * uLevel;
    gl_FragColor = vec4(uColor * alpha, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
`;
const cone = (apex, target, radius, gain) => {
  const height = apex.distanceTo(target);
  const geometry = new THREE.ConeGeometry(radius, height, 20, 1, true);
  geometry.translate(0, -height / 2, 0);
  const direction = target.clone().sub(apex).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, -1, 0),
    direction,
  );
  geometry.applyQuaternion(quaternion);
  geometry.translate(apex.x, apex.y, apex.z);
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute(
    'aGain',
    new THREE.Float32BufferAttribute(new Float32Array(count).fill(gain), 1),
  );
  return geometry;
};
class MachiLightCones {
  constructor(materials, blend, cones, colorKey = 'streetLight') {
    __publicField(this, 'blend', blend);
    __publicField(this, 'colorKey', colorKey);
    __publicField(this, 'mesh');
    __publicField(this, 'material');
    const parts = cones.map((spec) => cone(spec.apex, spec.target, spec.radius, spec.gain));
    const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
    if (parts.length > 1) parts.forEach((part) => part.dispose());
    this.material = materials.track(
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uColor: { value: new THREE.Color() },
          uTime: { value: 0 },
          uLevel: { value: 0.55 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = 'LightCones';
    this.mesh.renderOrder = 6;
    this.syncColors();
  }
  syncColors() {
    this.material.uniforms.uColor.value.copy(this.blend.get(this.colorKey));
  }
  update(time, level) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uLevel.value = 0.55 * level;
  }
  dispose() {
    this.mesh.geometry.dispose();
  }
}
export { MachiLightCones };
