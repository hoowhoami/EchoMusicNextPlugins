// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSceneGlsl.ts
import { NEBBIA_SCENE_COMMON_GLSL } from './nebbiaSceneCommonGlsl.mjs';
import { NEBBIA_SPOT_GLSL } from './nebbiaSpotGlsl.mjs';
const NEBBIA_SCENE_GLSL =
  /* glsl */
  `${NEBBIA_SCENE_COMMON_GLSL}// \u8DEF\u706F\u548C\u62DB\u724C\uFF08\u5012\u5F71\u4E5F\u7528\u5B83\uFF09
vec3 lampsSigns(vec2 q, float b, float t) {
  vec3 c = vec3(0.0);
  // \u62DB\u724C\u3001\u5E97\u9762\uFF1A\u8FD1\uFF0C\u79FB\u52A8\u5FEB\uFF0C\u5E26\u6A2A\u5411\u62D6\u5F71
  float xs = q.x + t * 0.42, cw = 0.34, streak = 0.012 * uBus;
  float cs = floor(xs / cw);
  // \u62DB\u724C\u7684\u706F\u5728 0.46\u20130.56 \u9AD8\u3001\u5E97\u9762\u5728 0.645\uFF08\u5012\u5F71\u8C03\u7528\u65F6 q\u3001b \u4E0D\u4E00\u6837\uFF0C\u5404\u81EA\u5224\u65AD\uFF09
  bool sg = abs(q.y - 0.51) < 0.05 + reach(0.016, b + 0.002), sh = abs(q.y - 0.645) < reach(0.026, b + 0.003);
  if (sg || sh) for (float k = -1.0; k <= 1.0; k++) {
    float n = cs + k;
    // \u62DB\u724C\u3001\u5E97\u9762\u7684\u706F\uFF1A\u90FD\u753B\u6210\u5706\u7684\u6563\u666F\u5149\u6591\uFF08\u8FDC\u5904\u7684\u706F\u5931\u7126\u540E\u662F\u5706\u7684\uFF09\uFF0C\u4E0D\u753B\u65B9\u5757
    if (sg) {
      vec2 cen = vec2((n + 0.2 + 0.6 * h1(n)) * cw, 0.46 + 0.1 * h1(n + 17.0));
      if (h1(n + 33.0) < 0.75) c += pick(h1(n + 2.0)) * glowPt(vec2(xs, q.y) - cen, 0.006 + 0.01 * h1(n + 5.0), b + 0.002, streak) * 1.6;
    }
    // \u5E97\u9762\uFF1A\u5E95\u5C42\u4E00\u4E24\u56E2\u6696\u5149
    vec2 shop = vec2((n + 0.5) * cw, 0.645);
    if (sh && h1(n + 41.0) < 0.6) c += mix(SODIUM, pick(h1(n + 8.0)), 0.3) * glowPt(vec2(xs, q.y) - shop, 0.016 + 0.01 * h1(n + 3.0), b + 0.003, streak) * 0.9;
  }
  // \u8DEF\u706F\uFF1A\u4E2D\u666F\uFF0C\u706F\u5934 + \u96E8\u91CC\u7684\u5927\u5149\u6655\uFF080.36 \u9AD8\uFF0C\u5149\u6655\u534A\u5F84 0.07\uFF09
  float xl = q.x + t * 0.22, lw = 0.55;
  float cl = floor(xl / lw);
  if (abs(q.y - 0.36) < reach(0.07, b)) for (float k = -1.0; k <= 1.0; k++) {
    vec2 d = vec2(xl - (cl + k + 0.5) * lw, q.y - 0.36);
    c += SODIUM * (glowPt(d, 0.007, b, 0.004 * uBus) * 2.6 + glowPt(d, 0.07, b, 0.0) * 0.3);
  }
  return c;
}
// \u4E00\u5C42\u697C\u7FA4\uFF08layer 0 = \u8FDC\uFF0C1 = \u8FD1\uFF09\u3002\u8FD4\u56DE rgb = \u989C\u8272\uFF0Ca = \u8986\u76D6\u5EA6\u3002
// \u6BCF\u683C\u4E00\u680B\uFF1A\u5BBD\u5EA6\u3001\u9AD8\u5EA6\u968F\u673A\uFF0C\u4E00\u534A\u5E26\u6536\u5206\u7684\u9876\u5C42\uFF0C\u5C11\u6570\u9876\u4E0A\u6709\u5929\u7EBF\uFF1B\u7ACB\u9762\u4E0B\u4EAE\u4E0A\u6697\uFF08\u88AB\u8857\u706F\u7167\uFF09\u3001\u4E00\u4FA7\u6709\u4E00\u9053\u8FB9\u5149\uFF1B
// \u7A97\u662F\u5C0F\u683C\u5B50\uFF0C\u6BCF\u680B\u4EAE\u706F\u6BD4\u4F8B\u4E0D\u540C\uFF0C\u6709\u7684\u6574\u5C42\u5168\u9ED1\uFF0C\u4EAE\u7740\u7684\u7A97\u5206\u6696\u767D\u3001\u51B7\u767D\u548C\u4E3B\u9898\u8272\uFF0C\u4EAE\u5EA6\u4E0D\u4E00\u3002
vec4 building(vec2 q, float b, float t, float layer) {
  float near = layer;
  float x = q.x + t * mix(0.02, 0.035, near) + layer * 7.7;
  float cw = mix(0.065, 0.12, near), aa = max(b, 0.0012);
  float c0 = floor(x / cw);
  vec4 res = vec4(0.0);
  // \u6BCF\u680B\u697C\uFF08\u8FDE\u6536\u5206\u9876\u5C42\u3001\u5929\u7EBF\uFF09\u90FD\u843D\u5728\u81EA\u5DF1\u90A3\u4E00\u683C\u91CC\uFF0C\u5DE6\u53F3\u90BB\u5C45\u53EA\u5728\u79BB\u683C\u8FB9\u4E0D\u5230\u6A21\u7CCA\u534A\u5F84\uFF08\u518D\u52A0\u5929\u7EBF\u5BBD\uFF09\u65F6\u624D\u78B0\u5F97\u5230\u8FD9\u4E2A\u50CF\u7D20\uFF1A
  // \u79BB\u5F97\u66F4\u8FDC\u65F6\u90BB\u5C45\u7684\u8986\u76D6\u5EA6\u5FC5\u7136\u662F 0\uFF0C\u8DF3\u8FC7\uFF0C\u753B\u9762\u4E0D\u53D8\u3002\u6E05\u6670\u7A97\u5916\u6A21\u7CCA\u534A\u5F84\u5F88\u5C0F\uFF0C\u5927\u90E8\u5206\u50CF\u7D20\u53EA\u7528\u7B97\u672C\u683C\u4E00\u680B
  float fx = x - c0 * cw, nbReach = aa + 0.0013;
  for (float k = -1.0; k <= 1.0; k++) {
    if ((k < 0.0 && fx > nbReach) || (k > 0.0 && cw - fx > nbReach)) continue;
    float n = c0 + k + layer * 100.0;
    float w = cw * (0.72 + 0.26 * h1(n));
    float left = (c0 + k) * cw + (cw - w) * h1(n + 1.0);
    float lx = x - left;
    float hgt = mix(0.07, 0.11, near) + mix(0.16, 0.27, near) * pow(h1(n + 2.0), 1.5);
    float base = HZ + near * 0.015;
    float top = base - hgt;
    // \u6536\u5206\u7684\u9876\u5C42
    bool tier = h1(n + 3.0) < 0.5;
    float tw = w * (0.5 + 0.25 * h1(n + 4.0)), tl = (w - tw) * 0.5, th = hgt * (0.12 + 0.15 * h1(n + 5.0));
    float body = smoothstep(-aa, aa, lx) * smoothstep(-aa, aa, w - lx) * smoothstep(-aa, aa, q.y - top);
    float up = tier ? smoothstep(-aa, aa, lx - tl) * smoothstep(-aa, aa, tl + tw - lx) * smoothstep(-aa, aa, q.y - (top - th)) : 0.0;
    float roof = tier ? top - th : top;
    // \u5929\u7EBF
    float ant = h1(n + 6.0) < 0.3 ? smoothstep(0.0012 + aa, 0.0, abs(lx - w * 0.5)) * smoothstep(-aa, aa, q.y - (roof - 0.04 - 0.03 * h1(n + 7.0))) : 0.0;
    float cov = max(max(body, up), ant);
    if (cov <= 0.0) continue;
    // \u7ACB\u9762\uFF1A\u6697\u8272\uFF0C\u6309\u697C\u7565\u6709\u5DEE\u522B\uFF1B\u8D8A\u5F80\u4E0B\u8D8A\u88AB\u8857\u9762\u7684\u706F\u7167\u4EAE\uFF1B\u5DE6\u4FA7\u4E00\u9053\u7EC6\u8FB9\u5149
    vec3 fac = mix(uSky0, vec3(0.015, 0.018, 0.025), 0.55) * (0.7 + 0.6 * h1(n + 8.0));
    float lowLit = pow(clamp((q.y - roof) / (base - roof), 0.0, 1.0), 2.5);
    fac += mix(SODIUM, uLa, 0.5) * 0.1 * lowLit;
    fac += mix(uSky1, uLb, 0.3) * 0.12 * smoothstep(0.003 + aa, 0.0, lx) * body;
    // \u7A97\u683C
    float fh = mix(0.0075, 0.012, near), wc = mix(0.0055, 0.0085, near);
    vec2 g = vec2((lx - wc * 0.6) / wc, (q.y - roof - fh * 0.8) / fh);
    vec2 id = floor(g), f = fract(g);
    float dens = 0.15 + 0.5 * h1(n + 9.0);
    float floorOn = step(0.18, hash(vec2(id.y, n)));
    float on = step(hash(id + n * 3.7), dens) * floorOn;
    // \u7A97\u533A\u8FB9\u754C\u8DDF\u7740\u6A21\u7CCA\u534A\u5F84\u53D8\u8F6F\uFF0C\u7CCA\u5F00\u65F6\u4E0D\u51FA\u786C\u8FB9
    float inside = smoothstep(-aa, aa, lx - wc * 0.6) * smoothstep(-aa, aa, w - wc * 0.6 - lx) * smoothstep(-aa, aa, q.y - roof - fh * 0.8) * smoothstep(-aa, aa, base - fh - q.y);
    float pane = smoothstep(0.32, 0.22, abs(f.x - 0.5)) * smoothstep(0.3, 0.2, abs(f.y - 0.5));
    // \u88AB\u96FE\u7CCA\u5F00\u65F6\u7A97\u683C\u53D8\u6210\u5E73\u5747\u4EAE\u5EA6\uFF0C\u4E0D\u95EA
    float blurMix = clamp(b / (wc * 0.8), 0.0, 1.0);
    float win = mix(pane * on, 0.3 * dens * 0.82, blurMix) * inside * max(body, up);
    float hc = hash(id + n * 1.3);
    vec3 wcol = hc < 0.5 ? vec3(1.0, 0.78, 0.5) : (hc < 0.8 ? vec3(0.78, 0.88, 1.0) : pick(hash(id + 5.0)));
    // \u7CCA\u5F00\u65F6\u6BCF\u683C\u7684\u989C\u8272\u3001\u4EAE\u5EA6\u4E5F\u6362\u6210\u5E73\u5747\u503C\uFF0C\u5426\u5219\u4F1A\u51FA\u73B0\u9A6C\u8D5B\u514B
    wcol = mix(wcol * (0.55 + 0.6 * hash(id + 2.9)), vec3(0.95, 0.82, 0.66) * 0.85, blurMix);
    vec3 bc = fac + wcol * win * mix(0.7, 1.0, near);
    // \u8FDC\u5C42\u88AB\u5927\u6C14\u51B2\u6DE1\uFF0C\u5F80\u5929\u8272\u9760
    bc = mix(bc, mix(uSky0, uSky1, 0.7), mix(0.45, 0.12, near));
    res = vec4(mix(res.rgb, bc, cov), max(res.a, cov));
  }
  return res;
}
// \u4ECE\u697C\u7FA4\u7F13\u5B58\u53D6\u4E00\u5C42\uFF08\u9884\u4E58\u989C\u8272\uFF09\uFF1A\u6A2A\u5411\u6309\u8FD9\u5C42\u7684\u901F\u5EA6\uFF08building \u91CC\u7684 0.02\u30010.035\uFF09\u5E73\u79FB\uFF0C\u73AF\u5F62\u53D6\u6837
vec4 bldAt(sampler2D s, vec2 q, float t, float speed, vec3 g) {
  // \u6CA1\u6709 mipmap\uFF1B\u5728\u5206\u652F\u91CC\u53D6\u6837\uFF0C\u7528 textureLod \u4E0D\u4F9D\u8D56\u5BFC\u6570
  return textureLod(s, vec2((q.x + t * speed) / g.z, (q.y - g.x) / (g.y - g.x)), 0.0);
}
// \u4E3B\u9898\u8272\u9713\u8679\uFF08\u7167\u96E8\u6E56\u7684\u8FDC\u5904\u706F\u5149\uFF09\uFF1A\u697C\u7FA4\u4E4B\u95F4\u5BC6\u5BC6\u7684\u5F69\u8272\u5C0F\u6563\u666F\uFF0C\u5076\u5C14\u4E00\u5927\u56E2\u9713\u8679\u5E26\u4E00\u5708\u5F88\u5927\u7684\u5149\u6655\u3002
// \u989C\u8272\u53D6\u8FD9\u9996\u6B4C\u7684\u4E09\u4E2A\u706F\u5149\u8272\uFF1B\u79FB\u52A8\u901F\u5EA6\u4ECB\u4E8E\u697C\u7FA4\u548C\u8DEF\u706F\u4E4B\u95F4\u3002\u5012\u5F71\u4E5F\u7528\u5B83\u3002
vec3 neonLights(vec2 q, float b, float t) {
  vec3 c = vec3(0.0);
  float bb = b + 0.003;   // \u6563\u666F\u672C\u8EAB\u5C31\u662F\u865A\u7684
  // \u5C0F\u6563\u666F\uFF1A\u4E24\u6392\u683C\u5B50\uFF0C\u6BCF\u683C\u6700\u591A\u4E00\u9897\uFF0C\u843D\u5728\u697C\u7FA4\u90A3\u4E00\u6BB5\u9AD8\u5EA6\u91CC\uFF080.38\u20130.58\uFF09
  if (abs(q.y - (HZ - 0.12)) < 0.1 + reach(0.012, bb)) for (float row = 0.0; row < 2.0; row++) {
    float x = q.x + t * (0.06 + row * 0.03) + row * 7.3, cw = 0.045 - row * 0.012;
    float c0 = floor(x / cw);
    for (float k = -1.0; k <= 1.0; k++) {
      float n = c0 + k + row * 300.0;
      if (h1(n + 11.0) > 0.85) continue;
      vec2 cen = vec2((c0 + k + 0.15 + 0.7 * h1(n)) * cw, HZ - 0.02 - 0.2 * pow(h1(n + 3.0), 1.6));
      float r = 0.004 + 0.008 * pow(h1(n + 6.0), 3.0);
      c += pick(h1(n + 9.0)) * glowPt(vec2(x, q.y) - cen, r, bb, 0.0) * (1.0 + 1.8 * h1(n + 13.0));
    }
  }
  // \u5927\u9713\u8679\uFF1A\u7A00\u758F\uFF0C\u4E00\u4E2A\u4EAE\u6838 + \u4E00\u5708\u5F88\u5927\u7684\u540C\u8272\u5149\u6655\uFF08\u96E8\u6E56\u5DE6\u8FB9\u90A3\u76CF\u6D0B\u7EA2\u706F\uFF09
  float xb = q.x + t * 0.1, bw = 0.75, cb = floor(xb / bw);
  if (abs(q.y - (HZ - 0.14)) < 0.06 + reach(0.13, b)) for (float k = -1.0; k <= 1.0; k++) {
    float n = cb + k + 500.0;
    vec2 d = vec2(xb - (cb + k + 0.2 + 0.6 * h1(n)) * bw, q.y - (HZ - 0.08 - 0.12 * h1(n + 2.0)));
    vec3 lc = pick(h1(n + 4.0));
    c += lc * (glowPt(d, 0.014, bb, 0.0) * 2.0 + glowPt(d, 0.13, b, 0.0) * 0.4);
  }
  return c;
}
${NEBBIA_SPOT_GLSL}
// \u516C\u4EA4\u8F66\u4FA7\u7A97\u5916\u7684\u96E8\u591C\u8857\u666F\uFF1A\u8FDC\u5904\u697C\u7FA4\u6162\u3001\u8DEF\u706F\u4E2D\u901F\u3001\u62DB\u724C\u548C\u8F66\u706F\u5FEB
vec3 scene(vec2 q, float b) {
  float t = uTime * uBus;
  vec3 col = mix(uSky0, uSky1, smoothstep(0.0, HZ, q.y));
  col += mix(uLa, SODIUM, 0.4) * 0.14 * exp(-abs(q.y - HZ + 0.12) * 6.0);
  // \u697C\u7FA4\uFF1A\u8FDC\u8FD1\u4E24\u5C42\uFF0C\u8FDC\u5C42\u77EE\u3001\u6DE1\u3001\u7A97\u5C0F\uFF1B\u8FD1\u5C42\u9AD8\u3001\u7EC6\u8282\u591A
  float aa = max(b, 0.0015), c0;
  // \u697C\u7FA4\u8D70\u7F13\u5B58\uFF08nebbiaBuildingCache.ts\uFF09\u3002\u6C34\u73E0\u900F\u955C\uFF08b = 0.006\uFF09\u6298\u5C04\u5F97\u8FDC\uFF0C\u4F1A\u53D6\u5230\u7F13\u5B58\u8303\u56F4\u5916\u9762\uFF0C\u7167\u65E7\u73B0\u7B97\uFF08\u53EA\u5360\u51E0\u9897\u6C34\u73E0\u7684\u9762\u79EF\uFF09\uFF1B
  // \u7F13\u5B58\u8FD8\u6CA1\u753B\u597D\u7684\u90A3\u6863\u4E5F\u73B0\u7B97
  bool bldOn = sceneryOn(SCN_BUILDINGS);
  bool cached = b < 0.002 ? uBldOn.x : (b > 0.05 ? uBldOn.z : (b > 0.02 ? uBldOn.y : false));
  if (bldOn && cached) {
    vec4 bf, bn;
    if (b > 0.05) { bf = bldAt(uBld4, q, t, 0.02, uBldGeo[2]); bn = bldAt(uBld5, q, t, 0.035, uBldGeo[2]); }
    else if (b > 0.02) { bf = bldAt(uBld2, q, t, 0.02, uBldGeo[1]); bn = bldAt(uBld3, q, t, 0.035, uBldGeo[1]); }
    else { bf = bldAt(uBld0, q, t, 0.02, uBldGeo[0]); bn = bldAt(uBld1, q, t, 0.035, uBldGeo[0]); }
    col = col * (1.0 - bf.a) + bf.rgb;
    col = col * (1.0 - bn.a) + bn.rgb;
  } else if (bldOn) {
    vec4 bf = building(q, b, t, 0.0);
    col = mix(col, bf.rgb, bf.a);
    vec4 bn = building(q, b, t, 1.0);
    col = mix(col, bn.rgb, bn.a);
  }
  // \u4E3B\u9898\u8272\u9713\u8679\u538B\u5728\u697C\u7FA4\u524D\u9762\uFF1B\u5929\u8FB9\u518D\u94FA\u4E00\u5C42\u5F88\u5BBD\u7684\u4E3B\u9898\u8272\u8F89\u5149
  bool lightsOn = sceneryOn(SCN_LIGHTS);
  if (lightsOn) {
    col += (neonLights(q, b, t) + uLa * 0.12 * exp(-abs(q.y - HZ + 0.1) * 5.0)) * uNeon;
    col += lampsSigns(q, b, t);
  }
  // \u6E7F\u8DEF\u9762\u548C\u5012\u5F71\uFF08\u8DEF\u9762\u5173\u6389\u65F6\u8F66\u706F\u4E5F\u6CA1\u6709\u5012\u5F71\uFF09
  float road = sceneryOn(SCN_ROAD) ? smoothstep(ROAD - aa, ROAD + aa, q.y) : 0.0;
  col = mix(col, uSky0 * 0.5, road * 0.85);
  // \u5012\u5F71\u90FD\u4E58 road\uFF0C\u8DEF\u9762\u4EE5\u4E0A\u6070\u597D\u662F 0\uFF1A\u76F4\u63A5\u8DF3\u8FC7\uFF0C\u753B\u9762\u4E0D\u53D8\uFF0C\u7701\u6389\u5C4F\u4E0A\u5927\u534A\u50CF\u7D20\u7684\u4E24\u6574\u5957\u62DB\u724C\u3001\u9713\u8679\u8BA1\u7B97
  if (road > 0.0 && lightsOn) {
    vec2 qr = vec2(q.x, ROAD - (q.y - ROAD) * 0.55);
    col += lampsSigns(qr, b + 0.012, t) * road * 0.35;
    // \u9713\u8679\u5012\u5F71\uFF1A\u7EB5\u5411\u538B\u5F97\u66F4\u6241\uFF0C\u6240\u4EE5\u5728\u6E7F\u8DEF\u9762\u4E0A\u62C9\u6210\u7AD6\u76F4\u7684\u5149\u67F1\uFF08\u96E8\u6E56\u7684\u5012\u5F71\u505A\u6CD5\uFF09
    vec2 qn = vec2(q.x, HZ - (q.y - ROAD) * 0.22);
    col += neonLights(qn, b + 0.008, t) * road * 0.45 * uNeon;
  }
  // \u8F66\u706F\uFF1A\u540C\u5411\u8F66\u9053\u5C3E\u706F\uFF08\u7EA2\uFF09\uFF0C\u5BF9\u5411\u8F66\u9053\u524D\u706F\uFF08\u767D\uFF09\uFF0C\u5FEB\u901F\u63A0\u8FC7\u62D6\u51FA\u957F\u5F71
  if (sceneryOn(SCN_CARS)) for (float lane = 0.0; lane < 2.0; lane++) {
    float sp = lane < 0.5 ? 0.55 : -1.1, ly = lane < 0.5 ? 0.76 : 0.83, ww = 0.9;
    float xc = q.x + t * sp, cc = floor(xc / ww);
    vec3 lc = lane < 0.5 ? vec3(1.0, 0.18, 0.12) : vec3(1.0, 0.95, 0.85);
    // \u8F66\u706F\u548C\u5B83\u5728\u8DEF\u9762\u4E0A\u7684\u5012\u5F71\u7EB5\u5411\u90FD\u7167\u4E0D\u5230\u8FD9\u4E00\u884C\uFF08\u5012\u5F71\u4E58 road\uFF0C\u8DEF\u9762\u4EE5\u4E0A\u672C\u6765\u5C31\u662F 0\uFF09\u5C31\u8DF3\u8FC7\u8FD9\u6761\u8F66\u9053
    bool hd = abs(q.y - ly) < reach(0.004, b), rf = road > 0.0 && abs((q.y - ly) * 3.0 - 0.03) < reach(0.02, b * 2.0);
    if (!hd && !rf) continue;
    for (float k = -1.0; k <= 1.0; k++) {
      float n = cc + k + lane * 50.0;
      if (h1(n) > 0.6) continue;
      float cx = (cc + k + 0.2 + 0.6 * h1(n + 4.0)) * ww;
      float st = abs(sp) * 0.03 * uBus;
      if (hd) {
        c0 = glowPt(vec2(xc - cx + 0.035, q.y - ly), 0.004, b, st) + glowPt(vec2(xc - cx - 0.035, q.y - ly), 0.004, b, st);
        col += lc * c0 * 2.2;
      }
      if (rf) col += lc * glowPt(vec2(xc - cx, (q.y - ly) * 3.0 - 0.03), 0.02, b * 2.0, st) * road * 0.3;
    }
  }
  // \u7A97\u5916\u7684\u96E8\uFF1A\u76F8\u5BF9\u8F66\u8EAB\u7684\u901F\u5EA6 = \u5F80\u4E0B\u843D + \u5F80\u540E\uFF08\u8F66\u5F80\u53F3\u5F00\uFF0C\u7A97\u5916\u5F80\u5DE6\u8D70\uFF09\uFF0C\u8F66\u8D8A\u5FEB\u8D8A\u659C\uFF1B\u505C\u7AD9\u65F6\u7AD6\u76F4\u843D\u3002
  // \u96E8\u4E1D\u53EA\u5728\u805A\u5149\u706F\u5149\u67F1\u91CC\u753B\uFF08\u88AB\u7167\u4EAE\u7684\u90A3\u4E9B\uFF09\u3002\u8BBE\u7F6E\u91CC\u53EF\u4EE5\u8BA9\u5B83\u603B\u662F\u7AD6\u76F4\u843D\uFF0C\u6216\u8005\u4E0D\u4E0B\uFF08\u53EA\u5269\u5149\u67F1\uFF09
  float beam = spotBeam(q, b);
  if (!sceneryOn(SCN_RAIN)) return col + uLa * beam;
  vec2 rd = normalize(vec2(sceneryOn(SCN_RAIN_SLANT) ? -WIND * uBus : 0.0, 1.0));
  vec2 r = vec2(dot(q, rd), dot(q, vec2(-rd.y, rd.x)));
  float colId = floor(r.y / 0.007), hr = h1(colId);
  float seg = fract(r.x * (1.5 + hr) - uTime * (2.5 + hr * 2.0) * (1.0 + 0.4 * uBus) + hr * 10.0);
  float line = smoothstep(0.0012 + b, 0.0, abs(fract(r.y / 0.007) - 0.5) * 0.007) * smoothstep(0.0, 0.1, seg) * smoothstep(0.3, 0.1, seg);
  // \u805A\u5149\u706F\uFF1A\u5149\u67F1\u53E0\u5728\u6700\u524D\u9762\uFF1B\u5149\u67F1\u91CC\u7684\u96E8\u4E1D\u88AB\u7167\u4EAE
  col += uLa * beam + mix(uLa, vec3(1.0), 0.5) * line * beam * 1.6 * step(0.3, hr) * (1.0 - clamp(b * 40.0, 0.0, 1.0));
  return col;
}
`;
export { NEBBIA_SCENE_GLSL };
