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
float uLength;
float uSpeed;
float uDensity;
vec4 uGlints[3];
vec4 uRoofs[4];
float uRoofY[4];
float uGroundY;
float uHalf;
vec3 uColor;
vec3 uGlintColor;
float uOpacity;
vec4 nativeTarget;
};


 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 







layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;






layout(location=6) in vec4 aSeed;
layout(location=5) in float aEnd;
layout(location=0) out float vAlpha;
layout(location=1) out float vGlint;




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
    vec2 base = aSeed.xy;
    float ground = kGround(base);
    float fall = 9.50 - ground;
    float speed = uSpeed * (0.85 + 0.3 * aSeed.w);
    float y = 9.50 - mod(uTime * speed + aSeed.z * fall, fall);
    float drop = 9.50 - y;
    vec3 head = vec3(base.x + uWind.x * drop, y, base.y + uWind.y * drop);
    vec3 dir = normalize(vec3(-uWind.x, 1.0, -uWind.y));
    vec3 position = head + dir * uLength * aEnd * (0.75 + 0.5 * aSeed.w);
    position.y = max(position.y, ground);
    float inside = step(abs(head.x), uHalf + 0.1) * step(abs(head.z), uHalf + 0.1);
    float visible = step(aSeed.w, uDensity);
    vAlpha = (1.0 - aEnd * 0.85) * inside * visible * smoothstep(0.0, 0.6, y - ground);
    vGlint = 0.0;
    for (int i = 0; i < 3; i++) {
        vec3 d = head - uGlints[i].xyz;
        vGlint += exp(-dot(d, d) / (uGlints[i].w * uGlints[i].w));
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

void main(){nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}
