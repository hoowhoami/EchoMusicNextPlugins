#version 440
// Folia 8006b40f · AGPL-3.0-only · sprite
layout(std140,binding=0) uniform NativeFrame { vec4 nativeViewport; vec4 nativeOutput; mat4 nativeCorrection; };
layout(std140,binding=1) uniform NebbiaUniforms {
  vec2 uView;
  vec4 uNativeTarget;
};
layout(binding=2) uniform sampler2D uSprite;
layout(location=0) in vec2 aCorner; layout(location=1) in vec4 aRect; layout(location=2) in vec2 aParam;

layout(location=0) out vec2 vUV; layout(location=1) out float vSize; layout(location=2) out float vAlpha;
void nebbiaSourceMain() {
  vec2 p = aRect.xy + (aCorner - 0.5) * aRect.zw;
  vUV = aCorner; vSize = aParam.x; vAlpha = aParam.y;
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, p.y / uView.y * 2.0 - 1.0, 0.0, 1.0);
}
void main() { nebbiaSourceMain(); if (nativeOutput.w < .5 && uNativeTarget.z > .5) gl_Position.y = -gl_Position.y; gl_Position = nativeCorrection * gl_Position; }
