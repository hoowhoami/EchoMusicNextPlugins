#version 440
// Folia 8006b40f · AGPL-3.0-only · firefly
layout(std140,binding=0) uniform NativeFrame { vec4 nativeViewport; vec4 nativeOutput; mat4 nativeCorrection; };
layout(std140,binding=1) uniform NebbiaUniforms {
  vec2 uView;
  float uHalo;
  bool uLit;
  vec4 uNativeTarget;
};
layout(binding=2) uniform sampler2D uGlow;
vec4 nebbiaFragCoord() { return vec4(gl_FragCoord.x, mix(uNativeTarget.y-gl_FragCoord.y,gl_FragCoord.y,max(nativeOutput.w,uNativeTarget.z)),gl_FragCoord.zw); }


// uHalo 两边都用：和顶点着色器的精度要一样
 
layout(location=0) in vec2 vLocal; layout(location=1) in vec2 vFu; layout(location=2) flat in vec4 vP; layout(location=3) flat in vec4 vGlow;
layout(location=0) out vec4 o;
// 一个椭圆（中心 c、半轴 ab、转 a 弧度）的覆盖，边缘宽 e
float blob(vec2 q, vec2 c, vec2 ab, float a, float e) {
  q -= c;
  float cs = cos(a), sn = sin(a);
  q = vec2(q.x * cs + q.y * sn, -q.x * sn + q.y * cs) / ab;
  return 1.0 - smoothstep(1.0 - e, 1.0 + e, length(q));
}
void main() {
  float p = vP.y, flap = vP.w;
  vec2 q = vLocal;
  // 没对上焦：边缘糊开
  float e = 0.18 + 0.9 * (1.0 - p);
  // 身子：头、胸、长一点的肚子
  float body = max(max(blob(q, vec2(0.62, 0.0), vec2(0.17, 0.15), 0.0, e),
                       blob(q, vec2(0.3, 0.0), vec2(0.22, 0.2), 0.0, e)),
                   blob(q, vec2(-0.25, 0.0), vec2(0.48, 0.19), 0.0, e));
  // 翅膀：收拢时盖在背上往后，张开时往两边摆；扇得快，看着是一片半透明的糊影
  float wa = 0.12 + 1.2 * flap, we = e + 0.3 * flap;
  float wing = max(blob(q, vec2(-0.15 + 0.2 * flap, 0.08 + 0.45 * flap), vec2(0.62, 0.17), wa, we),
                   blob(q, vec2(-0.15 + 0.2 * flap, -0.08 - 0.45 * flap), vec2(0.62, 0.17), -wa, we));
  // 身后的光：颜色带大半，亮度跟着走：暗处压得很暗，灯下亮过雾
  vec3 L = uLit ? texture(uGlow, vFu).rgb : vec3(0.42);
  float lum = dot(L, vec3(0.3, 0.59, 0.11));
  vec3 hue = clamp(mix(vec3(1.0), L / max(lum, 0.02), 0.8), 0.0, 2.2);
  vec3 lit = hue * clamp(0.22 + 2.5 * lum, 0.0, 1.4);
  // 身子淡淡的白；翅膀更薄、透光，叠在身子上面
  float ab = body * 0.5, aw = wing * (0.3 - 0.1 * flap);
  float ca = (aw + ab * (1.0 - aw)) * vP.x;
  vec3 rgb = (vec3(0.95, 0.97, 1.0) * aw + vec3(0.86, 0.88, 0.92) * ab * (1.0 - aw)) * lit * vP.x;
  float d = length(q);
  // 还没飘到焦点上：外面套一圈糊的
  float ha = 0.35 * (1.0 - p) * max(0.0, 1.0 - d / (1.6 - 0.6 * p)) * vP.x;
  rgb = vec3(0.92, 0.95, 1.0) * lit * ha + rgb * (1.0 - ha);
  float a = ha + ca * (1.0 - ha);
  // 靠近亮光：散一圈很淡的柔光（只加颜色）；没有光照（透明）时不加
  // 身后已经很亮（聚光灯正照着）时柔光收掉大半：再往亮处加光只会叠成一片白
  float soft = float(uLit) * smoothstep(0.12, 0.6, lum) * (1.0 - 0.75 * smoothstep(0.6, 1.2, lum)) * 0.45 * exp(-d * d * 0.3 / (uHalo * uHalo)) * vP.z;
  // 尾巴的光：肚子尖上一小团，外面一小圈光晕，只加颜色（自己发光，不挡后面）；没对上焦时糊大
  float dt = length(q - vec2(-0.55, 0.0)), gr = 0.45 + 0.35 * (1.0 - p);
  float lamp = (1.0 - smoothstep(0.0, gr, dt)) + 0.8 * exp(-dt * dt * 0.7);
  // 中心偏白一点（亮到发白），外圈是灯光色
  vec3 tint = mix(vGlow.yzw, vec3(1.0), 0.35 * (1.0 - smoothstep(0.0, gr, dt)));
  vec3 glow = tint * lamp * vGlow.x * vP.x * mix(0.5, 1.0, p);
  o = vec4(rgb + min(L, vec3(1.2)) * soft + glow, a);
}