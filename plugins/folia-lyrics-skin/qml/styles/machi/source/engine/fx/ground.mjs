// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/fx/ground.ts
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
import { MACHI_BEAT } from '../beatFx.mjs';
import { injectMachiSheen, MACHI_GLOSS } from '../sheen.mjs';
import { injectMachiSnow } from '../snow.mjs';
const PARS =
  /* glsl */
  `
uniform float uTime;
uniform sampler2D uReflection;
uniform mat4 uReflectMatrix;
uniform vec2 uPuddleOffset;
uniform float uPuddleAmount;
uniform float uRain;
uniform float uWet;
uniform vec3 uSky;
uniform float uReflectStrength;
uniform float uPuddleBias;
uniform vec2 uKickCenter;
uniform vec4 uKickAge;
uniform vec4 uKickAmp;
varying vec3 vKWorld;

float kHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float kNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(kHash(i), kHash(i + vec2(1.0, 0.0)), u.x), mix(kHash(i + vec2(0.0, 1.0)), kHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float kPuddle(vec2 p) {
    float n = kNoise(p * 0.62 + uPuddleOffset) * 0.62 + kNoise(p * 1.7 - uPuddleOffset * 1.3) * 0.38;
    float threshold = mix(0.78, 0.46, uPuddleAmount) + uPuddleBias;
    return smoothstep(threshold, threshold + 0.05, n);
}
// \u4E00\u5C42\u6D9F\u6F2A\uFF1A\u6BCF\u683C\u4E00\u4E2A\u968F\u673A\u4E2D\u5FC3\u7684\u6269\u6563\u5706\u73AF\uFF0C\u8FD4\u56DE xz \u65B9\u5411\u7684\u6CD5\u7EBF\u6270\u52A8\u4E0E\u73AF\u7684\u4EAE\u5EA6\u3002
vec3 kRippleLayer(vec2 p, float scale, float t, float salt) {
    vec2 q = p * scale;
    vec2 cell = floor(q);
    vec2 center = cell + 0.22 + 0.56 * vec2(kHash(cell + salt), kHash(cell + salt + 7.13));
    float period = 0.75 + 0.9 * kHash(cell + salt + 3.31);
    float phase = fract(t / period + kHash(cell + salt + 11.7));
    float alive = step(kHash(cell + salt + floor(t / period + kHash(cell + salt + 11.7)) * 0.37), uRain);
    vec2 d = q - center;
    float dist = length(d);
    float radius = phase * 0.46;
    float band = 1.0 - smoothstep(0.0, 0.07, abs(dist - radius));
    float fade = (1.0 - phase) * alive;
    float wave = sin((dist - radius) * 48.0) * band * fade;
    return vec3(normalize(d + 1e-4) * wave, band * fade);
}
// \u9F13\u70B9\u6D9F\u6F2A\u7684\u4E00\u5708\uFF1A\u4ECE uKickCenter \u8361\u5F00\u3001\u8D8A\u8D70\u8D8A\u5BBD\u8D8A\u6DE1\u7684\u73AF\uFF08\u6309\u5269\u4F59\u5BFF\u547D\u7684\u5E73\u65B9\u6DE1\uFF09\uFF0C\u8FD4\u56DE xz \u65B9\u5411\u7684\u6CD5\u7EBF\u6270\u52A8\u4E0E\u73AF\u7684\u4EAE\u5EA6\u3002
// \u7A7A\u7684\u4E00\u5708\u5E74\u9F84\u662F -1\uFF1A\u5148\u5939\u5230 0\uFF0Csmoothstep \u7684\u4E24\u7AEF\u4E0D\u4F1A\u5012\u8FC7\u6765\u3002
vec3 kKick(vec2 p, float age, float amp) {
    float a = max(age, 0.0);
    vec2 d = p - uKickCenter;
    float dist = length(d);
    float radius = a * ${MACHI_BEAT.ripple.speed.toFixed(2)};
    float band = 1.0 - smoothstep(0.0, 0.18 + 0.3 * a, abs(dist - radius));
    float left = clamp(1.0 - a / ${MACHI_BEAT.ripple.life.toFixed(2)}, 0.0, 1.0);
    float fade = amp * left * left * step(0.0, age);
    float wave = sin((dist - radius) * 7.0) * band * fade;
    return vec3(normalize(d + 1e-4) * wave, band * fade);
}
// \u5012\u5F71\u53D6\u6837\uFF1A\u6E7F\u8DEF\u9762\u4E0D\u662F\u955C\u5B50\u3002\u706F\u548C\u5B57\u5728\u6E7F\u8DEF\u9762\u4E0A\u62C9\u6210\u7AD6\u7740\u7684\u4E00\u9053\u9053\u5149\uFF08\u5012\u5F71\u8D34\u56FE\u548C\u753B\u9762\u540C\u4E00\u4E2A\u671D\u5411\uFF0C\u7AD6\u5411\u5C31\u662F v\uFF09\uFF0C
// \u6A2A\u5411\u53EA\u7CCA\u4E00\u70B9\u3002rough 0 \u662F\u6C34\u6D3C\uFF08\u77ED\u4E00\u70B9\u3001\u6E05\u695A\u4E00\u70B9\uFF09\uFF0C1 \u662F\u6C34\u6D3C\u5916\u7684\u6E7F\u819C\uFF08\u957F\u3001\u7CCA\uFF09\u3002
vec3 kReflect(vec2 uv, float rough) {
    float bias = mix(0.6, 1.8, rough);
    float reach = mix(10.0, 26.0, rough) / float(textureSize(uReflection, 0).y);
    vec3 sum = vec3(0.0);
    float total = 0.0;
    for (int i = -4; i <= 4; i++) {
        float t = float(i) / 4.0;
        float w = 1.0 - abs(t) * 0.75;
        sum += texture2D(uReflection, uv + vec2(0.0, t * reach), bias).rgb * w;
        total += w;
    }
    // \u4E00\u76CF\u706F\u644A\u6210\u4E00\u9053\u5149\u4EE5\u540E\u4E0D\u8BE5\u6697\u90A3\u4E48\u591A\uFF1A\u6309 0.6 \u500D\u7684\u6743\u91CD\u548C\u5F52\u4E00\uFF0C\u5149\u5E26\u6BD4\u5E73\u5747\u66F4\u4EAE\u4E00\u70B9\u3002
    return sum / (total * 0.6);
}
// \u96E8\u70B9\u6253\u5728\u8DEF\u9762\u4E0A\u7684\u95EA\u5149\uFF1A\u7EA6 7cm \u4E00\u683C\uFF0C\u683C\u91CC\u968F\u673A\u4E00\u70B9\uFF0C\u6BCF\u9694\u4E00\u9635\uFF08\u96E8\u70B9\u6253\u4E0B\u6765\uFF09\u4EAE\u4E00\u4E0B\u518D\u6697\u4E0B\u53BB\u3002
float kGlint(vec2 p, float t) {
    vec2 q = p * 14.0;
    vec2 cell = floor(q);
    float h = kHash(cell + 3.7);
    float period = 0.5 + h * 1.1;
    float beat = t / period + h * 7.0;
    float drop = floor(beat);
    vec2 center = cell + 0.2 + 0.6 * vec2(kHash(cell + drop * 0.71), kHash(cell + drop * 1.37 + 9.1));
    float d = length(q - center);
    float aa = fwidth(d) + 1e-4;
    return (1.0 - smoothstep(0.16 - aa, 0.16 + aa, d)) * (1.0 - fract(beat)) * step(0.45, h);
}
`;
const OUTPUT =
  /* glsl */
  `
// \u5E72\u4E14\u6CA1\u4E0B\u96E8\u65F6\u4E0B\u9762\u6574\u6BB5\uFF08\u6C34\u6D3C\u3001\u6D9F\u6F2A\u3001\u5012\u5F71\u53D6\u6837\u3001\u96E8\u70B9\u95EA\u5149\u3001\u9F13\u70B9\u6D9F\u6F2A\uFF09\u90FD\u4E58\u6210 0\uFF1A\u76F4\u63A5\u8DF3\u8FC7\uFF0C\u8DEF\u9762\u7167\u5E38\u662F outgoingLight\u3002
if (uWet > 0.0 || uRain > 0.0) {
    vec2 kp = vKWorld.xz;
    // \u5E72\u7684\u65F6\u5019\u6CA1\u6709\u6C34\u6D3C\uFF1B\u79EF\u96EA\u76D6\u4F4F\u6C34\u6D3C\u3002
    float puddle = kPuddle(kp) * smoothstep(0.15, 0.85, uWet) * (1.0 - min(1.0, uMachiSnow * 1.5));
    vec3 ripple = kRippleLayer(kp, 2.3, uTime, 0.0) + kRippleLayer(kp, 3.9, uTime * 1.13, 19.0) * 0.7;
    // \u9F13\u70B9\u6D9F\u6F2A\uFF1A\u6E7F\u7684\u5730\u65B9\u624D\u6709\uFF0C\u79EF\u96EA\u76D6\u4F4F\u5C31\u6CA1\u6709\u3002
    vec3 kick = vec3(0.0);
    if (any(greaterThan(uKickAmp, vec4(0.0)))) {
        kick = kKick(kp, uKickAge.x, uKickAmp.x) + kKick(kp, uKickAge.y, uKickAmp.y)
            + kKick(kp, uKickAge.z, uKickAmp.z) + kKick(kp, uKickAge.w, uKickAmp.w);
        kick *= smoothstep(${MACHI_BEAT.ripple.wet[0].toFixed(2)}, ${MACHI_BEAT.ripple.wet[1].toFixed(2)}, uWet) * (1.0 - min(1.0, uMachiSnow * 1.5));
    }
    vec4 rc = uReflectMatrix * vec4(vKWorld, 1.0);
    // \u8DEF\u9762\u4E0D\u5E73\uFF1A\u4E00\u5C42\u4F4E\u9891\u7684\u6270\u52A8\u8BA9\u5012\u5F71\u7684\u8F6E\u5ED3\u5F2F\u4E00\u5F2F\uFF0C\u6C34\u6D3C\u91CC\u5F2F\u5F97\u5C11\u3002
    vec2 wobble = vec2(kNoise(kp * 2.7 + 3.1), kNoise(kp * 2.7 - 11.4)) - 0.5;
    vec2 ruv = rc.xy / rc.w + ripple.xy * mix(0.004, 0.018, puddle) + wobble * mix(0.012, 0.005, puddle) + kick.xy * mix(0.09, 0.15, puddle);
    vec3 reflection = kReflect(ruv, 1.0 - puddle);
    // \u706F\u5E95\u4E0B\u624D\u95EA\uFF1A\u6309\u8FD9\u4E00\u70B9\u53D7\u7684\u76F4\u5C04\u5149\uFF08\u542B\u9AD8\u5149\uFF09\u4EAE\u5EA6\u3002
    float lit = dot(reflectedLight.directDiffuse, vec3(0.299, 0.587, 0.114));
    float glint = kGlint(kp, uTime) * uRain * smoothstep(0.03, 0.4, lit) * (1.0 - min(1.0, uMachiSnow * 1.5));
    // \u6C34\u6D3C\uFF1A\u538B\u6697\u3001\u6620\u5929\u7A7A\u3001\u6620\u5012\u5F71\uFF1B\u6C34\u6D3C\u5916\uFF1A\u4E00\u5C42\u6E7F\u819C\uFF0C\u6574\u7247\u90FD\u6620\u5F97\u51FA\u706F\uFF08\u62C9\u957F\u3001\u7CCA\u5F00\uFF09\u3002
    vec3 wet = outgoingLight * mix(1.0, 0.62, uWet) + reflection * uReflectStrength * 0.7 * uWet;
    vec3 pool = outgoingLight * 0.36 + uSky * 0.16 + reflection * uReflectStrength * 1.35 + ripple.z * uSky * 0.6;
    outgoingLight = mix(wet, pool, puddle) + glint * (vec3(lit) * 3.0 + reflection);
    outgoingLight += kick.z * (reflection * uReflectStrength * 3.6 + uSky * 2.4 + 0.24) * mix(0.6, 1.0, puddle);
}
`;
const REFLECT_STRENGTH = 0.75;
class MachiGround {
  constructor(materials, blend, snow) {
    __publicField(this, 'blend', blend);
    __publicField(this, 'snow', snow);
    __publicField(this, 'uniforms', {
      uTime: { value: 0 },
      uReflection: { value: null },
      uReflectMatrix: { value: new THREE.Matrix4() },
      uPuddleOffset: { value: new THREE.Vector2() },
      uPuddleAmount: { value: 0.6 },
      uRain: { value: 0.75 },
      uWet: { value: 1 },
      uSky: { value: new THREE.Color() },
      uReflectStrength: { value: REFLECT_STRENGTH },
      uKickCenter: { value: new THREE.Vector2() },
      uKickAge: { value: new THREE.Vector4(-1, -1, -1, -1) },
      uKickAmp: { value: new THREE.Vector4() },
    });
    __publicField(this, 'asphalt');
    __publicField(this, 'concrete');
    __publicField(this, 'gradient');
    this.gradient = materials.gradient;
    this.asphalt = materials.track(this.create('asphalt', 0));
    this.concrete = materials.track(this.create('concrete', 0.08));
  }
  create(key, puddleBias) {
    const material = new THREE.MeshToonMaterial({
      color: this.blend.get(key),
      gradientMap: this.gradient,
    });
    material.name = `machi:wet:${key}`;
    material.onBeforeCompile = (shader) => {
      injectMachiSnow(shader, this.snow);
      injectMachiSheen(shader, this.snow, MACHI_GLOSS.ground);
      Object.assign(shader.uniforms, this.uniforms, { uPuddleBias: { value: puddleBias } });
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vKWorld;')
        .replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\nvKWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
${PARS}`,
        )
        .replace(
          '#include <opaque_fragment>',
          `${OUTPUT}
#include <opaque_fragment>`,
        );
    };
    material.customProgramCacheKey = () => `machi-wet-${puddleBias}`;
    return material;
  }
  /** 鼓点涟漪：圆心与 rings（[年龄, 幅度] × 4，engine/beatFx.ts 的 resolveMachiDrumRipples）。 */
  setKicks(centerX, centerZ, rings) {
    this.uniforms.uKickCenter.value.set(centerX, centerZ);
    this.uniforms.uKickAge.value.set(rings[0], rings[2], rings[4], rings[6]);
    this.uniforms.uKickAmp.value.set(rings[1], rings[3], rings[5], rings[7]);
  }
  /** 画质里关了倒影：倒影贴图不再更新，路面也不取它（只留湿润的暗色和天空色）。 */
  setReflections(enabled) {
    this.uniforms.uReflectStrength.value = enabled ? REFLECT_STRENGTH : 0;
  }
  syncColors() {
    this.asphalt.color.copy(this.blend.get('asphalt'));
    this.concrete.color.copy(this.blend.get('concrete'));
    this.uniforms.uSky.value.copy(this.blend.get('skyBottom'));
  }
}
export { MachiGround };
