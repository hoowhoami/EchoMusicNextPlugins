// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/machi/engine/fx/lensPass.ts
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
import { fullscreenMaterial, GLOW_GLSL, halfFloatTarget } from './postPasses.mjs';
const LEVEL_MAX_COC = 8;
const LEVELS = 5;
const MAX_TAPS = 48;
const COC_GLSL =
  /* glsl */
  `
uniform float uDepthRange;
uniform float uFocus;
uniform float uFocusBand;
uniform float uFocusFalloff;
uniform float uCocRadius;
uniform float uTiltRadius;
// \u79BB\u7126\u5706\u7684\u534A\u5F84\uFF08\u5168\u5206\u8FA8\u7387\u50CF\u7D20\uFF09\uFF1A\u5BF9\u7126\u9762\u4E4B\u524D\u4E3A\u8D1F\u3001\u4E4B\u540E\u4E3A\u6B63\uFF1B\u79FB\u8F74\u6309\u753B\u9762\u4E0A\u4E0B\u53E6\u7B97\uFF0C\u5F53\u6210\u540E\u666F\u3002
float machiCoc(float depth01, vec2 uv) {
    float offset = depth01 * uDepthRange - uFocus;
    float coc = smoothstep(uFocusBand, uFocusBand + uFocusFalloff, abs(offset)) * uCocRadius * (offset < 0.0 ? -1.0 : 1.0);
    float tilt = smoothstep(0.2, 0.55, abs(uv.y - 0.5)) * uTiltRadius;
    return abs(coc) >= tilt ? coc : tilt;
}
`;
const PREFILTER_FRAGMENT =
  /* glsl */
  `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 uSourceTexel;
varying vec2 vUv;
${COC_GLSL}
${GLOW_GLSL}
float widest(float a, float b) { return abs(a) >= abs(b) ? a : b; }
void main() {
    vec2 o = uSourceTexel * 0.5;
    vec2 p0 = vUv + vec2(-o.x, -o.y);
    vec2 p1 = vUv + vec2(o.x, -o.y);
    vec2 p2 = vUv + vec2(-o.x, o.y);
    vec2 p3 = vUv + vec2(o.x, o.y);
#ifdef MACHI_CUTOUT
    float d0 = texture2D(tDepth, p0).x;
    float d1 = texture2D(tDepth, p1).x;
    float d2 = texture2D(tDepth, p2).x;
    float d3 = texture2D(tDepth, p3).x;
    float h0 = step(d0, 0.9999);
    float h1 = step(d1, 0.9999);
    float h2 = step(d2, 0.9999);
    float h3 = step(d3, 0.9999);
    float hits = h0 + h1 + h2 + h3;
    vec3 color = hits > 0.0
        ? (machiGlowed(p0) * h0 + machiGlowed(p1) * h1 + machiGlowed(p2) * h2 + machiGlowed(p3) * h3) / hits
        : (machiGlowed(p0) + machiGlowed(p1) + machiGlowed(p2) + machiGlowed(p3)) * 0.25;
    float coc = widest(
        widest(machiCoc(d0, p0) * h0, machiCoc(d1, p1) * h1),
        widest(machiCoc(d2, p2) * h2, machiCoc(d3, p3) * h3)
    );
#else
    vec3 color = (machiGlowed(p0) + machiGlowed(p1) + machiGlowed(p2) + machiGlowed(p3)) * 0.25;
    float coc = widest(
        widest(machiCoc(texture2D(tDepth, p0).x, p0), machiCoc(texture2D(tDepth, p1).x, p1)),
        widest(machiCoc(texture2D(tDepth, p2).x, p2), machiCoc(texture2D(tDepth, p3).x, p3))
    );
#endif
    gl_FragColor = vec4(color, coc);
}
`;
const DOWNSAMPLE_FRAGMENT =
  /* glsl */
  `
uniform sampler2D tSource;
uniform vec2 uSourceTexel;
varying vec2 vUv;
float widest(float a, float b) { return abs(a) >= abs(b) ? a : b; }
void main() {
    vec2 o = uSourceTexel * 0.5;
    vec4 s0 = texture2D(tSource, vUv + vec2(-o.x, -o.y));
    vec4 s1 = texture2D(tSource, vUv + vec2(o.x, -o.y));
    vec4 s2 = texture2D(tSource, vUv + vec2(-o.x, o.y));
    vec4 s3 = texture2D(tSource, vUv + vec2(o.x, o.y));
    gl_FragColor = vec4((s0.rgb + s1.rgb + s2.rgb + s3.rgb) * 0.25, widest(widest(s0.a, s1.a), widest(s2.a, s3.a)));
}
`;
const GATHER_FRAGMENT =
  /* glsl */
  `
uniform sampler2D tSource;
uniform vec2 uTexel;
uniform float uMaxCoc;
uniform float uLevelScale;
uniform float uTaps;
varying vec2 vUv;
// \u6BCF\u4E2A\u53D6\u6837\u70B9\u6BD4\u4E0A\u4E00\u4E2A\u591A\u8F6C\u4E00\u4E2A\u9EC4\u91D1\u89D2\uFF1A\u65B9\u5411\u7528\u8F6C\u4E00\u4E2A\u9EC4\u91D1\u89D2\u7684\u77E9\u9635\u4E00\u8DEF\u4E58\u4E0B\u53BB\uFF0C\u4E0D\u7528\u6BCF\u4E2A\u70B9\u7B97\u4E00\u6B21 cos\u3001sin\u3002
const mat2 GOLDEN_TURN = mat2(-0.73736888, 0.67549029, -0.67549029, -0.73736888);
const float MARGIN = 1.2;
void main() {
    vec4 center = texture2D(tSource, vUv);
    float centerCoc = center.a / uLevelScale;
    vec4 far = vec4(0.0);
    vec4 near = vec4(0.0);
    vec2 direction = vec2(1.0, 0.0);
    for (int i = 0; i < ${MAX_TAPS}; i++) {
        if (float(i) >= uTaps) break;
        float radius = sqrt((float(i) + 0.5) / uTaps) * uMaxCoc;
        vec4 tap = texture2D(tSource, vUv + direction * radius * uTexel);
        direction = GOLDEN_TURN * direction;
        float tapCoc = tap.a / uLevelScale;
        // \u540E\u666F\uFF1A\u53D6\u6837\u70B9\u7684\u5706\u4E0E\u4E2D\u5FC3\u7684\u5706\u91CC\u5C0F\u7684\u90A3\u4E2A\u76D6\u5F97\u5230\u8FD9\u91CC\u624D\u6536\uFF08\u6E05\u695A\u7684\u524D\u666F\u4E0D\u88AB\u8EAB\u540E\u7684\u865A\u666F\u7CCA\u4E0A\uFF09\u3002
        float farCoc = max(min(centerCoc, tapCoc), 0.0);
        float farWeight = clamp((farCoc - radius + MARGIN) / MARGIN, 0.0, 1.0);
        // \u524D\u666F\uFF1A\u81EA\u5DF1\u7684\u5706\u76D6\u5F97\u5230\u8FD9\u91CC\u5C31\u6536\uFF1B\u6E05\u695A\u7684\u70B9\u4E0D\u7B97\u524D\u666F\u3002
        float nearWeight = clamp((-tapCoc - radius + MARGIN) / MARGIN, 0.0, 1.0) * step(1.0, -tapCoc);
        far += vec4(tap.rgb, 1.0) * farWeight;
        near += vec4(tap.rgb, 1.0) * nearWeight;
    }
    vec3 farColor = far.a > 0.0 ? far.rgb / far.a : center.rgb;
    vec3 nearColor = near.a > 0.0 ? near.rgb / near.a : center.rgb;
    // \u524D\u666F\u76D6\u4F4F\u7684\u6BD4\u4F8B\uFF1A\u5706\u76D8\u7EA6\u4E09\u5206\u4E4B\u4E00\u7684\u6837\u662F\u524D\u666F\u65F6\u5C31\u7B97\u5168\u76D6\u4F4F\u3002
    float nearAlpha = clamp(near.a * 3.14159 / uTaps, 0.0, 1.0);
    gl_FragColor = vec4(mix(farColor, nearColor, nearAlpha), nearAlpha);
}
`;
const TENT_FRAGMENT =
  /* glsl */
  `
uniform sampler2D tSource;
uniform vec2 uTexel;
varying vec2 vUv;
void main() {
    vec2 o = uTexel * 0.5;
    gl_FragColor = (texture2D(tSource, vUv + vec2(-o.x, -o.y)) + texture2D(tSource, vUv + vec2(o.x, -o.y))
        + texture2D(tSource, vUv + vec2(-o.x, o.y)) + texture2D(tSource, vUv + vec2(o.x, o.y))) * 0.25;
}
`;
const LENS_FRAGMENT =
  /* glsl */
  `
uniform sampler2D tDiffuse;
uniform sampler2D tBokeh;
uniform sampler2D tDepth;
uniform sampler2D tCoverage;
uniform float uDofMix;
uniform vec2 uBlend;
uniform float uAberration;
uniform float uVignette;
uniform float uGrain;
uniform float uFade;
uniform float uStars;
uniform float uTime;
uniform float uAspect;
varying vec2 vUv;
${COC_GLSL}
${GLOW_GLSL}
#include <tonemapping_pars_fragment>
float gHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
    vec2 centered = vUv - 0.5;
    float edge = dot(centered, centered);
    // \u8FB9\u7F18\u8272\u5DEE\uFF1A\u7EA2\u84DD\u6CBF\u5F84\u5411\u9519\u5F00\uFF0C\u4E2D\u95F4\u4E0D\u52A8\u3002
    vec2 shift = centered * edge * uAberration;
    vec3 sharp = vec3(
        machiGlowed(vUv + shift).r,
        machiGlowed(vUv).g,
        machiGlowed(vUv - shift).b
    );
    // \u666F\u6DF1\uFF1A\u8FD9\u4E2A\u50CF\u7D20\u81EA\u5DF1\u79BB\u7126\u591F\u591A\uFF08\u8D85\u8FC7\u6563\u666F\u90A3\u4E00\u5C42\u4E00\u4E24\u4E2A\u50CF\u7D20\uFF09\u5C31\u7528\u6563\u666F\uFF1B\u865A\u6389\u7684\u524D\u666F\u76D6\u5230\u8FD9\u91CC\u4E5F\u7528\u6563\u666F\u3002
    vec4 bokeh = texture2D(tBokeh, vUv);
    float depth01 = texture2D(tDepth, vUv).x;
    float own = smoothstep(uBlend.x, uBlend.y, abs(machiCoc(depth01, vUv)));
    float amount = (own + bokeh.a - own * bokeh.a) * uDofMix;
    vec3 color = mix(sharp, bokeh.rgb, clamp(amount, 0.0, 1.0));
#ifndef MACHI_CUTOUT
    // \u6674\u591C\u7684\u661F\u661F\uFF1A\u5929\u7A7A\u50CF\u7D20\u4E0A\u683C\u5B50\u91CC\u7A00\u758F\u7684\u4EAE\u70B9\uFF0C\u5404\u81EA\u6162\u6162\u95EA\u3002
    if (uStars > 0.001 && depth01 > 0.9999) {
        vec2 sp = vec2(vUv.x * uAspect, vUv.y) * 140.0;
        vec2 cell = floor(sp);
        float starSeed = gHash(cell);
        vec2 starAt = vec2(gHash(cell + 3.7), gHash(cell + 9.1)) * 0.6 + 0.2;
        float star = step(0.984, starSeed) * smoothstep(0.24, 0.0, length(fract(sp) - starAt))
            * (0.55 + 0.45 * sin(uTime * (0.8 + starSeed * 3.0) + starSeed * 60.0));
        color += vec3(0.85, 0.9, 1.0) * star * uStars * 1.3 * smoothstep(0.1, 0.55, vUv.y);
    }
#endif
    // \u6697\u89D2\u3002
    vec2 v = centered * vec2(uAspect, 1.0);
    float vignette = smoothstep(1.15, 0.35, length(v) * 1.15);
    color *= mix(1.0, vignette, uVignette);
    // \u9897\u7C92\uFF1A\u8DDF\u4EAE\u5EA6\u8D70\uFF0C\u6697\u90E8\u66F4\u7EC6\u3002
    float grain = gHash(vUv * vec2(1733.0, 977.0) + fract(uTime * 7.31)) - 0.5;
    color += grain * uGrain * (0.25 + dot(color, vec3(0.3333)));
#ifdef MACHI_CUTOUT
    float alpha = depth01 > 0.9999 ? 0.0 : clamp(texture2D(tCoverage, vUv).a, 0.0, 1.0);
    gl_FragColor = vec4(max(color, 0.0), alpha) * uFade;
#else
    gl_FragColor = vec4(max(color, 0.0) * uFade, 1.0);
#endif
    // \u8272\u8C03\u6620\u5C04\u4E0E sRGB \u7F16\u7801\uFF08\u548C three \u7684 OutputPass \u4E00\u6837\uFF0Cdefines \u7531 MachiPost \u6309\u6E32\u67D3\u5668\u7684\u8BBE\u7F6E\u7ED9\uFF09\u3002
#ifdef NEUTRAL_TONE_MAPPING
    gl_FragColor.rgb = NeutralToneMapping(gl_FragColor.rgb);
#endif
#ifdef SRGB_TRANSFER
    gl_FragColor = sRGBTransferOETF(gl_FragColor);
#endif
}
`;
const resolveMachiBokehLevel = (maxCocPx) => {
  let level = 0;
  let levelCoc = maxCocPx / 2;
  while (levelCoc > LEVEL_MAX_COC && level < LEVELS - 1) {
    level += 1;
    levelCoc /= 2;
  }
  const taps = Math.min(MAX_TAPS, Math.max(12, Math.ceil((Math.PI * levelCoc * levelCoc) / 4)));
  return { level, levelCoc, taps, scale: 2 ** (level + 1) };
};
class MachiLensPass extends Pass {
  /** glow：bloom 与光条的取样（和光条 pass 共用）；cutout：透明模式，这一道写出画面的 alpha（天空透明）。 */
  constructor(scene, glow, output, cutout = false) {
    super();
    __publicField(this, 'scene', scene);
    /** 一半、四分之一……分辨率的离焦层（alpha 里是 CoC）。 */
    __publicField(this, 'chain', Array.from({ length: LEVELS }, halfFloatTarget));
    /** 圆盘取样与帐篷模糊在用的那一层上来回用的两张。 */
    __publicField(this, 'work', [halfFloatTarget(), halfFloatTarget()]);
    __publicField(this, 'prefilter');
    __publicField(this, 'downsample');
    __publicField(this, 'gather');
    __publicField(this, 'tent');
    __publicField(this, 'material');
    __publicField(this, 'quad', new FullScreenQuad());
    __publicField(this, 'fullSize', new THREE.Vector2(1, 1));
    /** 画质允许景深（自动降级会关掉）。 */
    __publicField(this, 'dofEnabled', true);
    /** 这一帧有景深或移轴：没有就不做离焦层。 */
    __publicField(this, 'dofActive', true);
    __publicField(this, 'bokeh', resolveMachiBokehLevel(0));
    const coc = {
      uDepthRange: { value: 100 },
      uFocus: { value: 60 },
      uFocusBand: { value: 3 },
      uFocusFalloff: { value: 7 },
      uCocRadius: { value: 0 },
      uTiltRadius: { value: 0 },
    };
    this.prefilter = fullscreenMaterial({
      uniforms: __spreadProps(__spreadValues(__spreadValues({}, coc), glow), {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uSourceTexel: { value: new THREE.Vector2() },
      }),
      fragmentShader: PREFILTER_FRAGMENT,
      defines: cutout ? { MACHI_CUTOUT: '' } : {},
    });
    this.downsample = fullscreenMaterial({
      uniforms: { tSource: { value: null }, uSourceTexel: { value: new THREE.Vector2() } },
      fragmentShader: DOWNSAMPLE_FRAGMENT,
    });
    this.gather = fullscreenMaterial({
      uniforms: {
        tSource: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uMaxCoc: { value: 1 },
        uLevelScale: { value: 2 },
        uTaps: { value: 12 },
      },
      fragmentShader: GATHER_FRAGMENT,
    });
    this.tent = fullscreenMaterial({
      uniforms: { tSource: { value: null }, uTexel: { value: new THREE.Vector2() } },
      fragmentShader: TENT_FRAGMENT,
    });
    this.material = fullscreenMaterial({
      uniforms: __spreadProps(__spreadValues(__spreadValues({}, coc), glow), {
        tDiffuse: { value: null },
        tBokeh: { value: null },
        tDepth: { value: null },
        tCoverage: { value: null },
        uDofMix: { value: 0 },
        uBlend: { value: new THREE.Vector2(1, 3) },
        uAberration: { value: 0.012 },
        uVignette: { value: 0.55 },
        uGrain: { value: 0.035 },
        uStars: { value: 0 },
        uFade: { value: 1 },
        uTime: { value: 0 },
        uAspect: { value: 16 / 9 },
      }),
      fragmentShader: LENS_FRAGMENT,
      defines: __spreadValues(
        __spreadValues(
          __spreadValues({}, cutout ? { MACHI_CUTOUT: '' } : {}),
          output.neutralToneMapping ? { NEUTRAL_TONE_MAPPING: '' } : {},
        ),
        output.srgb ? { SRGB_TRANSFER: '' } : {},
      ),
      // 色调映射自己做（上面的 #include）：渲染器不再往上屏的着色器里加一份。
      toneMapped: false,
    });
  }
  setSize(width, height) {
    this.fullSize.set(Math.max(1, width), Math.max(1, height));
    this.chain.forEach((target, index) => {
      const divisor = 2 ** (index + 1);
      target.setSize(
        Math.max(1, Math.round(width / divisor)),
        Math.max(1, Math.round(height / divisor)),
      );
    });
    this.material.uniforms.uAspect.value = width / Math.max(1, height);
  }
  configure(settings, depthRange, time) {
    var _a, _b;
    const uniforms = this.material.uniforms;
    const height = this.fullSize.y;
    const cocPx = Math.max(0, settings.coc) * height;
    const tiltPx = Math.max(0, settings.tilt) * height;
    this.dofActive = this.dofEnabled && (cocPx > 0.5 || tiltPx > 0.5);
    this.bokeh = resolveMachiBokehLevel(Math.max(cocPx, tiltPx));
    uniforms.uDepthRange.value = depthRange;
    uniforms.uFocus.value = settings.focus;
    uniforms.uFocusBand.value = settings.focusBand;
    uniforms.uFocusFalloff.value = settings.focusFalloff;
    uniforms.uCocRadius.value = this.dofActive ? cocPx : 0;
    uniforms.uTiltRadius.value = this.dofActive ? tiltPx : 0;
    uniforms.uDofMix.value = this.dofActive ? 1 : 0;
    uniforms.uBlend.value.set(0.5 * this.bokeh.scale, 1.5 * this.bokeh.scale);
    uniforms.uAberration.value = settings.aberration;
    uniforms.uVignette.value = settings.vignette;
    uniforms.uGrain.value = settings.grain;
    uniforms.uStars.value = (_a = settings.stars) != null ? _a : 0;
    uniforms.uFade.value = (_b = settings.fade) != null ? _b : 1;
    uniforms.uTime.value = time;
  }
  draw(renderer, material, target) {
    this.quad.material = material;
    renderer.setRenderTarget(target);
    this.quad.render(renderer);
  }
  /** 读氛围画好的 scene.lit，画进合成器的写缓冲（8 位，已是显示用的颜色）或直接上屏。 */
  render(renderer, writeBuffer) {
    const uniforms = this.material.uniforms;
    const depth = this.scene.target.depthTexture;
    const lit = this.scene.lit.texture;
    uniforms.tBokeh.value = lit;
    if (this.dofActive) {
      const { level, levelCoc, taps, scale } = this.bokeh;
      const [first] = this.chain;
      this.prefilter.uniforms.tDiffuse.value = lit;
      this.prefilter.uniforms.tDepth.value = depth;
      this.prefilter.uniforms.uSourceTexel.value.set(1 / this.fullSize.x, 1 / this.fullSize.y);
      this.draw(renderer, this.prefilter, first);
      for (let index = 1; index <= level; index += 1) {
        const source2 = this.chain[index - 1];
        this.downsample.uniforms.tSource.value = source2.texture;
        this.downsample.uniforms.uSourceTexel.value.set(1 / source2.width, 1 / source2.height);
        this.draw(renderer, this.downsample, this.chain[index]);
      }
      const source = this.chain[level];
      const [gathered, smoothed] = this.work;
      gathered.setSize(source.width, source.height);
      smoothed.setSize(source.width, source.height);
      const gather = this.gather.uniforms;
      gather.tSource.value = source.texture;
      gather.uTexel.value.set(1 / source.width, 1 / source.height);
      gather.uMaxCoc.value = levelCoc;
      gather.uLevelScale.value = scale;
      gather.uTaps.value = taps;
      this.draw(renderer, this.gather, gathered);
      this.tent.uniforms.tSource.value = gathered.texture;
      this.tent.uniforms.uTexel.value.set(1 / source.width, 1 / source.height);
      this.draw(renderer, this.tent, smoothed);
      uniforms.tBokeh.value = smoothed.texture;
    }
    uniforms.tDiffuse.value = lit;
    uniforms.tDepth.value = depth;
    uniforms.tCoverage.value = this.scene.target.texture;
    this.draw(renderer, this.material, this.renderToScreen ? null : writeBuffer);
  }
  dispose() {
    this.chain.forEach((target) => target.dispose());
    this.work.forEach((target) => target.dispose());
    this.prefilter.dispose();
    this.downsample.dispose();
    this.gather.dispose();
    this.tent.dispose();
    this.material.dispose();
    this.quad.dispose();
  }
}
export { MachiLensPass, resolveMachiBokehLevel };
