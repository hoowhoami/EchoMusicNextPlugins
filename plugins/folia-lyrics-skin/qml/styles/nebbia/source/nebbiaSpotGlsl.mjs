// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaSpotGlsl.ts
const NEBBIA_SPOT_GLSL =
  /* glsl */
  `
// \u805A\u5149\u706F\u5149\u67F1\uFF1A\u4ECE\u697C\u5E95\u7684\u5149\u6E90\u5C04\u5411\u73BB\u7483\u4E0A\u7684\u5149\u6591\uFF0C\u8D8A\u8FD1\u8D8A\u5BBD\u8D8A\u4EAE\uFF1Bb \u662F\u6A21\u7CCA\u534A\u5F84\uFF08\u96FE\u540E\u9762\u770B\u5149\u67F1\u66F4\u6563\uFF09
float beamFrom(vec2 src, vec2 q, float b) {
  vec2 d = uSpotTgt - src;
  float L = length(d);
  if (uSpotI <= 0.0 || L < 1e-3) return 0.0;
  d /= L;
  vec2 rel = q - src;
  float along = dot(rel, d);
  // \u5230\u300C\u5149\u6E90\u2014\u5149\u6591\u300D\u8FD9\u6761\u7EBF\u6BB5\u7684\u8DDD\u79BB\uFF0C\u4E0D\u662F\u5230\u65E0\u9650\u957F\u4E2D\u8F74\u7EBF\u7684\uFF1A\u672B\u7AEF\u662F\u4EE5\u5149\u6591\u4E3A\u5706\u5FC3\u7684\u5706\u5934\u3002
  // \u539F\u6765\u6309\u4E2D\u8F74\u7EBF\u7B97\u3001\u518D\u6CBF\u5149\u67F1\u65B9\u5411\u5E73\u5207\uFF0C\u672B\u7AEF\u662F\u4E00\u9053\u548C\u5149\u67F1\u4E00\u6837\u5BBD\u7684\u5E73\u53E3\uFF1B\u4E24\u76CF\u706F\u4ECE\u4E0D\u540C\u89D2\u5EA6\u6253\u5230\u540C\u4E00\u5904\uFF0C
  // \u4E24\u4E2A\u5E73\u53E3\u7684\u89D2\u9732\u5728\u5149\u6591\u4E24\u4FA7\uFF0C\u770B\u7740\u50CF\u4E2A X
  float perp = length(rel - d * clamp(along, 0.0, L));
  float k = clamp(along / L, 0.0, 1.0);
  float w = mix(0.004, uSpotR * 0.9, k) + b;
  float body = exp(-perp * perp / (w * w)) * smoothstep(-0.01, 0.04, along) * (0.25 + 0.75 * k * k);
  // \u5149\u6E90\u672C\u8EAB\uFF1A\u697C\u5E95\u4E00\u9897\u5F88\u4EAE\u7684\u706F
  float lamp = exp(-dot(rel, rel) / (0.00004 + b * b * 0.25)) * 2.5 / (1.0 + b * 50.0);
  return (body * 0.7 + lamp) * uSpotI;
}
// \u5DE6\u53F3\u4E24\u76CF\uFF0C\u5149\u6E90\u5DE6\u53F3\u5BF9\u79F0\uFF0C\u6253\u5230\u540C\u4E00\u4E2A\u5B57\u4E0A
float spotBeam(vec2 q, float b) { return beamFrom(uSpotSrc, q, b) + beamFrom(uSpotSrc2, q, b); }
`;
export { NEBBIA_SPOT_GLSL };
