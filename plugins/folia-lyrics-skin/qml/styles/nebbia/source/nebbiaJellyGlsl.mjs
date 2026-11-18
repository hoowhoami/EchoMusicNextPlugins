// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaJellyGlsl.ts
const NEBBIA_JELLY_GLSL =
  /* glsl */
  `
// \u6BCF\u53EA\uFF1Axy \u4F4D\u7F6E\uFF08scene \u5750\u6807\uFF09\u3001z \u4F1E\u76D6\u534A\u5F84\u3001w \u6536\u7F29\uFF080 \u8212\u5F20\uFF0C1 \u6536\u5F97\u6700\u7D27\uFF09\uFF1B\u989C\u8272 rgb\uFF08\u5DF2\u6309\u8FDC\u8FD1\u8C03\u6697\uFF09\uFF0Ca \u89E6\u624B\u6CE2\u7684\u76F8\u4F4D
uniform vec4 uJelly[24], uJellyC[24];
uniform int uJellyN;
vec3 jellies(vec2 q, float b) {
  vec3 c = vec3(0.0);
  float sharp = 1.0 - clamp(b * 25.0, 0.0, 1.0);
  bool fine = b < 0.004;
  for (int i = 0; i < 24; i++) {
    if (i >= uJellyN) break;
    vec4 J = uJelly[i];
    float size = J.z, pulse = J.w;
    vec2 d = q - J.xy;
    if (abs(d.x) > size * 2.2 + b * 3.0 || d.y < -size * 1.6 - b * 3.0 || d.y > size * 5.0 + b * 3.0) continue;
    vec3 jc = uJellyC[i].rgb * uNeon;
    float ph = uJellyC[i].a;
    // \u4F1E\u76D6\uFF1A\u6536\u7F29\u65F6\u53D8\u7A84\u53D8\u9AD8\uFF1B\u4E0B\u6CBF\u5F80\u4E24\u8FB9\u5782\u3001\u5E26\u4E00\u5708\u6CE2\u7EB9
    float wx = size * (1.0 - 0.18 * pulse), hy = size * 0.72 * (1.0 + 0.14 * pulse);
    vec2 p = vec2(d.x / wx, d.y / hy);
    float soft = b / size + 0.04;
    // \u4E0B\u6CBF\u90A3\u4E00\u6BB5 r \u6DA8\u5F97\u5FEB\uFF08\xF70.3\uFF09\uFF0C\u6A21\u7CCA\u65F6\u6309 soft \u653E\u7F13\uFF0C\u4E0D\u7136\u96FE\u540E\u9762\u4F1E\u88D9\u4E0B\u6CBF\u8FD8\u662F\u4E00\u9053\u786C\u8FB9\uFF1B\u6CE2\u7EB9\u4E5F\u8DDF\u7740\u7CCA\u6389
    float edge = 0.05 + 0.3 * p.x * p.x + 0.04 * cos(p.x * 14.0 + ph * 0.5) * sharp;
    float r = max(length(vec2(p.x, min(p.y, 0.0))), (p.y - edge) / (0.3 + soft) + 1.0);
    float fill = smoothstep(1.0 + soft, 1.0 - soft, r);
    float rr = (r - 0.9) / (0.09 + soft);
    float rim = exp(-rr * rr);
    vec2 pc = p + vec2(0.0, 0.4);
    float lobe = length(pc) - 0.26 - 0.07 * cos(4.0 * atan(pc.y, pc.x));
    float gon = exp(-lobe * lobe / (0.004 + soft * soft)) * (0.4 + 0.6 * sharp);
    c += jc * (fill * (0.16 + 0.55 * rim + 0.45 * gon) + glowPt(d + vec2(0.0, size * 0.25), size * 0.9, b, 0.0) * 0.18);
    if (d.y <= 0.0) continue;
    // \u4F1E\u4E0B\u4E00\u9053\u62D6\u5C3E\u5149\uFF1A\u6A21\u7CCA\u65F6\u9760\u5B83\u8BA4\u51FA\u662F\u6C34\u6BCD
    float we = sqrt(pow(wx * 0.55, 2.0) + b * b);
    c += jc * exp(-d.x * d.x / (we * we)) * pow(max(1.0 - d.y / (size * 3.5), 0.0), 2.0) * 0.12 * smoothstep(0.0, size * 0.3, d.y);
    if (!fine) continue;
    // \u89E6\u624B\uFF1A\u4F1E\u88D9\u4E0B\u6CBF\u5782\u4E0B\u51E0\u6839\u7EC6\u4E1D\uFF0C\u987A\u7740\u5F80\u4E0B\u4F20\u7684\u6CE2\u98D8
    float w = 0.0012 + size * 0.012;
    we = sqrt(w * w + b * b);
    for (float k = 0.0; k < 6.0; k++) {
      float len = size * (2.6 + 1.6 * h1(float(i) * 13.0 + k));
      float s = d.y / len;
      if (s > 1.05) continue;
      float tx = (k / 5.0 - 0.5) * 1.5 * wx * (1.0 - 0.35 * min(s, 1.0));
      float dx = d.x - tx - sin(d.y / size * 2.6 - ph * 0.9 + k * 1.3) * size * 0.28 * min(s, 1.0);
      c += jc * (w / we) * exp(-dx * dx / (we * we)) * pow(max(1.0 - s, 0.0), 1.5) * smoothstep(hy * 0.1, hy * 0.35, d.y) * 0.8;
    }
    // \u4E2D\u95F4\u7684\u53E3\u8155\uFF1A\u7C97\u4E00\u70B9\u3001\u77ED\u4E00\u70B9\u7684\u4E00\u6761\u98D8\u5E26
    float s = d.y / (size * 1.7);
    if (s < 1.0) {
      float wa = size * 0.14 * (1.0 - s * 0.6), wae = sqrt(wa * wa + b * b);
      float dx = d.x - sin(d.y / size * 3.5 - ph + 1.0) * size * 0.12 * s;
      c += jc * (wa / wae) * exp(-dx * dx / (wae * wae)) * (1.0 - s) * 0.35 * smoothstep(0.0, 0.01, d.y);
    }
  }
  return c;
}
`;
export { NEBBIA_JELLY_GLSL };
