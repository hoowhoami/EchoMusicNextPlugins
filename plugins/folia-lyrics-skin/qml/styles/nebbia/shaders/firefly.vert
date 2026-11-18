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
layout(location=0) in vec2 aCorner; layout(location=1) in vec4 aA; layout(location=2) in vec4 aB; layout(location=3) in vec4 aC;
 
layout(location=0) out vec2 vLocal; layout(location=1) out vec2 vFu; layout(location=2) flat out vec4 vP; layout(location=3) flat out vec4 vGlow;
void nebbiaSourceMain() {
  // 方块要盖住糊开的虫子和柔光：柔光到方块边上要淡到看不出（低于 1/255），不然灯下看得见方框
  float ext = max(2.6, 4.1 * uHalo);
  vec2 c = (aCorner * 2.0 - 1.0) * ext;
  // 按身子朝向转：vLocal 是虫子自己的坐标（x 朝头，单位是半径）
  float cs = cos(aB.z), sn = sin(aB.z);
  vec2 off = c * aA.z;
  vec2 p = aA.xy + vec2(off.x * cs - off.y * sn, off.x * sn + off.y * cs);
  vLocal = c; vP = vec4(aA.w, aB.x, aB.y, aB.w); vGlow = aC;
  // 雾的预渲染纹理第 0 行是屏幕底部
  vFu = vec2(p.x / uView.x, 1.0 - p.y / uView.y);
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}
void main() { nebbiaSourceMain(); if (nativeOutput.w < .5 && uNativeTarget.z > .5) gl_Position.y = -gl_Position.y; gl_Position = nativeCorrection * gl_Position; }
