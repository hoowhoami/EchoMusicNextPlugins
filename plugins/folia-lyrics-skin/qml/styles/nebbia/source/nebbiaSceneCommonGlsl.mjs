// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSceneCommonGlsl.ts
const NEBBIA_SCENE_COMMON_GLSL =
  /* glsl */
  `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// \u683C\u5B50\u7F16\u53F7 \u2192 0..1 \u7684\u4F2A\u968F\u673A\u6570\uFF08Dave Hoskins \u7684 hash11\uFF09\u3002\u539F\u6765\u7528 fract(sin(n) \xD7 43758)\uFF0Csin \u7684\u7CBE\u5EA6\u5404\u5BB6\u9A71\u52A8\u4E0D\u4E00\u6837\u3001
// \u7F16\u53F7\u968F\u884C\u9A76\u8D8A\u6765\u8D8A\u5927\u65F6\u5E73\u53F0\u95F4\u4F1A\u5BF9\u4E0D\u4E0A\uFF1B\u7EAF\u7B97\u672F\u7684\u5206\u5E03\u4E00\u6837\uFF08\u5747\u5300\u3001\u76F8\u90BB\u7F16\u53F7\u4E0D\u76F8\u5173\uFF09\uFF0C\u53EA\u662F\u6BCF\u683C\u5177\u4F53\u7684\u503C\u6362\u4E86
float h1(float n) { n = fract(n * 0.1031); n *= n + 33.33; n *= n + n; return fract(n); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
vec3 pick(float h) { return h < 0.34 ? uLa : (h < 0.67 ? uLb : uLc); }
// \u9AD8\u65AF\u5149\u70B9\uFF1Ar \u5149\u70B9\u534A\u5F84\uFF0Cb \u6A21\u7CCA\u534A\u5F84\uFF0Cstreak \u6A2A\u5411\u62D6\u5F71\u534A\u957F\uFF1B\u6A21\u7CCA\u8D8A\u5927\u8D8A\u6697\u3001\u8D8A\u6563
float glowPt(vec2 d, float r, float b, float streak) {
  d.x = sign(d.x) * max(abs(d.x) - streak, 0.0);
  float s2 = r * r + b * b;
  return (r * r / s2) * exp(-dot(d, d) / s2 * 1.6);
}
// \u8F6F\u8FB9\u77E9\u5F62\uFF1Asize \u534A\u5BBD\u9AD8\uFF0Csoft \u6A21\u7CCA\u534A\u5F84
float softBox(vec2 d, vec2 size, float soft) {
  vec2 q = abs(d) - size;
  float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float k = min(size.x, size.y);
  return (1.0 - smoothstep(-soft * 0.5, soft, sd)) * k / (k + soft * 0.6);
}
// \u534A\u5F84 r\u3001\u6A21\u7CCA b \u7684 glowPt \u7EB5\u5411\u7167\u5F97\u5230\u591A\u8FDC\uFF1A\u518D\u8FDC\u6307\u6570\u9879 < 1e-6\uFF0C\u4E58\u4E0A\u6700\u5927\u7684\u500D\u6570\uFF08\u9713\u8679 2.8 \xD7 uNeon 2\uFF09\u4E5F\u8FDC\u4E0D\u5230 8 \u4F4D\u8F93\u51FA\u7684\u4E00\u7EA7\u3002
// \u4E0B\u9762\u5404\u7EC4\u706F\u7EB5\u5411\u7167\u4E0D\u5230\u5F53\u524D\u8FD9\u4E00\u884C\u5C31\u6574\u7EC4\u8DF3\u8FC7\uFF0C\u753B\u9762\u4E0D\u53D8
float reach(float r, float b) { return 3.0 * sqrt(r * r + b * b); }
const float HZ = 0.6, ROAD = 0.7;
const float WIND = 0.6;   // \u8F66\u901F 1 \u65F6\uFF0C\u96E8\u76F8\u5BF9\u8F66\u8EAB\u6BCF\u5F80\u4E0B 1 \u5C31\u5F80\u540E 0.6\uFF08\u548C JS \u91CC\u7684 WIND_DRIFT \u5BF9\u5E94\uFF09
const vec3 SODIUM = vec3(1.0, 0.68, 0.32);
// uScenery \u7684\u4F4D\uFF1A\u7A97\u5916\u753B\u54EA\u51E0\u6837\uFF08\u8BBE\u7F6E\u91CC\u7684\u5F00\u5173\uFF0CnebbiaFrameUniforms.ts\uFF09\u3002\u805A\u5149\u706F\u4E0D\u5360\u4F4D\uFF0C\u5173\u6389\u65F6 uSpotI \u4E3A 0
const int SCN_BUILDINGS = 1, SCN_LIGHTS = 2, SCN_CARS = 4, SCN_ROAD = 8, SCN_RAIN = 16, SCN_RAIN_SLANT = 32;
bool sceneryOn(int bit) { return (uScenery & bit) != 0; }
`;
export { NEBBIA_SCENE_COMMON_GLSL };
