#version 440
// Folia 8006b40f · AGPL-3.0-only · mask
layout(std140,binding=0) uniform NativeFrame { vec4 nativeViewport; vec4 nativeOutput; mat4 nativeCorrection; };
layout(std140,binding=1) uniform NebbiaUniforms {
  vec2 uView;
  vec4 uNativeTarget;
};

vec4 nebbiaFragCoord() { return vec4(gl_FragCoord.x, mix(uNativeTarget.y-gl_FragCoord.y,gl_FragCoord.y,max(nativeOutput.w,uNativeTarget.z)),gl_FragCoord.zw); }

layout(location=0) in vec2 vP; layout(location=1) flat in vec4 vSeg; layout(location=2) flat in vec2 vParam;
layout(location=0) out vec4 o;
// 半宽 r 的线离像素中心 d 时的覆盖度（1 像素线性过渡，接近画布的抗锯齿）
float cover(float r, float d) { return clamp(r + 0.5 - d, 0.0, 1.0); }
// 画布的颜色是 8 位：先量化再乘覆盖度
float nebbiaLevel(float x) { return floor(x * 255.0 + 0.5) / 255.0; }
void main() {
  vec2 a = vSeg.xy, ba = vSeg.zw - a, pa = vP - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  float d = length(pa - ba * h), w = vParam.x * 0.5, v = vParam.y;
  // 三层按画布的 lighten 一层层叠：每层都比下面亮，覆盖度 a 的像素是 m + a × (这层 − m)
  float m = nebbiaLevel(v * 0.38) * cover(w * 1.3, d);
  m += cover(w, d) * (nebbiaLevel(v * 0.72) - m);
  m += cover(w * 0.62, d) * (nebbiaLevel(v) - m);
  o = vec4(m, 0.0, 0.0, 1.0);
}