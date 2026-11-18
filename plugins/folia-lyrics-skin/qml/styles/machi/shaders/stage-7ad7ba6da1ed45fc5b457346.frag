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
vec2 uSourceTexel;
float uDepthRange;
float uFocus;
float uFocusBand;
float uFocusFalloff;
float uCocRadius;
float uTiltRadius;
vec3 uStreakTint;
float uStreakStrength;
vec4 nativeTarget;
};
layout(binding=2) uniform sampler2D tDiffuse;
layout(binding=3) uniform sampler2D tDepth;
layout(binding=4) uniform sampler2D tBloom;
layout(binding=5) uniform sampler2D tStreak;
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






float machiCoc(float depth01, vec2 uv) {
    float offset = depth01 * uDepthRange - uFocus;
    float coc = smoothstep(uFocusBand, uFocusBand + uFocusFalloff, abs(offset)) * uCocRadius * (offset < 0.0 ? -1.0 : 1.0);
    float tilt = smoothstep(0.2, 0.55, abs(uv.y - 0.5)) * uTiltRadius;
    return abs(coc) >= tilt ? coc : tilt;
}




vec3 machiBloomed(vec2 uv) { return texture(tDiffuse, uv).rgb + texture(tBloom, uv).rgb; }
vec3 machiGlowed(vec2 uv) { return machiBloomed(uv) + texture(tStreak, uv).rgb * uStreakTint * uStreakStrength; }
float widest(float a, float b) { return abs(a) >= abs(b) ? a : b; }
void main() {
    vec2 o = uSourceTexel * 0.5;
    vec2 p0 = vUv + vec2(-o.x, -o.y);
    vec2 p1 = vUv + vec2(o.x, -o.y);
    vec2 p2 = vUv + vec2(-o.x, o.y);
    vec2 p3 = vUv + vec2(o.x, o.y);
    vec3 color = (machiGlowed(p0) + machiGlowed(p1) + machiGlowed(p2) + machiGlowed(p3)) * 0.25;
    float coc = widest(
        widest(machiCoc(texture(tDepth, p0).x, p0), machiCoc(texture(tDepth, p1).x, p1)),
        widest(machiCoc(texture(tDepth, p2).x, p2), machiCoc(texture(tDepth, p3).x, p3))
    );
    pc_fragColor = vec4(color, coc);
}
