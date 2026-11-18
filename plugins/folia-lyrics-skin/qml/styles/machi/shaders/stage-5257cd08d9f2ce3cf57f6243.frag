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
vec4 nativeFragCoord(){return vec4(gl_FragCoord.x,mix(nativeTarget.y-gl_FragCoord.y,gl_FragCoord.y,max(nativeOutput.w,nativeTarget.z)),gl_FragCoord.zw); }
layout(location=0) out vec4 pc_fragColor;

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 



vec4 LinearTransferOETF( in vec4 value ) {
 return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
 return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
 return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 linearToOutputTexel( vec4 value ) {
 return LinearTransferOETF( vec4( value.rgb * mat3( 1.0000,-0.0000,-0.0000,-0.0000,1.0000,0.0000,0.0000,0.0000,1.0000 ), value.a ) );
}
float luminance( const in vec3 rgb ) {
 const vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
 return dot( weights, rgb );
}


























layout(location=0) in vec2 vUv;
float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), u.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float pFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
        value += amplitude * pNoise(p);
        p = p * 2.03 + vec2(17.1, 9.2);
        amplitude *= 0.5;
    }
    return value;
}
float depthAt(vec2 uv) { return texture(tDepth, uv).x * uDepthRange; }
void main() {
    vec4 color = texture(tDiffuse, vUv);
    float raw = texture(tDepth, vUv).x;
    float d = raw * uDepthRange;
    bool sky = raw > 0.9999;
    vec2 inkStep = uTexel * uInkScale;
    float l = depthAt(vUv - vec2(inkStep.x, 0.0));
    float r = depthAt(vUv + vec2(inkStep.x, 0.0));
    float u = depthAt(vUv + vec2(0.0, inkStep.y));
    float b = depthAt(vUv - vec2(0.0, inkStep.y));
    float lu = depthAt(vUv + vec2(-inkStep.x, inkStep.y));
    float rb = depthAt(vUv + vec2(inkStep.x, -inkStep.y));
    float ru = depthAt(vUv + inkStep);
    float lb = depthAt(vUv - inkStep);
    float laplace = abs(l + r - 2.0 * d) + abs(u + b - 2.0 * d) + 0.5 * (abs(lu + rb - 2.0 * d) + abs(ru + lb - 2.0 * d));
    float line = smoothstep(uThreshold, uThreshold * 2.6, laplace) * (sky ? 0.0 : 1.0);
    vec3 rgb = mix(color.rgb, uInk, line * uInkStrength);
    if (sky) {
        vec2 p = vec2(vUv.x * uAspect, vUv.y) * 2.4 + vec2(uTime * 0.012, 0.0);
        float cloud = smoothstep(mix(0.62, 0.38, uCloudAmount), 0.85, pFbm(p)) * smoothstep(0.0, 0.55, vUv.y) * (0.35 + 0.65 * uCloudAmount);
        float wisp = smoothstep(0.55, 0.9, pFbm(p * 2.3 + vec2(uTime * 0.02, 3.1))) * (0.5 + 0.5 * uCloudAmount);
        rgb += uCloudColor * (cloud * 0.55 + wisp * 0.18);
        rgb += uLightningColor * uLightning * (0.18 + 1.1 * cloud + 0.4 * wisp);
        rgb = mix(rgb, uMistColor, uHaze * 0.7);
    } else {
        vec4 ndc = vec4(vUv * 2.0 - 1.0, raw * 2.0 - 1.0, 1.0);
        vec4 view = uProjInv * ndc;
        view /= view.w;
        vec3 world = (uCamWorld * view).xyz;
        float height = max(world.y, 0.0);
        float drift = pFbm(world.xz * 0.32 + uWind * uTime) * 0.65 + pFbm(world.xz * 0.9 - uWind * uTime * 1.7) * 0.35;
        float density = uMistAmount * exp(-height / uMistHeight) * (0.35 + 0.9 * drift);
        vec2 da = world.xz - uGlowA.xz;
        vec2 db = world.xz - uGlowB.xz;
        vec3 lit = uMistColor
            + uGlowColorA * exp(-dot(da, da) / (uGlowA.w * uGlowA.w)) * exp(-height / 2.2)
            + uGlowColorB * exp(-dot(db, db) / (uGlowB.w * uGlowB.w)) * exp(-height / 3.0);
        rgb = mix(rgb, lit, clamp(density, 0.0, 0.85));
        rgb = mix(rgb, uMistColor, uHaze * (0.3 + 0.7 * smoothstep(uHazeRange.x, uHazeRange.y, d)));
        rgb += rgb * uLightning * 0.18;
    }
    pc_fragColor = vec4(rgb, color.a);
}
