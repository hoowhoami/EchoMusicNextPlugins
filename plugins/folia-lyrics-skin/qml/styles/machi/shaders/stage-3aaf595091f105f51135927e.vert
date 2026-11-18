#version 440
// Folia/Three pinned source math; see package notices.

layout(std140,binding=0) uniform NativeFrame {vec4 nativeViewport;vec4 nativeOutput;mat4 nativeCorrection;};
layout(std140,binding=1) uniform NativeUniforms {
mat4 modelMatrix;
mat4 modelViewMatrix;
mat4 projectionMatrix;
mat4 viewMatrix;
mat3 normalMatrix;
vec3 cameraPosition;
bool isOrthographic;
float uDofMix;
vec2 uBlend;
float uAberration;
float uVignette;
float uGrain;
float uFade;
float uStars;
float uTime;
float uAspect;
float uDepthRange;
float uFocus;
float uFocusBand;
float uFocusFalloff;
float uCocRadius;
float uTiltRadius;
vec3 uStreakTint;
float uStreakStrength;
float toneMappingExposure;
vec4 nativeTarget;
};
layout(binding=2) uniform sampler2D tDiffuse;
layout(binding=3) uniform sampler2D tBokeh;
layout(binding=4) uniform sampler2D tDepth;
layout(binding=5) uniform sampler2D tCoverage;
layout(binding=6) uniform sampler2D tBloom;
layout(binding=7) uniform sampler2D tStreak;

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 







layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
layout(location=0) out vec2 vUv;
void nativeSourceMain() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

void main(){nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}
