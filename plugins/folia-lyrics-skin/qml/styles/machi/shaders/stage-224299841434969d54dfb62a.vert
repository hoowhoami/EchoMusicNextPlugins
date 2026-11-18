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
vec3 uColor;
float uTime;
float uLevel;
vec4 nativeTarget;
};


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 







layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
layout(location=0) out vec2 vUv;
layout(location=1) out vec3 vNormalView;
layout(location=2) out vec3 vViewDir;
layout(location=3) out vec3 vWorld;
layout(location=5) in float aGain;
layout(location=4) out float vGain;
void nativeSourceMain() {
    vUv = uv;
    vGain = aGain;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 view = viewMatrix * world;
    vNormalView = normalize(normalMatrix * normal);
    vViewDir = vec3(0.0, 0.0, 1.0);
    gl_Position = projectionMatrix * view;
}

void main(){nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}
