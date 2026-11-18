// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaAquaGlsl.ts
import { NEBBIA_BUBBLE_GLSL } from './nebbiaBubbleGlsl.mjs';
import { NEBBIA_JELLY_GLSL } from './nebbiaJellyGlsl.mjs';
import { NEBBIA_SCENE_COMMON_GLSL } from './nebbiaSceneCommonGlsl.mjs';
import { NEBBIA_SPOT_GLSL } from './nebbiaSpotGlsl.mjs';
const NEBBIA_AQUA_GLSL =
  /* glsl */
  `${NEBBIA_SCENE_COMMON_GLSL}${NEBBIA_SPOT_GLSL}${NEBBIA_JELLY_GLSL}${NEBBIA_BUBBLE_GLSL}
// \u300C\u821E\u6F6E\u8E0F\u62CD\u300D\u7684\u6C34\u8349\u4E00\u9879\uFF08nebbiaWeedSway.ts\uFF09\uFF1A\u5F39\u7C27\u73B0\u5728\u30010.05\u30010.1\u30010.15 \u79D2\u524D\u7684\u4F4D\u7F6E\uFF1B\u6839\u53D6\u73B0\u5728\u3001\u68A2\u53D6 0.15 \u79D2\u524D\uFF0C
// \u4ECE\u6839\u5F80\u68A2\u4F20
uniform vec4 uSway;
// \u6C34\u8349\u81EA\u5DF1\u7684\u6446\u52A8\u7559\u591A\u5C11\uFF1A1 \u7167\u5E38\uFF0C\u821E\u6F6E\u8E0F\u62CD\u7684\u6C34\u8349\u4E00\u9879\u5F00\u7740\u65F6 0\uFF08\u53EA\u8DDF\u62CD\u8D70\uFF09\uFF0C\u5207\u6362\u65F6\u6162\u6162\u8FC7\u6E21\uFF08nebbiaAquarium.ts\uFF09
uniform float uWeedIdle;
float weedKick(float s) {
  float f = clamp(s, 0.0, 1.0) * 3.0;
  return f < 1.0 ? mix(uSway.x, uSway.y, f) : f < 2.0 ? mix(uSway.y, uSway.z, f - 1.0) : mix(uSway.z, uSway.w, f - 2.0);
}
vec3 scene(vec2 q, float b) {
  float t = uTime, sharp = 1.0 - clamp(b * 25.0, 0.0, 1.0);
  vec3 deep = uSky0 * 0.55;
  vec3 col = mix(mix(uSky1, uLa, 0.3) * 1.25 + 0.02, deep, smoothstep(0.0, 0.95, q.y));
  vec3 lightC = mix(uLa, vec3(1.0), 0.45);
  // \u6C34\u9762\u7167\u4E0B\u6765\u7684\u5149\u675F\uFF0C\u8D8A\u5F80\u4E0B\u8D8A\u6DE1\uFF1B\u6700\u4E0A\u9762\u4E00\u5C42\u6C34\u9762\u7684\u7CBC\u5149
  float rx = q.x + q.y * 0.35;
  float rays = pow(0.5 + 0.5 * sin(rx * 9.0 + t * 0.3 + sin(rx * 3.1 - t * 0.2) * 1.5), 6.0)
             + 0.6 * pow(0.5 + 0.5 * sin(rx * 17.0 - t * 0.45), 8.0);
  col += lightC * mix(0.25, rays, sharp * 0.6 + 0.4) * (1.0 - smoothstep(0.0, 0.85, q.y)) * 0.13;
  col += lightC * 0.8 * exp(-q.y * 14.0) * (0.25 + 0.15 * sin(q.x * 30.0 + t * 1.3 + sin(q.x * 7.0)) * sharp);
  // \u6C99\u5E95\u548C\u7126\u6563\uFF08\u300C\u9A6C\u8DEF\u300D\uFF09
  if (sceneryOn(SCN_ROAD)) {
    float floorY = 0.89 + 0.015 * sin(q.x * 3.0);
    float caus = pow(abs(sin(q.x * 23.0 + sin(q.y * 40.0 + t) * 1.2 + t * 0.6) * sin(q.x * 17.0 - t * 0.5 + q.y * 30.0)), 3.0);
    col = mix(col, deep * 1.3 + 0.03 + lightC * caus * 0.12 * sharp, smoothstep(floorY - 0.01 - b, floorY + 0.01 + b, q.y));
  }
  // \u7901\u77F3\uFF08\u300C\u697C\u7FA4\u300D\uFF09\uFF1A\u9876\u4E0A\u88AB\u6C34\u9762\u7684\u5149\u7167\u4EAE\u3001\u5E26\u4E00\u70B9\u7126\u6563\uFF0C\u5F80\u4E0B\u6E10\u6697\uFF0C\u8868\u9762\u6709\u5751\u6D3C\u7684\u7EB9\u7406\uFF1B\u6BD4\u540E\u9762\u7684\u6C34\u4EAE\u4E00\u70B9\u624D\u770B\u5F97\u51FA\u662F\u77F3\u5934
  if (sceneryOn(SCN_BUILDINGS)) {
    float rockY = 0.8 + 0.07 * vnoise(vec2(q.x * 3.5, 1.0)) + 0.02 * vnoise(vec2(q.x * 14.0, 3.0));
    float under = max(q.y - rockY, 0.0);
    float tex = 0.75 + 0.5 * mix(0.5, vnoise(q * vec2(26.0, 34.0)) * 0.65 + vnoise(q * vec2(70.0, 90.0)) * 0.35, sharp);
    vec3 rock = mix(deep * 1.6 + lightC * 0.07, deep * 0.75, smoothstep(0.0, 0.09, under)) * tex;
    float rc = pow(abs(sin(q.x * 31.0 + t * 0.5 + sin(q.y * 50.0 - t * 0.7)) * sin(q.x * 19.0 - t * 0.4 + q.y * 37.0)), 4.0);
    rock += lightC * (0.16 * exp(-under * 70.0) + rc * 0.07 * sharp * (1.0 - smoothstep(0.0, 0.05, under)));
    col = mix(col, rock, smoothstep(rockY - b - 0.003, rockY + b + 0.003, q.y) * 0.95);
    // \u77F3\u810A\u524D\u9762\u4E00\u5757\u5757\u5706\u77F3\u5934\uFF1A\u6309\u692D\u7403\u7684\u6CD5\u7EBF\u7B97\u53D7\u5149\uFF08\u5149\u4ECE\u6C34\u9762\u5F80\u4E0B\u6253\uFF09\uFF0C\u9876\u4E0A\u4EAE\u3001\u5E95\u4E0B\u6697\uFF0C\u8FB9\u7F18\u88AB\u566A\u58F0\u5543\u5F97\u4E0D\u5706
    float rw = 0.17, rcx = floor(q.x / rw);
    for (float k = -1.0; k <= 1.0; k++) {
      float n = rcx + k, h = h1(n * 4.1 + 2.0);
      if (h > 0.7) continue;
      float rx = 0.06 + 0.05 * h1(n + 9.0), ry = rx * (0.55 + 0.3 * h1(n * 2.7));
      vec2 c = vec2((n + 0.3 + 0.4 * h1(n * 5.3)) * rw, 0.95);
      vec2 d = (q - c) / vec2(rx, ry);
      float edge = 0.12 * (vnoise(vec2(atan(d.y, d.x) * 2.5, n * 3.0)) - 0.5);
      float e = length(d) + edge, soft = (b + 0.003) / ry;
      float cover = smoothstep(1.0 + soft, 1.0 - soft, e);
      if (cover <= 0.0) continue;
      vec3 nrm = normalize(vec3(d * 0.9, sqrt(max(1.0 - dot(d, d), 0.04))));
      float lit = max(dot(nrm, normalize(vec3(-0.35, -1.0, 0.7))), 0.0);
      vec3 stone = (deep * 1.8 + lightC * 0.08) * (0.4 + 1.0 * lit) * tex + lightC * pow(lit, 6.0) * 0.16 * sharp;
      col = mix(col, stone, cover * 0.97);
    }
  }
  // \u6C34\u8349\uFF08\u300C\u697C\u7FA4\u300D\uFF09\u548C\u957F\u5728\u4E0A\u9762\u7684\u4E00\u4E32\u4E32\u8367\u5149\u7C92\u5B50\uFF08\u300C\u5149\u6591\u300D\uFF09\uFF1A\u6C34\u8349\u4ECE\u6839\u5230\u68A2\u4F20\u4E00\u9053\u6CE2\uFF0C\u6446\u5F97\u5FEB\u4E00\u70B9\uFF0C
  // \u300C\u821E\u6F6E\u8E0F\u62CD\u300D\u65F6\u518D\u8DDF\u62CD\u5F80\u4E00\u8FB9\u63A8\uFF08weedKick\uFF09\uFF1B\u7C92\u5B50\u8DDF\u7740\u8349\u8EAB\u4E00\u8D77\u6446\uFF0C\u8D8A\u5F80\u68A2\u8D8A\u4EAE\uFF0C\u5404\u81EA\u4E00\u95EA\u4E00\u95EA
  bool weeds = sceneryOn(SCN_BUILDINGS), glow = sceneryOn(SCN_LIGHTS);
  if (weeds || glow) {
    float cw = 0.06, cx = floor(q.x / cw);
    for (float k = -1.0; k <= 1.0; k++) {
      float n = cx + k, h = h1(n * 1.7 + 5.0);
      if (h > 0.45) continue;
      float top = 0.55 + 0.25 * h1(n + 2.0), base = 0.92, len = base - top;
      float sway = t * (3.6 + 1.8 * h) + h * 20.0, bend = 0.07 * (0.7 + 0.6 * h);
      if (weeds) {
        float s = clamp((base - q.y) / len, 0.0, 1.0);
        float x0 = (n + 0.5) * cw + sin(q.y * 11.0 + sway) * 0.025 * uWeedIdle * s + weedKick(s) * bend * s * s;
        float w = 0.003 * (1.0 - s * 0.6), we = sqrt(w * w + b * b), dx = q.x - x0;
        float a = (w / we) * exp(-dx * dx / (we * we)) * smoothstep(top - b, top + 0.02 + b, q.y) * step(q.y, base) * 0.5;
        col = mix(col, mix(deep, vec3(0.02, 0.08, 0.05), 0.6), a);
      }
      // \u8349\u68A2\u4E0A\u9762\u79BB\u7C92\u5B50\u592A\u8FDC\uFF08\u96FE\u7684\u9884\u6E32\u67D3\u8981\u7B97\u4E0A\u5149\u6655\u7CCA\u5F00\u7684\u8303\u56F4\uFF09\u5C31\u8DF3\u8FC7
      if (!glow || q.y < top - 0.05 - b * 3.0) continue;
      float s = clamp((base - q.y) / len, 0.0, 1.0);
      float N = 11.0, gap = len / (N - 1.0);
      // \u96FE\u540E\u9762\uFF08\u9884\u6E32\u67D3\uFF09\u7C92\u5B50\u7CCA\u6210\u4E00\u6761\uFF1A\u6309\u8FDE\u7EED\u7684\u4E00\u6761\u5149\u5E26\u7B97\uFF0C\u4E0D\u4E00\u9897\u9897\u7B97\uFF0C\u514D\u5F97\u5149\u6655\u6BD4\u95F4\u8DDD\u5BBD\u65F6\u6F0F\u7B97\u51FA\u65AD\u5C42
      if (b > 0.012) {
        float xs = (n + 0.5) * cw + sin(q.y * 11.0 + sway) * 0.025 * uWeedIdle * s + weedKick(s) * bend * s * s, dx = q.x - xs;
        float fj = s * (N - 1.0), ja = floor(fj);
        vec3 pc = mix(mix(pick(h1(n * 3.0 + ja)), pick(h1(n * 3.0 + ja + 1.0)), fj - ja), vec3(1.0), 0.25);
        float line = 0.0;
        for (float r3 = 0.0; r3 < 3.0; r3++) {
          float r = r3 < 0.5 ? 0.0018 + 0.0018 * s : r3 < 1.5 ? (0.0018 + 0.0018 * s) * 4.0 : 0.009 + 0.008 * s;
          float wgt = r3 < 0.5 ? 1.6 : r3 < 1.5 ? 0.25 : 0.4;
          // \u4E00\u9897 glowPt \u6CBF\u7AD6\u76F4\u65B9\u5411\u79EF\u5206\uFF0C\u518D\u9664\u4EE5\u95F4\u8DDD\uFF1A\u4E00\u4E32\u7C92\u5B50\u7684\u5E73\u5747\u4EAE\u5EA6
          float s2 = r * r + b * b;
          line += wgt * (r * r / s2) * exp(-dx * dx / s2 * 1.6) * sqrt(3.1416 * s2 / 1.6) / gap;
        }
        float e = 0.009 + b;
        line *= smoothstep(top - e, top + e, q.y) * smoothstep(base + e, base - e, q.y);
        col += pc * line * 0.7 * (0.35 + 0.65 * s) * uNeon;
        continue;
      }
      // \u6E05\u6670\u7684\u753B\u9762\u4E00\u9897\u9897\u7B97\uFF1A\u6700\u8FD1\u7684\u4E00\u9897\u524D\u540E\u5404\u4E24\u9897\uFF08\u5149\u6655\u6BD4\u95F4\u8DDD\u5BBD\uFF09\uFF0C\u8D85\u51FA\u4E24\u5934\u7684\u4E0D\u7B97\uFF0C\u4E0D\u4F1A\u628A\u68A2\u4E0A\u90A3\u9897\u7B97\u4E24\u904D
      float j0 = floor(s * (N - 1.0) + 0.5);
      for (float dj = -2.0; dj <= 2.0; dj++) {
        float j = j0 + dj, sj = j / (N - 1.0);
        if (j < 0.0 || j > N - 1.0) continue;
        float py = base - sj * len;
        vec2 pp = vec2((n + 0.5) * cw + sin(py * 11.0 + sway) * 0.025 * uWeedIdle * sj + weedKick(sj) * bend * sj * sj, py);
        float tw = 0.45 + 0.55 * pow(0.5 + 0.5 * sin(t * (2.5 + h1(n * 9.0 + j) * 3.0) + j * 1.7 + h * 30.0), 2.0);
        float pr = 0.0018 + 0.0018 * sj;
        vec3 pc = mix(pick(h1(n * 3.0 + j)), vec3(1.0), 0.25);
        // \u6BCF\u9897\u5E26\u4E00\u5708\u5927\u5149\u6655\uFF1A\u96FE\u540E\u9762\u7EC6\u5C0F\u7684\u4EAE\u70B9\u7CCA\u6CA1\u4E86\uFF0C\u5149\u6655\u7CCA\u5F00\u8FD8\u662F\u4E00\u56E2\u56E2\u5F69\u8272\u7684\u5149
        vec2 d = q - pp;
        col += pc * (glowPt(d, pr, b, 0.0) * 1.6 + glowPt(d, pr * 4.0, b, 0.0) * 0.25 + glowPt(d, 0.009 + 0.008 * sj, b, 0.0) * 0.4) * tw * (0.35 + 0.65 * sj) * uNeon;
      }
    }
  }
  col += jellies(q, b);
  col = aqBubbles(col, q, b, mix(lightC, vec3(1.0), 0.4));
  // \u805A\u5149\u706F\uFF1A\u4ECE\u6C34\u9762\u4E0A\u65B9\u6253\u5230\u6B63\u5728\u5199\u7684\u5B57\u4E0A
  col += lightC * spotBeam(q, b) * 0.8;
  return col;
}
`;
export { NEBBIA_AQUA_GLSL };
