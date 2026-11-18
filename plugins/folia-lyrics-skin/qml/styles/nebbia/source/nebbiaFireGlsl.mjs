// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaFireGlsl.ts
const NEBBIA_FIRE_GLSL =
  /* glsl */
  `
// glow\uFF1A\u96FE\u7684\u5149\u6655\u5C42\uFF1Bfu\uFF1A\u5C4F\u5E55 uv\uFF08y \u5411\u4E0A\uFF09\uFF1Bn\uFF1A\u51B0\u9762\u659C\u9762\uFF08\u5C4F\u5E55\u65B9\u5411\uFF0Cy \u5411\u4E0A\uFF09\uFF1Bseed\uFF1A\u8FD9\u5757\u51B0\u9762\u7684\u968F\u673A\u6570\uFF08\u5B9A\u5B83\u7684\u6298\u5C04\u89D2\uFF09
vec3 fixedFire(sampler2D glow, vec2 fu, vec2 n, float seed) {
  const vec3 W = vec3(0.3, 0.59, 0.11);
  vec2 e = vec2(0.025, 0.0);
  vec2 lg = vec2(dot(textureLod(glow, fu + e.xy, 0.0).rgb - textureLod(glow, fu - e.xy, 0.0).rgb, W),
                 dot(textureLod(glow, fu + e.yx, 0.0).rgb - textureLod(glow, fu - e.yx, 0.0).rgb, W));
  float ll = length(lg), nl = length(n);
  if (ll < 1e-4 || nl < 1e-4) return vec3(0.0);
  float x = (dot(n / nl, lg / ll) - mix(0.6, 0.95, seed)) / 0.05;
  if (abs(x) >= 1.0) return vec3(0.0);
  float h = (x * 0.5 + 0.5) * 0.75;
  vec3 spec = clamp(abs(fract(h + vec3(0.0, 0.667, 0.333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  return spec * (1.0 - x * x) * smoothstep(0.002, 0.03, ll);
}
`;
export { NEBBIA_FIRE_GLSL };
