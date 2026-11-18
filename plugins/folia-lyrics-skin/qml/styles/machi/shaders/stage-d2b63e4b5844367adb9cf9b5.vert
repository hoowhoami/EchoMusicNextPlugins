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
float uRate;
float uDensity;
vec4 uRoofs[4];
float uRoofY[4];
float uGroundY;
float uHalf;
vec3 uColor;
vec4 nativeTarget;
};


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 







layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;



layout(location=5) in vec4 aSeed;
layout(location=0) out vec2 vUv;
layout(location=1) out float vLife;




float kGround(vec2 p) {
    float ground = uGroundY;
    for (int i = 0; i < 4; i++) {
        vec4 r = uRoofs[i];
        if (p.x > r.x && p.x < r.z && p.y > r.y && p.y < r.w) ground = max(ground, uRoofY[i]);
    }
    return ground;
}
float kHash1(float n) { return fract(sin(n) * 43758.5453123); }
void nativeSourceMain() {
    float cycle = uTime * uRate * (0.8 + 0.4 * aSeed.w) + aSeed.z;
    float index = floor(cycle);
    float life = fract(cycle);
    vec2 p = vec2(kHash1(index * 12.9898 + aSeed.x * 78.233), kHash1(index * 39.346 + aSeed.y * 11.135)) * 2.0 - 1.0;
    p *= uHalf - 0.05;
    float ground = kGround(p);
    float visible = step(aSeed.w, uDensity);
    float size = (0.06 + 0.24 * life) * visible;
    vUv = uv;
    vLife = life;
    vec3 local = vec3(position.x * size, 0.0, position.y * size);
    vec4 world = modelMatrix * vec4(local + vec3(p.x, ground + 0.012, p.y), 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
}

void main(){nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}
