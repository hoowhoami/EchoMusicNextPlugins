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
vec2 uWind;
vec3 uColor;
vec4 nativeTarget;
};


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 







layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;


layout(location=6) in vec4 aSource;
layout(location=5) in vec2 aSeed;
layout(location=0) out vec2 vUv;
layout(location=1) out float vFade;
layout(location=2) out float vSeed;
void nativeSourceMain() {
    float life = fract(uTime / aSource.w + aSeed.x);
    float rise = life * 1.6;
    vec3 center = aSource.xyz + vec3(uWind.x * life * 1.8 + sin(life * 6.0 + aSeed.x * 20.0) * 0.08, rise, uWind.y * life * 1.8);
    float size = (0.25 + life * 0.9) * aSeed.y;
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 world = center + (right * position.x + up * position.y) * size;
    vUv = uv;
    vFade = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.55, 1.0, life));
    vSeed = aSeed.x * 31.0;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}

void main(){nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}
