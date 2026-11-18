#version 440
// Folia 8006b40f · AGPL-3.0-only · flake
layout(std140,binding=0) uniform NativeFrame { vec4 nativeViewport; vec4 nativeOutput; mat4 nativeCorrection; };
layout(std140,binding=1) uniform NebbiaUniforms {
  vec2 uView;
  vec2 uShift;
  bool uLit;
  vec2 uGrid;
  vec4 uNativeTarget;
};
layout(binding=2) uniform sampler2D uAtlas;
layout(binding=3) uniform sampler2D uGlow;
layout(binding=4) uniform sampler2D uBehind;
vec4 nebbiaFragCoord() { return vec4(gl_FragCoord.x, mix(uNativeTarget.y-gl_FragCoord.y,gl_FragCoord.y,max(nativeOutput.w,uNativeTarget.z)),gl_FragCoord.zw); }


  
layout(location=0) in vec2 vLocal; layout(location=1) in vec2 vHalo; layout(location=2) in vec2 vFu; layout(location=3) flat in vec4 vB; layout(location=4) flat in float vR; layout(location=5) flat in float vSeed;
layout(location=0) out vec4 o;

// glow：雾的光晕层；fu：屏幕 uv（y 向上）；n：冰面斜面（屏幕方向，y 向上）；seed：这块冰面的随机数（定它的折射角）
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

vec4 tile(float col, vec2 t, float bias) { return texture(uAtlas, (vec2(col, vB.y) + t) / uGrid, bias); }
void main() {
  float p = vB.w;
  vec2 t = 0.5 + vLocal * 0.420;
  // 相邻两个融化阶段交叉；还没飘到焦点上的取更糊的一级。不放在分支里取（分支里取样的 mipmap 级别不可靠），格子外面乘 0
  float st = floor(vB.x), fr = vB.x - st, bias = 2.0 * (1.0 - p);
  vec2 tc = clamp(t, 0.0, 1.0);
  vec4 c = mix(tile(st, tc, bias), tile(min(st + 1.0, uGrid.x - 1.0), tc, bias), fr);
  c *= vB.z * float(t == tc);
  // 身后的光：颜色带大半（还看得出是白雪），亮度跟着走：暗处压得很暗，灯下亮过雾
  vec3 L = uLit ? texture(uGlow, vFu).rgb : vec3(0.42);
  float lum = dot(L, vec3(0.3, 0.59, 0.11));
  vec3 hue = clamp(mix(vec3(1.0), L / max(lum, 0.02), 0.8), 0.0, 2.2);
  vec3 lit = hue * clamp(0.22 + 2.5 * lum, 0.0, 1.4);
  vec3 rgb = c.rgb * lit;
  // 逆光（身后有亮光）：雪像冰一样被照透。冰晶的厚薄（贴图的不透明度）当成表面的起伏，斜的地方把身后的窗外往里折（取主画面那层稍糊的窗外，uBehind），
  // 透过来的光比四周亮一点；薄的边、斜面上再亮一道。暗处照旧是白雪。只在对上焦（贴上玻璃）后，化得越多越弱（化成水交给水珠去折射）
  float back = float(uLit) * smoothstep(0.08, 0.45, lum) * p * (1.0 - 0.7 * vB.x / 15.0);
  float a0 = c.a / max(vB.z, 0.001);
  vec2 n = vec2(dFdx(a0), dFdy(a0)) * vR;
  float edge = clamp(length(n) * 0.5, 0.0, 1.0);
  // 色散（比真冰放大了不少，要看得出）：红、绿、蓝折得不一样多，棱上再沿斜的方向分开一点，透过来的窗外在边上错出彩边、颜色加浓；
  vec2 bend = n * vR * 0.7 / uView, split = n / max(length(n), 0.001) * vR * 0.35 * edge / uView;
  vec3 through = vec3(texture(uBehind, vFu - bend * 0.8 - split).r, texture(uBehind, vFu - bend).g, texture(uBehind, vFu - bend * 1.25 + split).b);
  vec3 gray = vec3(dot(through, vec3(0.3333)));
  through = gray + (through - gray) * (1.0 + 1.5 * edge);
  vec3 ice = (through * (1.1 + 0.3 * edge) + min(L, vec3(1.2)) * edge * 0.3) * c.a + c.rgb * lit * 0.15;
  rgb = mix(rgb, ice, back * 0.85);
  float d = length(vHalo);
  // 还没飘到焦点上：外面套一圈糊的
  float ha = 0.35 * (1.0 - p) * max(0.0, 1.0 - d / (1.6 - 0.6 * p));
  rgb = vec3(0.92, 0.95, 1.0) * lit * ha + rgb * (1.0 - ha);
  float a = ha + c.a * (1.0 - ha);
  // 靠近亮光：外面散一圈很淡的柔光（只加颜色，比雪花大不了多少），化得越多越淡；没有光照（透明）时不加
  float soft = float(uLit) * smoothstep(0.12, 0.6, lum) * 0.45 * exp(-d * d * 2.4) * vB.z * (1.0 - vB.x / 15.0);
  // 火彩（色散）：贴图按格子分，每格一块冰面、有自己固定的折射角，只有冰棱上（斜面）的格子会出；颜色由斜面和光的方向定（nebbiaFireGlsl.ts），
  // 只加光，亮度按身后光的亮度给，不跟灯的颜色走；约四成格子有朝得对的冰面
  vec2 g = tc * 9.0, gc = floor(g), gf = fract(g) - 0.5;
  float h = fract(sin(dot(gc, vec2(12.9898, 78.233)) + vSeed * 91.7) * 43758.5453);
  vec3 fire = fixedFire(uGlow, vFu, n, fract(h * 7.31)) * step(h, 0.4);
  float glint = back * exp(-dot(gf, gf) * 18.0) * edge * (0.6 + 2.0 * lum) * vB.z;
  o = vec4(rgb + min(L, vec3(1.2)) * soft + fire * glint * 2.2, a);
}