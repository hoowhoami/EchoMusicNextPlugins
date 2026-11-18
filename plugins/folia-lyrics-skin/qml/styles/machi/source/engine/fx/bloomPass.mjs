// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/fx/bloomPass.ts
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
var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);
var __publicField = (obj, key, value) =>
  __defNormalProp(obj, typeof key !== 'symbol' ? key + '' : key, value);
import * as THREE from '../../../three.mjs';
import { FullScreenQuad } from '../../../three/Pass.mjs';
import { UnrealBloomPass } from '../../../three/UnrealBloomPass.mjs';
import { fullscreenMaterial } from './postPasses.mjs';
const KERNEL_SIZES = [6, 10, 14, 18, 22];
const BLUR_X = new THREE.Vector2(1, 0);
const BLUR_Y = new THREE.Vector2(0, 1);
const gaussian = (kernelRadius) => {
  const sigma = kernelRadius / 3;
  return Array.from(
    { length: kernelRadius },
    (_, i) => (0.39894 * Math.exp((-0.5 * i * i) / (sigma * sigma))) / sigma,
  );
};
const blurTaps = (kernelRadius, paired) => {
  const w = gaussian(kernelRadius);
  const offsets = [];
  const weights = [];
  for (let i = 1; i < kernelRadius; i += paired ? 2 : 1) {
    const a = w[i];
    const b = paired && i + 1 < kernelRadius ? w[i + 1] : 0;
    offsets.push(i + b / (a + b));
    weights.push(a + b);
  }
  return { center: w[0], offsets, weights };
};
const BLUR_FRAGMENT = (taps) =>
  /* glsl */
  `
uniform sampler2D colorTexture;
uniform vec2 invSize;
uniform vec2 direction;
uniform float uCenter;
uniform float uOffsets[${taps}];
uniform float uWeights[${taps}];
varying vec2 vUv;
void main() {
    vec3 sum = texture2D(colorTexture, vUv).rgb * uCenter;
    for (int i = 0; i < ${taps}; i++) {
        vec2 offset = direction * invSize * uOffsets[i];
        sum += (texture2D(colorTexture, vUv + offset).rgb + texture2D(colorTexture, vUv - offset).rgb) * uWeights[i];
    }
    gl_FragColor = vec4(sum, 1.0);
}
`;
const blurMaterial = (kernelRadius, paired) => {
  const { center, offsets, weights } = blurTaps(kernelRadius, paired);
  return fullscreenMaterial({
    uniforms: {
      colorTexture: { value: null },
      invSize: { value: new THREE.Vector2() },
      direction: { value: new THREE.Vector2() },
      uCenter: { value: center },
      uOffsets: { value: offsets },
      uWeights: { value: weights },
    },
    fragmentShader: BLUR_FRAGMENT(offsets.length),
  });
};
const HIGH_PASS_FRAGMENT =
  /* glsl */
  `
#include <common>
uniform sampler2D tDiffuse;
uniform float luminosityThreshold;
uniform float smoothWidth;
uniform vec2 uSpread;
varying vec2 vUv;
vec3 bright(vec2 uv) {
    vec3 texel = texture2D(tDiffuse, uv).rgb;
    return texel * smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, luminance(texel));
}
void main() {
#ifdef MACHI_SPREAD
    vec3 c = (bright(vUv - uSpread) + bright(vUv + vec2(uSpread.x, -uSpread.y))
        + bright(vUv + vec2(-uSpread.x, uSpread.y)) + bright(vUv + uSpread)) * 0.25;
#else
    vec3 c = bright(vUv);
#endif
    gl_FragColor = vec4(c, 1.0);
}
`;
class MachiBloomPass extends UnrealBloomPass {
  /** scale：整条链从画面的 1/scale 分辨率起（2 是 UnrealBloomPass 原来的一半分辨率）。 */
  constructor(scene, scale, strength, radius, threshold) {
    super(new THREE.Vector2(2, 2), strength, radius, threshold);
    __publicField(this, 'scene', scene);
    __publicField(this, 'scale', scale);
    __publicField(this, 'quad', new FullScreenQuad());
    __publicField(this, 'oldClearColor', new THREE.Color());
    __publicField(this, 'highPass');
    /** 各级的横向、竖向模糊。 */
    __publicField(this, 'blurX');
    __publicField(this, 'blurY');
    this.separableBlurMaterials.forEach((material) => material.dispose());
    this.separableBlurMaterials = [];
    const kernels = KERNEL_SIZES.slice(0, this.nMips).map((size) =>
      Math.max(2, Math.round((size * 2) / scale)),
    );
    this.blurX = kernels.map((size, i) => blurMaterial(size, i === 0));
    this.blurY = kernels.map((size) => blurMaterial(size, true));
    this.highPass = fullscreenMaterial({
      uniforms: {
        tDiffuse: { value: null },
        luminosityThreshold: { value: threshold },
        smoothWidth: { value: 0.01 },
        uSpread: { value: new THREE.Vector2() },
      },
      fragmentShader: HIGH_PASS_FRAGMENT,
      defines: scale > 2 ? { MACHI_SPREAD: '' } : {},
    });
    this.materialHighPassFilter.dispose();
    this.materialHighPassFilter = this.highPass;
  }
  /** 合成好的 bloom（1/scale 分辨率，已乘强度）。 */
  get texture() {
    return this.renderTargetsHorizontal[0].texture;
  }
  setSize(width, height) {
    let x = Math.max(1, Math.round(width / this.scale));
    let y = Math.max(1, Math.round(height / this.scale));
    this.renderTargetBright.setSize(x, y);
    this.highPass.uniforms.uSpread.value.set(
      this.scale / 4 / Math.max(1, width),
      this.scale / 4 / Math.max(1, height),
    );
    for (let i = 0; i < this.nMips; i += 1) {
      this.renderTargetsHorizontal[i].setSize(x, y);
      this.renderTargetsVertical[i].setSize(x, y);
      this.blurX[i].uniforms.invSize.value.set(1 / x, 1 / y);
      this.blurY[i].uniforms.invSize.value.set(1 / x, 1 / y);
      x = Math.max(1, Math.round(x / 2));
      y = Math.max(1, Math.round(y / 2));
    }
  }
  /** UnrealBloomPass.render 去掉最后那道叠回读缓冲（也不支持直接上屏：町景的 bloom 后面总有镜头 pass）。 */
  render(renderer) {
    renderer.getClearColor(this.oldClearColor);
    const oldClearAlpha = renderer.getClearAlpha();
    const oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(this.clearColor, 0);
    const draw = (material, target) => {
      this.quad.material = material;
      renderer.setRenderTarget(target);
      renderer.clear();
      this.quad.render(renderer);
    };
    this.highPass.uniforms.tDiffuse.value = this.scene.lit.texture;
    this.highPass.uniforms.luminosityThreshold.value = this.threshold;
    draw(this.highPass, this.renderTargetBright);
    let input = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i += 1) {
      const blurX = this.blurX[i];
      const blurY = this.blurY[i];
      blurX.uniforms.colorTexture.value = input.texture;
      blurX.uniforms.direction.value = BLUR_X;
      draw(blurX, this.renderTargetsHorizontal[i]);
      blurY.uniforms.colorTexture.value = this.renderTargetsHorizontal[i].texture;
      blurY.uniforms.direction.value = BLUR_Y;
      draw(blurY, this.renderTargetsVertical[i]);
      input = this.renderTargetsVertical[i];
    }
    const composite = this.compositeMaterial.uniforms;
    composite.bloomStrength.value = this.strength;
    composite.bloomRadius.value = this.radius;
    composite.bloomTintColors.value = this.bloomTintColors;
    draw(this.compositeMaterial, this.renderTargetsHorizontal[0]);
    renderer.setClearColor(this.oldClearColor, oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }
  dispose() {
    super.dispose();
    this.highPass.dispose();
    [...this.blurX, ...this.blurY].forEach((material) => material.dispose());
    this.quad.dispose();
  }
}
export { MachiBloomPass, blurTaps };
