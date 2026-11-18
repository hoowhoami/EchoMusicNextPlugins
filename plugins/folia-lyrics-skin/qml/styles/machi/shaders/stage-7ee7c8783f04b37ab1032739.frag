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
float uGlitch;
float uAspect;
vec4 nativeTarget;
};
layout(binding=2) uniform sampler2D uMap;
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
float hHash(float n) { return fract(sin(n * 91.7) * 43758.5453); }
void nativeSourceFragment() {
    vec2 uv = vUv;
    float band = floor(uv.y * 26.0);
    float tear = hHash(band + floor(uTime * 24.0) * 3.1);
    uv.x += (tear - 0.5) * 0.06 * uGlitch * step(0.55, tear);
    float text = texture(uMap, uv).r;
    float scan = 0.82 + 0.18 * sin(vUv.y * 190.0 - uTime * 8.0);
    float sweepAt = (fract(vUv.y - uTime * 0.22) - 0.5) * 7.0;
    float sweep = exp(-sweepAt * sweepAt) * 0.35;
    vec2 edge = min(vUv, 1.0 - vUv) * vec2(uAspect, 1.0);
    float frame = 1.0 - smoothstep(0.006, 0.016, min(edge.x, edge.y));
    float corner = step(min(edge.x, edge.y), 0.035) * step(max(edge.x, edge.y), 0.12);
    float fill = 0.07 + 0.06 * (1.0 - vUv.y);
    float flicker = 0.9 + 0.1 * hHash(floor(uTime * 14.0));
    float intensity = (text * 1.35 + frame * 0.5 + corner * 0.6 + fill) * scan * flicker + sweep * (0.15 + text * 0.4);
    pc_fragColor = vec4(uColor * intensity * uLevel * (1.0 - 0.4 * uGlitch), 1.0);
pc_fragColor = linearToOutputTexel( pc_fragColor );
}

void main(){nativeSourceFragment();pc_fragColor.rgb*=pc_fragColor.a;}
