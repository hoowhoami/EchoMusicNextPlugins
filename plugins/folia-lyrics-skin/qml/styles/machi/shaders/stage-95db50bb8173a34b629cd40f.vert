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
float uTime;
float uCount;
vec3 uColor;
float uLevel;
vec4 nativeTarget;
};


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 







 layout(location=5) in mat4 instanceMatrix;
layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
layout(location=9) in float aIndex;


layout(location=0) out float vOn;
void nativeSourceMain() {
    float phase = fract((aIndex - uTime * 6.0) / 4.0);
    vOn = step(0.5, phase);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}

void main(){nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}
