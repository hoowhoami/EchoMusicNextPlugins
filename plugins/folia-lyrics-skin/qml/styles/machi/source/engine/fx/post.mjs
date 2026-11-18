// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/fx/post.ts
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
import { EffectComposer } from '../../../three/EffectComposer.mjs';
import { FXAAPass } from '../../../three/FXAAPass.mjs';
import { SMAAPass } from '../../../three/SMAAPass.mjs';
import { compileInto } from '../../../native-warmup.mjs';
import { MachiBloomPass } from './bloomPass.mjs';
import { MachiLensPass } from './lensPass.mjs';
import {
  createGlowUniforms,
  halfFloatTarget,
  MachiAtmospherePass,
  MachiStreakPass,
} from './postPasses.mjs';
const BLOOM_SCALE = 4;
const passMaterials = (pass) => {
  const materials = /* @__PURE__ */ new Set();
  Object.values(pass).forEach((value) => {
    if (value instanceof THREE.Material) materials.add(value);
    else if (Array.isArray(value))
      value.forEach((item) => {
        if (item instanceof THREE.Material) materials.add(item);
      });
  });
  return materials;
};
const createSceneTarget = (width, height, samples) => {
  const depthTexture = new THREE.DepthTexture(width, height);
  depthTexture.type = THREE.UnsignedIntType;
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    samples,
    depthTexture,
  });
  target.texture.name = 'machi:scene';
  return target;
};
class MachiPost {
  constructor(renderer, sceneGraph, camera, quality, cutout = false) {
    __publicField(this, 'renderer', renderer);
    __publicField(this, 'sceneGraph', sceneGraph);
    __publicField(this, 'camera', camera);
    __publicField(this, 'composer');
    __publicField(this, 'scene');
    __publicField(this, 'atmosphere');
    __publicField(this, 'bloom');
    __publicField(this, 'streaks');
    __publicField(this, 'lens');
    __publicField(this, 'fxaa');
    __publicField(this, 'smaa');
    /** bloom、光条的取样（光条、镜头 pass 共用）；关着的那项指向这张黑贴图。 */
    __publicField(this, 'glow', createGlowUniforms());
    __publicField(this, 'black', new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1));
    __publicField(this, 'bufferSize', new THREE.Vector2());
    __publicField(this, 'bloomAllowed', true);
    __publicField(this, 'streaksAllowed', true);
    __publicField(this, 'bloomStrength', 0.5);
    __publicField(this, 'streakStrength', 0.55);
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const lit = halfFloatTarget();
    lit.texture.name = 'machi:lit';
    lit.setSize(size.x, size.y);
    this.scene = { target: createSceneTarget(size.x, size.y, quality.samples), lit };
    this.composer = new EffectComposer(
      renderer,
      new THREE.WebGLRenderTarget(size.x, size.y, {
        type: THREE.UnsignedByteType,
        depthBuffer: false,
      }),
    );
    this.black.needsUpdate = true;
    this.atmosphere = new MachiAtmospherePass(this.scene, cutout);
    this.composer.addPass(this.atmosphere);
    this.bloom = new MachiBloomPass(this.scene, BLOOM_SCALE, 0.5, 0.62, 0.86);
    this.composer.addPass(this.bloom);
    this.streaks = new MachiStreakPass(this.scene, this.glow);
    this.composer.addPass(this.streaks);
    this.lens = new MachiLensPass(
      this.scene,
      this.glow,
      {
        neutralToneMapping: renderer.toneMapping === THREE.NeutralToneMapping,
        srgb: THREE.ColorManagement.getTransfer(renderer.outputColorSpace) === THREE.SRGBTransfer,
      },
      cutout,
    );
    this.composer.addPass(this.lens);
    this.fxaa = new FXAAPass();
    this.composer.addPass(this.fxaa);
    this.smaa = new SMAAPass();
    const smaaTargets = this.smaa;
    [smaaTargets._edgesRT, smaaTargets._weightsRT].forEach((target) => {
      if (target) target.texture.type = THREE.UnsignedByteType;
    });
    this.composer.addPass(this.smaa);
    this.setQuality(quality);
  }
  /** 场景画进的那张 HDR 目标（预编主场景的着色器时按它编）。 */
  get sceneTarget() {
    return this.scene.target;
  }
  /**
   * 跟着画布改尺寸（在 renderer.setSize 之后调）。所有缓冲区都用画布的整数像素尺寸：画布是 floor(宽 × 像素比)，
   * 合成器自己乘像素比会得到带小数的尺寸（墨线的取样步长按它算），场景目标原来又是四舍五入，像素比让尺寸带小数时
   * （Windows 125% 缩放、画质 75%）三者差出一列，按最近邻取深度的墨线在画面中段多跳一个纹素，画出一整条竖线。
   */
  setSize() {
    const { x: width, y: height } = this.renderer.getDrawingBufferSize(this.bufferSize);
    this.composer.setPixelRatio(1);
    this.composer.setSize(width, height);
    this.scene.target.setSize(width, height);
    this.scene.lit.setSize(width, height);
  }
  /** 换画质：MSAA 采样数变了就换一张场景目标（氛围、镜头 pass 读的是同一个 MachiSceneTarget，自动跟上）。 */
  setQuality(quality) {
    var _a;
    const current = this.scene.target;
    if (current.samples !== quality.samples) {
      this.scene.target = createSceneTarget(current.width, current.height, quality.samples);
      (_a = current.depthTexture) == null ? void 0 : _a.dispose();
      current.dispose();
    }
    this.atmosphere.material.uniforms.uInkScale.value = quality.inkScale;
    this.bloomAllowed = quality.bloom;
    this.streaksAllowed = quality.streaks;
    this.lens.dofEnabled = quality.dof;
    this.fxaa.enabled = quality.postAA === 'fxaa';
    this.smaa.enabled = quality.postAA === 'smaa';
    this.applyGlow();
  }
  /**
   * 预编后处理的着色器（programWarmup.ts）：每道 pass 的材质按它画进的目标编，中间的都画进合成器的 HDR 缓冲，
   * 最后一道开着的（SMAA、FXAA 或镜头）上屏。bloom、光条也编：它们随夜色开关，开的那一刻不该卡。没选的抗锯齿不编。
   */
  compile() {
    const passes = this.composer.passes.filter(
      (pass) => (pass !== this.fxaa && pass !== this.smaa) || pass.enabled,
    );
    const last = passes[passes.length - 1];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3),
    );
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    const quad = new THREE.Mesh(geometry);
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const empty = new THREE.Scene();
    passes.forEach((pass) => {
      passMaterials(pass).forEach((material) => {
        quad.material = material;
        compileInto(this.renderer, this.composer.renderTarget1, quad, camera, empty);
        if (pass === last) compileInto(this.renderer, null, quad, camera, empty);
      });
    });
    quad.geometry.dispose();
  }
  /** 光晕的强度随环境走：夜里 bloom 与横向光条明显，白天几乎没有（为 0 时整道 pass 跳过）。 */
  setGlow(bloom, streaks) {
    if (bloom === this.bloomStrength && streaks === this.streakStrength) return;
    this.bloomStrength = bloom;
    this.streakStrength = streaks;
    this.applyGlow();
  }
  applyGlow() {
    this.bloom.strength = this.bloomStrength;
    this.bloom.enabled = this.bloomAllowed && this.bloomStrength > 5e-3;
    this.streaks.enabled = this.streaksAllowed && this.streakStrength > 5e-3;
    this.glow.tBloom.value = this.bloom.enabled ? this.bloom.texture : this.black;
    this.glow.tStreak.value = this.streaks.enabled ? this.streaks.texture : this.black;
    this.glow.uStreakStrength.value = this.streakStrength;
  }
  /**
   * 画一帧。墨线门槛跟着每个像素代表的世界尺寸走，缩放后线不变粗也不消失；centerDistance 是镜头到画面中心（目标点）
   * 的距离，雾的远近按它；lens.focus 是对焦深度（离镜头的距离）。
   */
  render(pixelWorldSize, centerDistance, atmosphere, lens) {
    const camera = this.camera;
    const range = camera.far - camera.near;
    const uniforms = this.atmosphere.material.uniforms;
    uniforms.uDepthRange.value = range;
    uniforms.uThreshold.value = Math.max(4e-3, pixelWorldSize * uniforms.uInkScale.value * 0.7);
    uniforms.uProjInv.value.copy(camera.projectionMatrixInverse);
    uniforms.uCamWorld.value.copy(camera.matrixWorld);
    uniforms.uTime.value = atmosphere.time;
    uniforms.uMistColor.value.copy(atmosphere.mistColor);
    uniforms.uMistAmount.value = atmosphere.mistAmount;
    uniforms.uCloudColor.value.copy(atmosphere.cloudColor);
    uniforms.uCloudAmount.value = atmosphere.cloudAmount;
    uniforms.uHaze.value = atmosphere.haze;
    uniforms.uHazeRange.value.set(
      centerDistance - camera.near - 8,
      centerDistance - camera.near + 14,
    );
    uniforms.uLightning.value = atmosphere.lightning;
    uniforms.uGlowA.value.copy(atmosphere.glowA);
    uniforms.uGlowColorA.value.copy(atmosphere.glowColorA);
    uniforms.uGlowB.value.copy(atmosphere.glowB);
    uniforms.uGlowColorB.value.copy(atmosphere.glowColorB);
    uniforms.uWind.value.copy(atmosphere.wind);
    this.lens.configure(
      __spreadProps(__spreadValues({}, lens), {
        focus: lens.focus - camera.near,
        stars: atmosphere.stars,
      }),
      range,
      atmosphere.time,
    );
    this.renderer.setRenderTarget(this.scene.target);
    this.renderer.clear();
    this.renderer.render(this.sceneGraph, camera);
    this.composer.render();
  }
  dispose() {
    var _a;
    this.atmosphere.dispose();
    this.bloom.dispose();
    this.streaks.dispose();
    this.lens.dispose();
    this.black.dispose();
    this.fxaa.dispose();
    this.smaa.dispose();
    this.composer.dispose();
    (_a = this.scene.target.depthTexture) == null ? void 0 : _a.dispose();
    this.scene.target.dispose();
    this.scene.lit.dispose();
  }
}
export { MachiPost };
