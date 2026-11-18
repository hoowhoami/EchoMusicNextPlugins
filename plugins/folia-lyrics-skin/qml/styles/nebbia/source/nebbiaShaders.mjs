// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaShaders.ts
import { NEBBIA_AQUA_GLSL } from './nebbiaAquaGlsl.mjs';
import { NEBBIA_SCENE_GLSL } from './nebbiaSceneGlsl.mjs';
const NEBBIA_VS =
  /* glsl */
  `#version 300 es
in vec2 aPos; out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(aPos, 0.0, 1.0); }`;
const sceneUniforms = (sceneGlsl) =>
  /* glsl */
  `precision highp float;
uniform vec2 uRes, uSceneShift; uniform float uTime, uBus, uNeon;
uniform vec3 uSky0, uSky1, uLa, uLb, uLc;
// \u805A\u5149\u706F\uFF1A\u5149\u6E90\uFF08\u8FDC\u5904\u697C\u5E95\uFF09\u3001\u7167\u5230\u73BB\u7483\u4E0A\u7684\u70B9\u3001\u5149\u6591\u534A\u5F84\uFF0C\u90FD\u5728 scene \u5750\u6807\uFF1BuSpotI \u5F3A\u5EA6
uniform vec2 uSpotSrc, uSpotSrc2, uSpotTgt; uniform float uSpotR, uSpotI;
// \u7A97\u5916\u753B\u54EA\u51E0\u6837\uFF08\u4F4D\u89C1 nebbiaSceneGlsl.ts \u7684 SCN_*\uFF09
uniform int uScenery;
// \u697C\u7FA4\u7F13\u5B58\uFF08nebbiaBuildingCache.ts\uFF09\uFF1A\u4E09\u6863\u6A21\u7CCA \xD7 \u8FDC\u8FD1\u4E24\u5C42\uFF0C\u9884\u4E58\u989C\u8272\uFF1BuBldOn \u6BCF\u6863\u753B\u597D\u4E86\u6CA1\u6709\uFF0CuBldGeo \u6BCF\u6863 (y0, y1, \u6A2A\u5411\u5468\u671F)
uniform bvec3 uBldOn; uniform sampler2D uBld0, uBld1, uBld2, uBld3, uBld4, uBld5; uniform vec3 uBldGeo[3];
in vec2 vUv; layout(location = 0) out vec4 outColor;
${sceneGlsl}`;
const SCENE_UNIFORMS = sceneUniforms(NEBBIA_SCENE_GLSL);
const AQUA_UNIFORMS = sceneUniforms(NEBBIA_AQUA_GLSL);
const fogFs = (uniforms) =>
  /* glsl */
  `#version 300 es
${uniforms}
uniform float uFogB;
void main() {
  vec2 s0 = vUv + uSceneShift, q0 = vec2(s0.x * uRes.x / uRes.y, s0.y);
  outColor = vec4(scene(q0, uFogB), 1.0);
}`;
const NEBBIA_FOG_FS = fogFs(SCENE_UNIFORMS);
const NEBBIA_BLD_FILL_FS =
  /* glsl */
  `#version 300 es
${SCENE_UNIFORMS}
uniform float uFillB, uFillLayer, uFillX0; uniform vec3 uFillGeo; uniform vec2 uFillSize;
void main() {
  float span = uFillGeo.z;
  float xw = uFillX0 + fract((gl_FragCoord.x / uFillSize.x * span - uFillX0) / span) * span;
  vec4 r = building(vec2(xw, mix(uFillGeo.x, uFillGeo.y, gl_FragCoord.y / uFillSize.y)), uFillB, 0.0, uFillLayer);
  outColor = vec4(r.rgb * r.a, r.a);
}`;
const STATIC_NOISE =
  /* glsl */
  `
vec3 staticNoise(vec2 px) { return vec3(vnoise(px / 6.0) * 0.6 + vnoise(px / 2.2) * 0.4, vnoise(px / 55.0 + 3.1), vnoise(px / 1.6)); }`;
const NEBBIA_NOISE_FS =
  /* glsl */
  `#version 300 es
${SCENE_UNIFORMS}
${STATIC_NOISE}
void main() { outColor = vec4(staticNoise(gl_FragCoord.xy), 1.0); }`;
const MAIN_FS = (fogTex, uniforms = SCENE_UNIFORMS, dew = false) =>
  /* glsl */
  `#version 300 es
#define NEBBIA_FOG_TEX ${fogTex ? 1 : 0}
${dew ? '#define NEBBIA_DEW 1\n' : ''}${uniforms === AQUA_UNIFORMS ? '#define NEBBIA_SOFT_HIGHLIGHT 1\n' : ''}${uniforms}
uniform sampler2D uMask, uDrop, uField;
#ifdef NEBBIA_DEW
// \u51DD\u9732\u73BB\u7483\u4E0A\u51B7\u51DD\u6C34\u73E0\u7684\u9AD8\u5149\uFF08tuning.dewGlint\uFF09\uFF1B\u7EC6\u6C34\u73E0\u6298\u5C04\u7684\u7A97\u5916\uFF08nebbiaFogGl.ts \u9884\u6E32\u67D3\u7684\u6E05\u6670\u7684\u90A3\u5C42\uFF09
uniform float uDewGlint;
uniform sampler2D uFogSharp;
#endif
// \u54C8\u6C14\u7684\u767D\u6C14\u906E\u7F69\uFF08R \u5F62\u72B6\u3001G \u6D53\u5EA6\uFF0CnebbiaBreath.ts\uFF09\uFF1B\u5C4F\u4E0A\u6CA1\u6709\u54C8\u6C14\u65F6 uBreathOn \u4E3A\u5047\uFF0C\u4E0D\u91C7\u6837
uniform sampler2D uBreath; uniform bool uBreathOn; uniform float uBreathThick;
uniform vec2 uGlassShift; uniform float uMist, uEdge, uRefract, uGlint;
// \u9884\u6E32\u67D3\u597D\u7684\u4E24\u5C42\u96FE\uFF08NEBBIA_FOG_TEX \u4E3A 0 \u65F6\u4E3B\u753B\u9762\u81EA\u5DF1\u7B97\uFF1A\u4E0D\u652F\u6301\u6D6E\u70B9\u6E32\u67D3\u76EE\u6807\u65F6\uFF09
uniform sampler2D uFogBlur, uFogGlow;
// \u9759\u6001\u566A\u58F0\u7EB9\u7406\uFF08nebbiaNoiseTex.ts\uFF09\uFF1A\u6309 px \u53D6\u6837\uFF1BuNoiseOn \u4E3A\u5047\uFF08\u8FD8\u6CA1\u7B97\u597D\u3001\u753B\u5E03\u8D85\u8FC7\u7EB9\u7406\u5C3A\u5BF8\u4E0A\u9650\uFF09\u65F6\u73B0\u7B97
uniform bool uNoiseOn; uniform sampler2D uNoise;
// \u900F\u660E\uFF08\u7A97\u5916\u662F\u5171\u7528\u80CC\u666F\u6216\u684C\u9762\uFF09\uFF1A\u4E0D\u753B\u7A97\u5916\uFF0C\u8F93\u51FA\u9884\u4E58\u7684\u900F\u660E\u5EA6\u3002\u96FE\u662F\u4E00\u5C42\u534A\u900F\u660E\u7684\u96FE\uFF0C\u64E6\u5F00\u7684\u5730\u65B9\u5168\u900F\u660E\uFF0C
// \u5149\uFF08\u805A\u5149\u706F\u3001\u64E6\u75D5\u8FB9\u3001\u6C34\u73E0\u9AD8\u5149\uFF09\u53EA\u52A0\u989C\u8272\u4E0D\u52A0\u4E0D\u900F\u660E\u5EA6\uFF0C\u53E0\u5728\u540E\u9762\u7684\u4E1C\u897F\u4E0A\u3002\u96FE\u7684\u989C\u8272\u8DDF\u4E3B\u9898\u65E5\u591C\uFF1A\u65E5\u95F4\u4E73\u767D\u3001\u591C\u95F4\u6DF1\u8272
uniform bool uSeeThrough; uniform vec3 uMistTint;
${STATIC_NOISE}
void main() {
  // \u98A0\u7C38\uFF1A\u73BB\u7483\u4E0A\u7684\u4E1C\u897F\uFF08\u96FE\u3001\u64E6\u75D5\u3001\u6C34\u73E0\uFF09\u8DDF\u8F66\u8EAB\u4E00\u8D77\u6643\uFF0C\u7A97\u5916\u6643\u5F97\u66F4\u591A
  vec2 gv = vUv + uGlassShift, sv = vUv + uSceneShift;
  vec2 px = gv * uRes;
  float aspect = uRes.x / uRes.y;
  vec2 q = vec2(sv.x * aspect, sv.y);
  // \u64E6\u75D5\u8FB9\u7F18\uFF1A\u7EC6\u566A\u58F0\u8BA9\u8FB9\u7F18\u6BDB\u7CD9\uFF0C\u5927\u5757\u566A\u58F0\u8BA9\u91CD\u65B0\u8D77\u96FE\u65F6\u4E00\u7247\u7247\u56DE\u6765
  vec3 nz = uNoiseOn ? texture(uNoise, px / uRes).rgb : staticNoise(px);
  float fine = nz.r, blotch = nz.g;
  // \u54C8\u6C14\uFF1A\u5C31\u662F\u8FD9\u4E00\u7247\u7684\u96FE\u4E00\u4E0B\u53D8\u5BC6\uFF08\u66F4\u7EC6\u5BC6\u7684\u4E00\u5C42\u6C34\u6C7D\u51DD\u4E0A\u6765\uFF09\uFF0C\u4E0D\u662F\u53E6\u76D6\u4E00\u5C42\u3002\u8FB9\u7531\u5927\u5757\u566A\u58F0\u63C9\u6563\u6210\u4E00\u5377\u5377\u7684\u3001
  // \u7EC6\u566A\u58F0\u8BA9\u5B83\u53D1\u6BDB\uFF0C\u6563\u7684\u65F6\u5019\u4ECE\u8584\u7684\u5730\u65B9\u5148\u900F\u3002\u5728\u767D\u6C14\u4E0A\u5199\u7684\u5B57\u7167\u6837\u64E6\u5F00\uFF0C\u6C34\u73E0\u5468\u56F4\u7167\u6837\u62B9\u5F00\u4E00\u5708
  float breath = 0.0, melt = 0.0;
  if (uBreathOn) {
    vec3 bm = texture(uBreath, gv).rgb;
    if (bm.r > 0.003) {
      // \u503C\u566A\u58F0\u76F4\u63A5\u53D6\u9608\u503C\u4F1A\u9732\u51FA\u6A2A\u5E73\u7AD6\u76F4\u7684\u683C\u5B50\uFF1A\u6BCF\u5C42\u8F6C\u4E00\u4E2A\u89D2\u5EA6\u3001\u53E0\u4E09\u5C42\uFF0C\u8FB9\u7F18\u624D\u662F\u4E00\u5377\u5377\u7684
      vec2 r1 = mat2(0.80, -0.60, 0.60, 0.80) * px, r2 = mat2(0.36, 0.93, -0.93, 0.36) * px;
      float bn = vnoise(r1 / 34.0 + 7.0) * 0.55 + vnoise(r2 / 15.0 + 2.3) * 0.3 + vnoise(px / 6.5) * 0.15;
      float bth = 0.3 + (bn - 0.5) * 0.5;
      float cover = smoothstep(bth - 0.2, bth + 0.25, bm.r);
      breath = cover * bm.g * uBreathThick;
      // \u767D\u6C14\u6F2B\u5230\u54EA\uFF0C\u90A3\u513F\u88AB\u76D6\u4F4F\u7684\u65E7\u5B57\u8DDF\u7740\u7CCA\u5F00\uFF08B \u901A\u9053\uFF0C\u53EA\u5728\u9F13\u5F00\u7684\u90A3\u4E00\u9635\uFF09
      melt = cover * bm.b;
    }
  }
  float m = texture(uMask, gv).r;
  // \u88AB\u767D\u6C14\u76D6\u4F4F\u7684\u65E7\u5B57\uFF1A\u906E\u7F69\u5728\u5468\u56F4\u4E00\u5708\u53D6\u51E0\u4E0B\uFF08\u6BCF\u4E2A\u50CF\u7D20\u8F6C\u4E00\u4E2A\u89D2\u5EA6\uFF0C\u7CCA\u51FA\u6765\u662F\u9897\u7C92\u7684\u96FE\u6C14\uFF0C\u4E0D\u662F\u51E0\u9053\u91CD\u5F71\uFF09\uFF0C\u5B57\u5148\u7CCA\u5F00\u3001\u8FB9\u53D8\u8F6F\uFF0C
  // \u518D\u968F yieldFactor \u6DE1\u8FDB\u96FE\u91CC
  if (melt > 0.01) {
    float rad = melt * 0.014 * uRes.y, a0 = hash(px) * 6.2832, acc = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = a0 + float(i) * 0.7854, rr = rad * ((i & 1) == 0 ? 1.0 : 0.5);
      acc += texture(uMask, gv + vec2(cos(a), sin(a)) * rr / uRes).r;
    }
    m = mix(m, acc / 8.0, melt);
  }
  float th = 0.3 + (fine - 0.5) * 0.22 * uEdge + (blotch - 0.5) * 0.12;
  float clear = smoothstep(th - 0.05 - 0.12 * melt, th + 0.06 + 0.06 * melt, m);
  // \u767D\u6C14\u94FA\u5F00\u540E\uFF0C\u76D6\u6389\u7684\u65E7\u5B57\u5728\u906E\u7F69\u4E0A\u7559\u7740 BREATH_GHOST\uFF08nebbiaScene.ts\uFF09\u90A3\u4E48\u4E00\u70B9\uFF1A\u6BD4\u9608\u503C\u4F4E\u3001\u4E0D\u900F\u51FA\u7A97\u5916\uFF0C
  // \u53EA\u8BA9\u90A3\u513F\u7684\u767D\u6C14\u8584\u4E00\u70B9\uFF0C\u7CCA\u7CCA\u7684\u7559\u4E2A\u6D45\u6D45\u7684\u5370\u5B50\u3002\u5728\u5468\u56F4\u56DB\u4E0B\u53D6\u6837\u7CCA\u5F00\uFF1B\u65B0\u5199\u7684\u5B57\u5728\u906E\u7F69\u4E0A\u662F\u6EE1\u7684\uFF0C\u53D6\u5230\u7684\u6709\u4E00\u4E0B\u8D85\u8FC7 0.15
  // \u5C31\u662F\u6328\u7740\u65B0\u5B57\uFF0C\u4E0D\u8584\uFF08\u4E0D\u7136\u65B0\u5B57\u5916\u9762\u4E5F\u8584\u4E00\u5708\uFF09
  if (breath > 0.001) {
    float gr = 0.006 * uRes.y, ga = hash(px + 17.0) * 6.2832, gm = 0.0, gx = m;
    for (int i = 0; i < 4; i++) {
      float a = ga + float(i) * 1.5708, g = texture(uMask, gv + vec2(cos(a), sin(a)) * gr / uRes).r;
      gm += g; gx = max(gx, g);
    }
    breath *= 1.0 - 0.55 * smoothstep(0.0, 0.07, gm * 0.25) * (1.0 - smoothstep(0.1, 0.15, gx));
  }
  // \u96FE\uFF1A\u6A21\u7CCA\u7684\u7A97\u5916\u63D0\u4EAE\u53D1\u7070\uFF0C\u5149\u6655\u6563\u5F97\u66F4\u5F00\uFF0C\u52A0\u6D53\u6DE1\u8D77\u4F0F\u548C\u7EC6\u9897\u7C92\uFF0C\u4E0B\u534A\u90E8\u5206\u7565\u6D53
  float dens = uMist * (0.82 + 0.3 * vnoise(px / 380.0 + uTime * 0.015)) * (0.9 + 0.2 * vUv.y) + breath * 0.9;
  vec3 haze = vec3(0.70, 0.74, 0.78);
  vec3 blur = vec3(0.0), glow = vec3(0.0);
  if (!uSeeThrough) {
#if NEBBIA_FOG_TEX
  // \u9884\u6E32\u67D3\u7EB9\u7406\u7684\u7B2C 0 \u884C\u662F vUv.y = 1\uFF08\u5C4F\u5E55\u5E95\u90E8\uFF09\uFF0C\u6240\u4EE5\u7EB5\u5411\u7FFB\u4E00\u4E0B
  vec2 fu = vec2(vUv.x, 1.0 - vUv.y);
  blur = texture(uFogBlur, fu).rgb;
  glow = texture(uFogGlow, fu).rgb;
#else
  blur = scene(q, 0.03);
  glow = scene(q, 0.09);
#endif
  }
  // \u5BC6\u5230\u666E\u901A\u96FE\u7684\u8303\u56F4\u4EE5\u4E0A\uFF08\u54C8\u6C14\uFF09\u65F6\uFF0C\u7A97\u5916\u518D\u6697\u4E00\u70B9\u3001\u4E73\u767D\u518D\u591A\u4E00\u70B9
  vec3 fog = blur * max(0.08, 1.0 - 0.45 * dens - 0.25 * breath) + glow * 0.9 * dens + haze * (0.2 * dens + 0.25 * breath);
  // \u900F\u660E\u65F6\u96FE\u7684\u6D53\u6DE1\u5C31\u662F\u4E0D\u900F\u660E\u5EA6\uFF0C\u989C\u8272\u662F uMistTint
  float alpha = 1.0;
  if (uSeeThrough) {
    // \u6DF1\u8272\u7684\u96FE\u53E0\u5728\u6697\u684C\u9762\u4E0A\u4E0D\u663E\uFF0C\u6BD4\u767D\u96FE\u6D53\u4E00\u70B9
    alpha = clamp((0.62 * dens + 0.3 * breath) * mix(1.3, 1.0, dot(uMistTint, vec3(0.333))), 0.0, 0.92);
    fog = uMistTint * alpha;
  }
  // \u900F\u660E\u65F6\u9897\u7C92\u4E58\u4E0D\u900F\u660E\u5EA6\uFF1A\u96FE\u5F88\u6DE1\u7684\u5730\u65B9\u4E0D\u5728\u540E\u9762\u7684\u4E1C\u897F\u4E0A\u6492\u4EAE\u70B9
  fog += (hash(px) - 0.5) * 0.025 * alpha;
  // \u805A\u5149\u706F\u7167\u5230\u73BB\u7483\u4E0A\uFF1A\u96FE\u91CC\u7684\u5C0F\u6C34\u6EF4\u628A\u5149\u6563\u5F00\uFF0C\u5B57\u5468\u56F4\u4E00\u5708\u96FE\u88AB\u7167\u6210\u5F3A\u8C03\u8272
  vec2 sd = q - uSpotTgt;
  fog += uLa * uSpotI * exp(-dot(sd, sd) / (uSpotR * uSpotR * 2.2)) * (0.18 + 0.4 * dens);
  fog += smoothstep(0.78, 0.98, nz.b) * 0.05 * dens;
  // \u6C34\u73E0\u7EB9\u7406\uFF1A\u64E6\u75D5\u8FB9 / \u4E0B\u6DCC\u7684\u6C34\u73E0 rd\uFF0C\u96FE\u4E0A\u7684\u51DD\u7ED3\u6C34\u73E0 fd\uFF08\u64E6\u5F00\u7684\u5730\u65B9\u6CA1\u6709\uFF09
  vec4 rd = texture(uDrop, gv);
  vec4 fd = texture(uField, gv) * (1.0 - clear);
  // \u548C raindrop-fx \u4E00\u6837\uFF0C\u6C34\u73E0\u5468\u56F4\u4E00\u5708\u7684\u96FE\u4E5F\u88AB\u62B9\u6389
  clear = max(clear, smoothstep(0.93, 1.0, rd.a));
  vec3 col = fog;
  if (clear > 0.001) {
    // \u64E6\u5F00\u7684\u5730\u65B9\uFF1A\u6E05\u6670\u7684\u7A97\u5916\uFF0C\u7559\u4E00\u5C42\u5F88\u8584\u7684\u6C34\u819C
    vec3 wiped = (uSeeThrough ? vec3(0.0) : scene(q, 0.0012) * 1.05) + haze * 0.02 * dens;
    float rim = clear * (1.0 - clear) * 4.0;
    col = mix(fog, wiped, clear) + rim * haze * 0.16 * dens;
    if (uSeeThrough) alpha = mix(alpha, 0.02 * dens, clear) + rim * 0.16 * dens;
  }
  // \u5408\u6210\u65B9\u5F0F\u7167\u642C raindrop-fx \u7684 compose.glsl\uFF1A\u9608\u503C\u6210\u5F62\u3001\u6309\u6CD5\u7EBF\u6298\u5C04\u6E05\u6670\u7684\u7A97\u5916\u3001\u6309\u5149\u7167\u660E\u6697
  vec4 comp = vec4(rd.rgb + fd.rgb - 2.0 * rd.rgb * fd.rgb, max(rd.a, fd.a));
  float dmask = smoothstep(0.96, 0.99, comp.a);
  if (dmask > 0.001) {
    vec2 nn = comp.rg - 0.5;
    vec2 ruv = sv + vec2(-nn.x, nn.y) * (comp.b * 0.6 + 0.4) * uRefract;
    // \u96FE\u7B3A demo \u7528\u7684\u662F\u8F7B\u5EA6\u6A21\u7CCA\u7684\u80CC\u666F\u3001\u6F2B\u53CD\u5C04 0.2\u20130.5\u3001\u9AD8\u5149\u6307\u6570 48
    vec3 lens;
#if defined(NEBBIA_DEW) && NEBBIA_FOG_TEX
    // \u51DD\u9732\u7684\u7EC6\u6C34\u73E0\u53C8\u5BC6\u53C8\u5C0F\uFF0C\u6BCF\u4E2A\u50CF\u7D20\u91CD\u7B97\u4E00\u904D\u7A97\u5916\u592A\u8D35\uFF1A\u8BFB\u9884\u6E32\u67D3\u597D\u7684\u540C\u6837\u6A21\u7CCA\uFF080.006\uFF09\u7684\u7A97\u5916\uFF0C\u4F4E\u5206\u8FA8\u7387\u4E0B\u653E\u5927\u770B\u4E0D\u51FA\u5DEE\u522B\u3002
    // \u64E6\u75D5\u8FB9\u7684\u6C34\u73E0\uFF08rd \u5360\u4E0A\u98CE\uFF09\u7167\u65E7\u73B0\u7B97
    if (!uSeeThrough && fd.a > rd.a) lens = texture(uFogSharp, vec2(ruv.x - uSceneShift.x, 1.0 - ruv.y + uSceneShift.y)).rgb;
    else
#endif
    lens = scene(vec2(ruv.x * aspect, ruv.y), 0.006);
    vec3 normal = normalize(vec3(nn * 2.0, 1.0));
    vec3 lightDir = normalize(vec3(-1.0, 1.0, 2.0));
    float lambert = clamp(dot(lightDir, normal), 0.0, 1.0);
    float spec = pow(max(dot(normal, normalize(lightDir + vec3(0.0, 0.0, 1.0))), 0.0), 48.0);
    lens += (lambert - 0.8) * vec3(0.3, 0.3, 0.32) + spec * vec3(0.3, 0.3, 0.33) * uGlint;
    if (uSeeThrough) {
      // \u548C raindrop-fx \u4E00\u6837\uFF0C\u6C34\u73E0\u662F\u4E00\u9897\u900F\u955C\uFF0C\u91CC\u9762\u662F\u6298\u5C04\u8FC7\u6765\u7684\u80CC\u666F\u3002\u900F\u660E\u65F6\u62FF\u4E0D\u5230\u7A97\u540E\u9762\u7684\u753B\u9762\uFF0C\u6298\u5C04\u7684\u8FD8\u662F\u96FE\u7B3A\u81EA\u5DF1\u7684
      // \u7A97\u5916\uFF08\u9009\u4E86\u6C34\u65CF\u7BB1\u6298\u5C04\u6C34\u65CF\u7BB1\uFF0C\u522B\u7684\u6298\u5C04\u96E8\u591C\u8857\u666F\uFF09\u3002\u767D\u96FE\u65F6\u6C34\u73E0\u4E0D\u900F\u660E\uFF1A\u8857\u666F\u6BD4\u96FE\u6697\uFF0C\u548C\u900F\u51FA\u540E\u9762\u7684\u5B57\u4E00\u6837\u662F\u6697\u7684\uFF1B
      // \u6DF1\u8272\u96FE\u65F6\u5B57\u900F\u51FA\u7684\u540E\u9762\u6BD4\u96FE\u4EAE\uFF0C\u6C34\u73E0\u4E5F\u8981\u4EE5\u900F\u51FA\u540E\u9762\u4E3A\u4E3B\uFF1A\u8857\u666F\u7559\u4E00\u534A\u4E0D\u5230\uFF0C\u8FB9\u4E0A\u4E00\u5708\u6298\u5C04\u7684\u6697\u8FB9
      float dark = 1.0 - dot(uMistTint, vec3(0.333));
      float rimA = (1.0 - smoothstep(0.975, 0.995, comp.a)) * 0.21;
      float da = mix(1.0, 0.47 + rimA, dark);
      lens = max(lens, vec3(0.0)) * mix(1.0, 0.47, dark);
      alpha = mix(alpha, da, dmask);
    } else {
      // \u8F66\u53A2\u91CC\u7684\u706F\u7167\u5728\u6C34\u73E0\u8868\u9762\uFF1A\u6BD4\u7EAF\u900F\u8FC7\u53BB\u7684\u7A97\u5916\u4EAE\u4E00\u70B9\uFF0C\u4E0D\u4F1A\u5728\u7070\u767D\u7684\u96FE\u4E0A\u663E\u6210\u9ED1\u70B9
      lens = max(lens, fog * 0.55) + haze * 0.08 * dens;
#ifdef NEBBIA_DEW
      // \u51DD\u9732\u73BB\u7483\u4E0A\u7684\u7EC6\u5C0F\u51B7\u51DD\u6C34\u73E0\uFF08nebbiaCondensation.ts\uFF09\uFF1A\u540E\u9762\u6697\uFF08\u6C34\u65CF\u7BB1\u7684\u6C34\u3001\u591C\u91CC\u7684\u8857\uFF09\u65F6\u7167\u5E38\u753B\u4F1A\u50CF\u4E00\u7C92\u7C92\u810F\u70B9\uFF1B
      // \u6309\u6302\u5728\u73BB\u7483\u4E0A\u7684\u6C34\u73E0\u753B\uFF0C\u6BD4\u96FE\u4EAE\u4E00\u70B9\u3001\u5E26\u4E00\u70B9\u9AD8\u5149\u3002\u64E6\u75D5\u8FB9\u7684\u6C34\u73E0\uFF08rd \u5360\u4E0A\u98CE\u7684\u5730\u65B9\uFF09\u7167\u65E7
      float fine = step(rd.a, fd.a);
      lens = mix(lens, max(lens * 1.15, fog * (1.0 + 0.051 * uDewGlint)) + (spec * 0.544 + lambert * 0.068) * dens * uDewGlint, fine);
#endif
    }
    col = mix(col, lens, dmask);
  }
#ifdef NEBBIA_SOFT_HIGHLIGHT
  // \u6C34\u65CF\u7BB1\uFF1A\u805A\u5149\u706F\u3001\u6C34\u6BCD\u3001\u51DD\u9732\u7684\u6C34\u73E0\u53E0\u5728\u540C\u4E00\u5904\u4F1A\u52A0\u8FC7 1\uFF0C\u70E7\u6210\u4E00\u5757\u767D\u3002\u6700\u4EAE\u7684\u90A3\u4E2A\u901A\u9053\u8FC7\u4E86 0.75 \u4EE5\u540E
  // \u6309\u6307\u6570\u6162\u6162\u903C\u8FD1 1\uFF0C\u4E09\u4E2A\u901A\u9053\u540C\u6BD4\u4F8B\u538B\uFF0C\u989C\u8272\u4E0D\u53D8\uFF1B0.75 \u4EE5\u4E0B\u4E0D\u52A8
  if (!uSeeThrough) {
    float pk = max(col.r, max(col.g, col.b));
    if (pk > 0.75) col *= (0.75 + 0.25 * (1.0 - exp((0.75 - pk) / 0.25))) / pk;
  }
#endif
  outColor = uSeeThrough ? vec4(max(col, 0.0), alpha) : vec4(col, 1.0);
}`;
const NEBBIA_MAIN_FS = MAIN_FS(true);
const NEBBIA_MAIN_FALLBACK_FS = MAIN_FS(false);
const nebbiaSceneShaders = (scene, glass = 'rain') => {
  const dew = glass === 'dew';
  if (scene === 'aquarium')
    return {
      fog: fogFs(AQUA_UNIFORMS),
      main: MAIN_FS(true, AQUA_UNIFORMS, dew),
      mainFallback: MAIN_FS(false, AQUA_UNIFORMS, dew),
    };
  if (dew)
    return {
      fog: NEBBIA_FOG_FS,
      main: MAIN_FS(true, SCENE_UNIFORMS, true),
      mainFallback: MAIN_FS(false, SCENE_UNIFORMS, true),
    };
  return { fog: NEBBIA_FOG_FS, main: NEBBIA_MAIN_FS, mainFallback: NEBBIA_MAIN_FALLBACK_FS };
};
const NEBBIA_SPRITE_VS =
  /* glsl */
  `#version 300 es
in vec2 aCorner; in vec4 aRect; in vec2 aParam;
uniform vec2 uView;
out vec2 vUV; out float vSize; out float vAlpha;
void main() {
  vec2 p = aRect.xy + (aCorner - 0.5) * aRect.zw;
  vUV = aCorner; vSize = aParam.x; vAlpha = aParam.y;
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, p.y / uView.y * 2.0 - 1.0, 0.0, 1.0);
}`;
const NEBBIA_SPRITE_FS =
  /* glsl */
  `#version 300 es
precision mediump float;
uniform sampler2D uSprite;
in vec2 vUV; in float vSize; in float vAlpha; out vec4 o;
void main() {
  vec4 c = texture(uSprite, vUV);
  c.a *= vAlpha;
  o = vec4(c.rg * c.a, vSize * c.a, c.a);
}`;
export {
  NEBBIA_BLD_FILL_FS,
  NEBBIA_FOG_FS,
  NEBBIA_MAIN_FALLBACK_FS,
  NEBBIA_MAIN_FS,
  NEBBIA_NOISE_FS,
  NEBBIA_SPRITE_FS,
  NEBBIA_SPRITE_VS,
  NEBBIA_VS,
  nebbiaSceneShaders,
};
