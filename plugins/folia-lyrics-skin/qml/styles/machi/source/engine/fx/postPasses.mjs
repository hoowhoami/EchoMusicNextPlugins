// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/fx/postPasses.ts
import {
  document,
  OffscreenCanvas,
  globalThis,
  Image,
  ImageData,
  math as Math,
  performance,
  window,
  ResizeObserver,
  requestAnimationFrame,
  cancelAnimationFrame,
  AbortController,
  DOMException,
  Path2D,
} from '../../../environment.mjs';
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {})) if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop)) __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
import { FullScreenQuad, Pass } from '../../../three/Pass.mjs';
const FULLSCREEN_VERTEX =
  /* glsl */
  `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const NOISE_GLSL =
  /* glsl */
  `
float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), u.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float pFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        value += amplitude * pNoise(p);
        p = p * 2.03 + vec2(17.1, 9.2);
        amplitude *= 0.5;
    }
    return value;
}
`;
const GLOW_GLSL =
  /* glsl */
  `
uniform sampler2D tBloom;
uniform sampler2D tStreak;
uniform vec3 uStreakTint;
uniform float uStreakStrength;
vec3 machiBloomed(vec2 uv) { return texture2D(tDiffuse, uv).rgb + texture2D(tBloom, uv).rgb; }
vec3 machiGlowed(vec2 uv) { return machiBloomed(uv) + texture2D(tStreak, uv).rgb * uStreakTint * uStreakStrength; }
`;
const createGlowUniforms = () => ({
  tBloom: { value: null },
  tStreak: { value: null },
  uStreakTint: { value: new THREE.Color(0.62, 0.74, 1) },
  uStreakStrength: { value: 0 },
});
const fullscreenMaterial = (parameters) =>
  new THREE.ShaderMaterial(
    __spreadValues(
      {
        vertexShader: FULLSCREEN_VERTEX,
        depthTest: false,
        depthWrite: false,
      },
      parameters,
    ),
  );
const ATMOSPHERE_FRAGMENT =
  /* glsl */
  `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uInkScale;
uniform float uDepthRange;
uniform float uThreshold;
uniform vec3 uInk;
uniform float uInkStrength;
uniform mat4 uProjInv;
uniform mat4 uCamWorld;
uniform float uTime;
uniform vec3 uMistColor;
uniform float uMistAmount;
uniform float uMistHeight;
uniform vec2 uWind;
uniform vec4 uGlowA;
uniform vec3 uGlowColorA;
uniform vec4 uGlowB;
uniform vec3 uGlowColorB;
uniform vec3 uCloudColor;
uniform float uCloudAmount;
uniform float uHaze;
uniform vec2 uHazeRange;
uniform float uLightning;
uniform vec3 uLightningColor;
uniform float uAspect;
varying vec2 vUv;
${NOISE_GLSL}
float depthAt(vec2 uv) { return texture2D(tDepth, uv).x * uDepthRange; }
void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    float raw = texture2D(tDepth, vUv).x;
    float d = raw * uDepthRange;
    bool sky = raw > 0.9999;
    // \u58A8\u7EBF\uFF1A\u5E73\u9762\u4E0A\u6DF1\u5EA6\u7684\u4E8C\u9636\u5DEE\u5206\u4E3A\u96F6\uFF0C\u53EA\u6709\u8F6E\u5ED3\u548C\u6298\u89D2\u4E0D\u4E3A\u96F6\u3002\u53D6\u6837\u6B65\u957F\u6309\u5C4F\u5E55\u50CF\u7D20\uFF08\u8D85\u91C7\u6837\u65F6 uInkScale > 1\uFF09\uFF0C\u7EBF\u5BBD\u4E0D\u968F\u8D85\u91C7\u6837\u53D8\u3002
    vec2 inkStep = uTexel * uInkScale;
    float l = depthAt(vUv - vec2(inkStep.x, 0.0));
    float r = depthAt(vUv + vec2(inkStep.x, 0.0));
    float u = depthAt(vUv + vec2(0.0, inkStep.y));
    float b = depthAt(vUv - vec2(0.0, inkStep.y));
    float lu = depthAt(vUv + vec2(-inkStep.x, inkStep.y));
    float rb = depthAt(vUv + vec2(inkStep.x, -inkStep.y));
    float ru = depthAt(vUv + inkStep);
    float lb = depthAt(vUv - inkStep);
    float laplace = abs(l + r - 2.0 * d) + abs(u + b - 2.0 * d) + 0.5 * (abs(lu + rb - 2.0 * d) + abs(ru + lb - 2.0 * d));
    float line = smoothstep(uThreshold, uThreshold * 2.6, laplace) * (sky ? 0.0 : 1.0);
    vec3 rgb = mix(color.rgb, uInk, line * uInkStrength);

    if (sky) {
#ifndef MACHI_CUTOUT
        // \u5929\u7A7A\uFF1A\u4E24\u5C42\u6162\u6162\u6F02\u7684\u4E91\uFF0C\u95EA\u7535\u65F6\u4ECE\u4E91\u91CC\u4EAE\u8D77\u6765\u3002
        vec2 p = vec2(vUv.x * uAspect, vUv.y) * 2.4 + vec2(uTime * 0.012, 0.0);
        float cloud = smoothstep(mix(0.62, 0.38, uCloudAmount), 0.85, pFbm(p)) * smoothstep(0.0, 0.55, vUv.y) * (0.35 + 0.65 * uCloudAmount);
        float wisp = smoothstep(0.55, 0.9, pFbm(p * 2.3 + vec2(uTime * 0.02, 3.1))) * (0.5 + 0.5 * uCloudAmount);
        rgb += uCloudColor * (cloud * 0.55 + wisp * 0.18);
        rgb += uLightningColor * uLightning * (0.18 + 1.1 * cloud + 0.4 * wisp);
        rgb = mix(rgb, uMistColor, uHaze * 0.7);
#endif
    } else {
        // \u8FD8\u539F\u4E16\u754C\u5750\u6807\uFF0C\u753B\u8D34\u5730\u7684\u96FE\u3002
        vec4 ndc = vec4(vUv * 2.0 - 1.0, raw * 2.0 - 1.0, 1.0);
        vec4 view = uProjInv * ndc;
        view /= view.w;
        vec3 world = (uCamWorld * view).xyz;
        float height = max(world.y, 0.0);
        float drift = pFbm(world.xz * 0.32 + uWind * uTime) * 0.65 + pFbm(world.xz * 0.9 - uWind * uTime * 1.7) * 0.35;
        float density = uMistAmount * exp(-height / uMistHeight) * (0.35 + 0.9 * drift);
        // \u706F\u5728\u96FE\u91CC\u6563\u5F00\uFF1A\u79BB\u5E97\u95E8\u3001\u8DEF\u706F\u8D8A\u8FD1\uFF0C\u96FE\u8D8A\u4EAE\u8D8A\u6696\u3002
        vec2 da = world.xz - uGlowA.xz;
        vec2 db = world.xz - uGlowB.xz;
        vec3 lit = uMistColor
            + uGlowColorA * exp(-dot(da, da) / (uGlowA.w * uGlowA.w)) * exp(-height / 2.2)
            + uGlowColorB * exp(-dot(db, db) / (uGlowB.w * uGlowB.w)) * exp(-height / 3.0);
        rgb = mix(rgb, lit, clamp(density, 0.0, 0.85));
        // \u96FE\u5929\uFF1A\u79BB\u955C\u5934\u8D8A\u8FDC\u8D8A\u7070\u3002
        rgb = mix(rgb, uMistColor, uHaze * (0.3 + 0.7 * smoothstep(uHazeRange.x, uHazeRange.y, d)));
        rgb += rgb * uLightning * 0.18;
    }
    gl_FragColor = vec4(rgb, color.a);
}
`;
class MachiAtmospherePass extends Pass {
  /** cutout：透明模式，天空像素上不画云、闪电和雾天的灰。 */
  constructor(scene, cutout = false) {
    super();
    __publicField(this, 'scene', scene);
    __publicField(this, 'material');
    __publicField(this, 'quad');
    this.needsSwap = false;
    this.material = fullscreenMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uInkScale: { value: 1 },
        uDepthRange: { value: 100 },
        uThreshold: { value: 0.05 },
        uInk: { value: new THREE.Color(724762) },
        uInkStrength: { value: 0.82 },
        uProjInv: { value: new THREE.Matrix4() },
        uCamWorld: { value: new THREE.Matrix4() },
        uTime: { value: 0 },
        uMistColor: { value: new THREE.Color() },
        uMistAmount: { value: 0.22 },
        uMistHeight: { value: 0.55 },
        uWind: { value: new THREE.Vector2(0.05, 0.02) },
        uGlowA: { value: new THREE.Vector4(0, 0, 0, 2.4) },
        uGlowColorA: { value: new THREE.Color() },
        uGlowB: { value: new THREE.Vector4(0, 0, 0, 1.8) },
        uGlowColorB: { value: new THREE.Color() },
        uCloudColor: { value: new THREE.Color() },
        uCloudAmount: { value: 1 },
        uHaze: { value: 0 },
        uHazeRange: { value: new THREE.Vector2(50, 70) },
        uLightning: { value: 0 },
        uLightningColor: { value: new THREE.Color(13228287) },
        uAspect: { value: 16 / 9 },
      },
      fragmentShader: ATMOSPHERE_FRAGMENT,
      defines: cutout ? { MACHI_CUTOUT: '' } : {},
    });
    this.quad = new FullScreenQuad(this.material);
  }
  setSize(width, height) {
    this.material.uniforms.uTexel.value.set(1 / Math.max(1, width), 1 / Math.max(1, height));
    this.material.uniforms.uAspect.value = width / Math.max(1, height);
  }
  /** 读的是单独的场景目标，画进 scene.lit（都不是合成器的缓冲）。 */
  render(renderer) {
    this.material.uniforms.tDiffuse.value = this.scene.target.texture;
    this.material.uniforms.tDepth.value = this.scene.target.depthTexture;
    renderer.setRenderTarget(this.scene.lit);
    this.quad.render(renderer);
  }
  dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}
const BRIGHT_FRAGMENT =
  /* glsl */
  `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uThreshold;
varying vec2 vUv;
${GLOW_GLSL}
void main() {
    vec3 c = machiBloomed(vUv + uTexel * vec2(-1.0, -1.0))
        + machiBloomed(vUv + uTexel * vec2(1.0, -1.0))
        + machiBloomed(vUv + uTexel * vec2(-1.0, 1.0))
        + machiBloomed(vUv + uTexel * vec2(1.0, 1.0));
    c *= 0.25;
    float luminance = dot(c, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.5, luminance), 1.0);
}
`;
const STREAK_BLUR_FRAGMENT =
  /* glsl */
  `
uniform sampler2D tDiffuse;
uniform vec2 uStep;
varying vec2 vUv;
void main() {
    vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.2;
    float weights[4];
    weights[0] = 0.17; weights[1] = 0.13; weights[2] = 0.08; weights[3] = 0.04;
    for (int i = 0; i < 4; i++) {
        vec2 offset = uStep * float(i + 1);
        sum += (texture2D(tDiffuse, vUv + offset).rgb + texture2D(tDiffuse, vUv - offset).rgb) * weights[i];
    }
    gl_FragColor = vec4(sum, 1.0);
}
`;
const halfFloatTarget = () =>
  new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
class MachiStreakPass extends Pass {
  constructor(scene, glow) {
    super();
    __publicField(this, 'scene', scene);
    __publicField(this, 'targets', [halfFloatTarget(), halfFloatTarget()]);
    __publicField(this, 'bright');
    __publicField(this, 'blur');
    __publicField(this, 'quad', new FullScreenQuad());
    __publicField(this, 'width', 1);
    /** 模糊完的光条（最后一次模糊画进 targets 里的哪张：三次来回，落在第二张）。 */
    __publicField(this, 'texture');
    this.needsSwap = false;
    this.bright = fullscreenMaterial({
      uniforms: __spreadProps(__spreadValues({}, glow), {
        tDiffuse: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uThreshold: { value: 1.1 },
      }),
      fragmentShader: BRIGHT_FRAGMENT,
    });
    this.blur = fullscreenMaterial({
      uniforms: { tDiffuse: { value: null }, uStep: { value: new THREE.Vector2() } },
      fragmentShader: STREAK_BLUR_FRAGMENT,
    });
    this.texture = this.targets[1].texture;
  }
  setSize(width, height) {
    this.width = Math.max(1, Math.round(width / 4));
    const h = Math.max(1, Math.round(height / 4));
    this.targets.forEach((target) => target.setSize(this.width, h));
    this.bright.uniforms.uTexel.value.set(1 / Math.max(1, width), 1 / Math.max(1, height));
  }
  render(renderer) {
    const [a, b] = this.targets;
    this.bright.uniforms.tDiffuse.value = this.scene.lit.texture;
    this.quad.material = this.bright;
    renderer.setRenderTarget(a);
    this.quad.render(renderer);
    let source = a;
    let target = b;
    [1, 4, 14].forEach((spread) => {
      this.blur.uniforms.tDiffuse.value = source.texture;
      this.blur.uniforms.uStep.value.set(spread / this.width, 0);
      this.quad.material = this.blur;
      renderer.setRenderTarget(target);
      this.quad.render(renderer);
      [source, target] = [target, source];
    });
  }
  dispose() {
    this.targets.forEach((target) => target.dispose());
    this.bright.dispose();
    this.blur.dispose();
    this.quad.dispose();
  }
}
export {
  GLOW_GLSL,
  MachiAtmospherePass,
  MachiStreakPass,
  createGlowUniforms,
  fullscreenMaterial,
  halfFloatTarget,
};
