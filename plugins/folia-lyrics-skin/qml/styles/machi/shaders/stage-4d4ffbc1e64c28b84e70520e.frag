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
float uMaxCoc;
float uLevelScale;
float uTaps;
vec4 nativeTarget;
};
layout(binding=2) uniform sampler2D tSource;
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
const mat2 GOLDEN_TURN = mat2(-0.73736888, 0.67549029, -0.67549029, -0.73736888);
const float MARGIN = 1.2;
void main() {
    vec4 center = texture(tSource, vUv);
    float centerCoc = center.a / uLevelScale;
    vec4 far = vec4(0.0);
    vec4 near = vec4(0.0);
    vec2 direction = vec2(1.0, 0.0);
    for (int i = 0; i < 48; i++) {
        if (float(i) >= uTaps) break;
        float radius = sqrt((float(i) + 0.5) / uTaps) * uMaxCoc;
        vec4 tap = texture(tSource, vUv + direction * radius * uTexel);
        direction = GOLDEN_TURN * direction;
        float tapCoc = tap.a / uLevelScale;
        float farCoc = max(min(centerCoc, tapCoc), 0.0);
        float farWeight = clamp((farCoc - radius + MARGIN) / MARGIN, 0.0, 1.0);
        float nearWeight = clamp((-tapCoc - radius + MARGIN) / MARGIN, 0.0, 1.0) * step(1.0, -tapCoc);
        far += vec4(tap.rgb, 1.0) * farWeight;
        near += vec4(tap.rgb, 1.0) * nearWeight;
    }
    vec3 farColor = far.a > 0.0 ? far.rgb / far.a : center.rgb;
    vec3 nearColor = near.a > 0.0 ? near.rgb / near.a : center.rgb;
    float nearAlpha = clamp(near.a * 3.14159 / uTaps, 0.0, 1.0);
    pc_fragColor = vec4(mix(farColor, nearColor, nearAlpha), nearAlpha);
}
