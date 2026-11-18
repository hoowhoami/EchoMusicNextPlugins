#version 440
// Folia 8006b40f · AGPL-3.0-only · mask
layout(std140,binding=0) uniform NativeFrame { vec4 nativeViewport; vec4 nativeOutput; mat4 nativeCorrection; };
layout(std140,binding=1) uniform NebbiaUniforms {
  vec2 uView;
  vec4 uNativeTarget;
};

layout(location=0) in vec2 aCorner; layout(location=1) in vec4 aSeg; layout(location=2) in vec2 aParam;

layout(location=0) out vec2 vP; layout(location=1) flat out vec4 vSeg; layout(location=2) flat out vec2 vParam;
void nebbiaSourceMain() {
  vec2 a = aSeg.xy, b = aSeg.zw, d = b - a;
  float l = length(d);
  vec2 t = l > 1e-5 ? d / l : vec2(1.0, 0.0), n = vec2(-t.y, t.x);
  // 最宽那层的半宽再留 1 像素抗锯齿
  float R = aParam.x * 0.65 + 1.0;
  vec2 p = (a + b) * 0.5 + t * aCorner.x * (l * 0.5 + R) + n * aCorner.y * R;
  vP = p; vSeg = aSeg; vParam = aParam;
  gl_Position = vec4(p / uView * 2.0 - 1.0, 0.0, 1.0);
}
void main() { nebbiaSourceMain(); if (nativeOutput.w < .5 && uNativeTarget.z > .5) gl_Position.y = -gl_Position.y; gl_Position = nativeCorrection * gl_Position; }
