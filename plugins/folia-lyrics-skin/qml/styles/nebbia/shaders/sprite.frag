#version 440
// Folia 8006b40f · AGPL-3.0-only · sprite
layout(std140,binding=0) uniform NativeFrame { vec4 nativeViewport; vec4 nativeOutput; mat4 nativeCorrection; };
layout(std140,binding=1) uniform NebbiaUniforms {
  vec2 uView;
  vec4 uNativeTarget;
};
layout(binding=2) uniform sampler2D uSprite;
vec4 nebbiaFragCoord() { return vec4(gl_FragCoord.x, mix(uNativeTarget.y-gl_FragCoord.y,gl_FragCoord.y,max(nativeOutput.w,uNativeTarget.z)),gl_FragCoord.zw); }


layout(location=0) in vec2 vUV; layout(location=1) in float vSize; layout(location=2) in float vAlpha; layout(location=0) out vec4 o;
void main() {
  vec4 c = texture(uSprite, vUV);
  c.a *= vAlpha;
  o = vec4(c.rg * c.a, vSize * c.a, c.a);
}