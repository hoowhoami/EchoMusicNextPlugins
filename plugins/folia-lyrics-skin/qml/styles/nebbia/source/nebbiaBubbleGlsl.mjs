// Folia 8006b40f6e7b26198ac964e9e1255c3ca23bd935 · AGPL-3.0-only · src/components/visualizer/nebbia/nebbiaBubbleGlsl.ts
const NEBBIA_BUBBLE_GLSL =
  /* glsl */
  `
uniform float uBubbles;
// \u8DDF\u62CD\u5192\u7684\u6BCF\u6392\uFF1Ax\u3001\u5192\u51FA\u7684\u65F6\u523B\u3001\u5927\u5C0F\uFF080 \u662F\u7A7A\u683C\uFF09\u3001\u79CD\u5B50
uniform vec4 uBurst[12];
uniform int uBurstN;
// 1 \u65F6\u821E\u6F6E\u8E0F\u62CD\u7684\u6C14\u6CE1\u4E00\u9879\u5F00\u7740\uFF1A\u4E0D\u5192\u968F\u673A\u7684\u5927\u6CE1
uniform float uBeatRows;
// \u4E00\u9897\u6CE1\uFF08d \u662F\u5230\u6CE1\u5FC3\u7684\u504F\u79FB\uFF0Cy \u671D\u4E0B\uFF09\uFF1Argb \u52A0\u4E0A\u53BB\u7684\u5149\uFF0Ca \u6CE1\u91CC\u538B\u6697\u591A\u5C11
vec4 aqBubble(vec2 d, float rad, float b) {
  float l = length(d), aa = max(b, 0.0005);
  float keep = rad * rad / (rad * rad + b * b * 4.0);
  float disc = smoothstep(rad + aa, rad - aa, l);
  float up = 0.5 + 0.5 * clamp(-d.y / max(l, 1e-5), -1.0, 1.0);
  float fres = pow(clamp(l / rad, 0.0, 1.0), 5.0) * disc * (0.35 + 0.65 * up);
  float spec = glowPt(d + vec2(rad * 0.36, rad * 0.4), rad * 0.15, b, 0.0);
  float spec2 = glowPt(d - vec2(rad * 0.32, rad * 0.42), rad * 0.1, b, 0.0) * 0.3;
  float caus = glowPt(d - vec2(0.0, rad * 0.5), rad * 0.32, b, 0.0) * 0.14;
  vec4 big = vec4(vec3(fres * 0.9 * keep + spec * 1.3 + spec2 + caus), disc * 0.14 * keep);
  vec4 tiny = vec4(vec3(glowPt(d, rad * 0.6, b, 0.0) * 1.3 + spec * 1.2), 0.0);
  return mix(tiny, big, smoothstep(0.0018, 0.0034, rad));
}
vec3 aqBubbles(vec3 col, vec2 q, float b, vec3 bc) {
  float t = uTime;
  float drift = sceneryOn(SCN_RAIN_SLANT) ? 0.1 : 0.0;
  float fade = smoothstep(0.93, 0.8, q.y);
  float qx = q.x + (0.92 - q.y) * drift;
  // \u7EC6\u6CE1\uFF1A\u6BCF\u80A1\u4ECE\u4E00\u4E2A\u6CC9\u773C\u5192\u51FA\uFF0C\u8D8A\u5F80\u4E0A\u8D8A\u6563\u3001\u6CE1\u8D8A\u5927\u4E00\u70B9
  if (sceneryOn(SCN_RAIN)) {
    float cw = 0.055, cx = floor(qx / cw);
    for (float k = -1.0; k <= 1.0; k++) {
      float n = cx + k;
      if (h1(n * 2.3 + 1.0) > uBubbles * 0.9) continue;
      float src = (n + 0.5) * cw + (h1(n + 3.0) - 0.5) * cw * 0.5;
      float sp = 0.14 + 0.1 * h1(n + 7.0), ch = 0.014 + 0.01 * h1(n + 5.0);
      float rise = clamp((0.92 - q.y) / 0.9, 0.0, 1.0);
      float sw = 0.003 + 0.016 * rise, swe = sqrt(sw * sw + b * b);
      float sx = qx - src;
      col += bc * exp(-sx * sx / (swe * swe)) * 0.03 * fade * (sw / swe + 0.3);
      if (b > 0.02) continue;
      float v = q.y + t * sp, iy = floor(v / ch);
      for (float j = -1.0; j <= 1.0; j++) {
        float m = iy + j, hb = h1(m * 1.31 + n * 17.0);
        if (hb > 0.85) continue;
        // \u6BCF\u9897\u5728\u683C\u5B50\u91CC\u4E0A\u4E0B\u9519\u4E00\u70B9\u3001\u5DE6\u53F3\u6563\u5F00\uFF0C\u4E0D\u6392\u6210\u4E00\u4E32\u73E0\u5B50
        float y = (m + 0.2 + 0.6 * h1(m * 2.7 + n)) * ch - t * sp;
        float up = clamp((0.92 - y) / 0.9, 0.0, 1.0);
        float rad = 0.0012 + 0.003 * hb * hb * hb + 0.0012 * up;
        vec2 c = vec2(src + sin(m * 2.1 + t * 6.0) * (0.0015 + 0.006 * up) + (h1(m + n) - 0.5) * (0.006 + 0.03 * up), y);
        vec4 bub = aqBubble(vec2(qx, q.y) - c, rad, b);
        col = col * (1.0 - bub.a * fade) + bc * bub.rgb * fade * (0.6 + 0.4 * h1(m * 5.0 + n));
      }
    }
  }
  // \u5927\u6CE1\uFF1A\u5C11\u3001\u6162\uFF0C\u4E0A\u4E0B\u7565\u6241\uFF0C\u8FB9\u7F18\u4E00\u8FB9\u6D6E\u4E00\u8FB9\u8F7B\u8F7B\u6643
  if (sceneryOn(SCN_CARS) && uBeatRows < 0.5) {
    float bw = 0.13, bx = floor(qx / bw);
    for (float k = -1.0; k <= 1.0; k++) {
      float n = bx + k;
      float sp = 0.07 + 0.04 * h1(n + 41.0), ch = 0.42;
      float iy = floor((q.y + t * sp) / ch);
      for (float j = -1.0; j <= 0.0; j++) {
        float m = iy + j;
        if (h1(m * 3.7 + n * 11.0) > min(1.1 * uBubbles, 0.85)) continue;
        float rad = 0.008 + 0.016 * pow(h1(m + n * 5.0), 1.5);
        vec2 c = vec2((n + 0.2 + 0.6 * h1(m * 7.0 + n)) * bw + sin(t * 1.3 + m) * 0.02, (m + 0.5) * ch - t * sp);
        vec2 d = vec2(qx, q.y) - c;
        // \u6309\u65B9\u5411\u7F29\u653E\u504F\u79FB\uFF0C\u8F6E\u5ED3\u5C31\u6643\uFF1Asin(3\u03B8 + \u03C6)\u3001sin(2\u03B8 - \u03C6') \u7528\u65B9\u5411\u7684\u4F59\u5F26\u6B63\u5F26\u5C55\u5F00\uFF0C\u4E0D\u7528 atan
        vec2 u = d / max(length(d), 1e-5);
        float c2 = u.x * u.x - u.y * u.y, s2 = 2.0 * u.x * u.y;
        float c3 = u.x * (4.0 * u.x * u.x - 3.0), s3 = u.y * (3.0 - 4.0 * u.y * u.y);
        float f1 = t * 4.0 + m, f2 = t * 3.0;
        float shape = 1.0 + 0.03 * (s3 * cos(f1) + c3 * sin(f1)) + 0.02 * (s2 * cos(f2) - c2 * sin(f2));
        vec4 bub = aqBubble(vec2(d.x, d.y * 1.18) / shape, rad, b);
        col = col * (1.0 - bub.a * fade) + bc * (bub.rgb + glowPt(d, rad * 1.4, b, 0.0) * 0.04) * fade;
      }
    }
  }
  // \u8DDF\u62CD\u5192\u7684\u4E00\u6392\u6392\u5927\u6CE1\uFF1A\u4E00\u6392\u516D\u9897\uFF0C\u5192\u51FA\u65F6\u4ECE\u5C0F\u6DA8\u5230\u5168\u5927\uFF0C\u5148\u51B2\u4E00\u4E0B\u518D\u6162\u6162\u6D6E\uFF1B\u79BB\u8FD9\u4E00\u6392\u8FDC\u7684\u50CF\u7D20\u76F4\u63A5\u8DF3\u8FC7\u3002
  // \u6BCF\u9897\u5E26\u4E00\u5708\u5149\u6655\uFF0C\u96FE\u540E\u9762\u7CCA\u5F00\u4E5F\u662F\u4E00\u6392\u4EAE\u70B9\uFF0C\u770B\u5F97\u51FA\u8DDF\u62CD
  for (int i = 0; i < 12; i++) {
    if (i >= uBurstN) break;
    vec4 B = uBurst[i];
    float a = t - B.y;
    if (B.z <= 0.0 || a < 0.0) continue;
    float y0 = 0.9 - 0.2 * a - 0.28 * (1.0 - exp(-a * 3.0));
    if (abs(q.y - y0) > 0.08 + b * 3.0) continue;
    float grow = smoothstep(0.0, 0.15, a) * (0.55 + 0.45 * B.z);
    for (float k = 0.0; k < 6.0; k++) {
      float h = h1(B.w + k * 7.3), h2 = h1(B.w * 1.7 + k * 3.1);
      float rad = (0.008 + 0.012 * h) * grow;
      vec2 c = vec2(B.x + (k - 2.5) * 0.05 + (h2 - 0.5) * 0.02 + sin(a * 3.0 + k * 1.7) * 0.004 * a, y0 + (h - 0.5) * 0.04);
      vec2 d = vec2(qx, q.y) - c;
      vec4 bub = aqBubble(vec2(d.x, d.y * 1.18), rad, b);
      col = col * (1.0 - bub.a * fade) + bc * (bub.rgb + glowPt(d, rad * 2.0 + 0.004, b, 0.0) * 0.22) * fade;
    }
  }
  return col;
}
`;
export { NEBBIA_BUBBLE_GLSL };
