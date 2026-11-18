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
vec2 uTexel;
float uInkScale;
float uDepthRange;
float uThreshold;
vec3 uInk;
float uInkStrength;
mat4 uProjInv;
mat4 uCamWorld;
float uTime;
vec3 uMistColor;
float uMistAmount;
float uMistHeight;
vec2 uWind;
vec4 uGlowA;
vec3 uGlowColorA;
vec4 uGlowB;
vec3 uGlowColorB;
vec3 uCloudColor;
float uCloudAmount;
float uHaze;
vec2 uHazeRange;
float uLightning;
vec3 uLightningColor;
float uAspect;
vec4 nativeTarget;
};
layout(binding=2) uniform sampler2D tDiffuse;
layout(binding=3) uniform sampler2D tDepth;

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 







layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
layout(location=0) out vec2 vUv;
void nativeSourceMain() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

void main(){nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}
