#version 440
// Folia 8006b40f · AGPL-3.0-only · aquarium-snow-fog
layout(std140,binding=0) uniform NativeFrame { vec4 nativeViewport; vec4 nativeOutput; mat4 nativeCorrection; };
layout(std140,binding=1) uniform NebbiaUniforms {
  vec2 uRes;
  vec2 uSceneShift;
  float uTime;
  float uBus;
  float uNeon;
  vec3 uSky0;
  vec3 uSky1;
  vec3 uLa;
  vec3 uLb;
  vec3 uLc;
  vec2 uSpotSrc;
  vec2 uSpotSrc2;
  vec2 uSpotTgt;
  float uSpotR;
  float uSpotI;
  int uScenery;
  bvec3 uBldOn;
  vec3 uBldGeo[3];
  vec4 uJelly[24];
  vec4 uJellyC[24];
  int uJellyN;
  float uBubbles;
  vec4 uBurst[12];
  int uBurstN;
  float uBeatRows;
  vec4 uSway;
  float uWeedIdle;
  float uFogB;
  vec4 uNativeTarget;
};
layout(binding=2) uniform sampler2D uBld0;
layout(binding=3) uniform sampler2D uBld1;
layout(binding=4) uniform sampler2D uBld2;
layout(binding=5) uniform sampler2D uBld3;
layout(binding=6) uniform sampler2D uBld4;
layout(binding=7) uniform sampler2D uBld5;
layout(location=0) in vec2 aPos; layout(location=0) out vec2 vUv;
void nebbiaSourceMain() { vUv = aPos * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(aPos, 0.0, 1.0); }
void main() { nebbiaSourceMain(); if (nativeOutput.w < .5 && uNativeTarget.z > .5) gl_Position.y = -gl_Position.y; gl_Position = nativeCorrection * gl_Position; }
