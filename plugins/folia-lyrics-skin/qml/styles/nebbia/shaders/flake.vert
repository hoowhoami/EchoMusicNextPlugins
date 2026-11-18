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
layout(location=0) in vec2 aCorner; layout(location=1) in vec4 aA; layout(location=2) in vec4 aB; layout(location=3) in vec2 aC;

layout(location=0) out vec2 vLocal; layout(location=1) out vec2 vHalo; layout(location=2) out vec2 vFu; layout(location=3) flat out vec4 vB; layout(location=4) flat out float vR; layout(location=5) flat out float vSeed;
void nebbiaSourceMain() {
  vec2 c = (aCorner * 2.0 - 1.0) * 2.60;
  float cs = cos(aA.w), sn = sin(aA.w);
  vec2 off = c * aA.z;
  vec2 p = aA.xy + vec2(off.x * cs - off.y * sn, off.x * sn + off.y * cs) + uShift;
  // vLocal：贴图里的坐标（单位是雪花半径，压扁之前）；vHalo：糊光、柔光用的（不压扁）
  vLocal = c / aC; vHalo = c; vB = aB; vR = aA.z;
  // 每片雪自己的随机数（闪光用）：贴上以后转角、种类都不再变
  vSeed = fract(sin(aA.w * 12.9898 + aB.y * 78.233) * 43758.5453);
  // 雾的预渲染纹理第 0 行是屏幕底部
  vFu = vec2(p.x / uView.x, 1.0 - p.y / uView.y);
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}
void main() { nebbiaSourceMain(); if (nativeOutput.w < .5 && uNativeTarget.z > .5) gl_Position.y = -gl_Position.y; gl_Position = nativeCorrection * gl_Position; }
