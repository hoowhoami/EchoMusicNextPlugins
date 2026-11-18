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
vec3 uBase;
float uBright;
float uLitGain;
float uUnlitGain;
vec3 uRowBottom;
vec3 uReveal;
float uSoft;
vec2 uCells;
float uTime;
float uGlitch;
float uPeak;
vec3 uSheen;
vec4 uSwellAt;
vec4 uSwellAmp;
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
layout(location=1) in vec3 vViewNormal;
float bHash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
void main() {
    vec2 uv = vUv;
    float tear = bHash(floor(vUv.y * 22.0) + floor(uTime * 24.0) * 7.0);
    uv.x += (tear - 0.5) * 0.08 * uGlitch * step(0.62, tear);
    vec2 cellUv = vUv * uCells;
    vec2 perPixel = fwidth(cellUv);
    float grid = 1.0 - smoothstep(0.3, 0.55, max(perPixel.x, perPixel.y));
    float y = 1.0 - vUv.y;
    float split = 0.0008 + 0.006 * uGlitch;
    vec4 unlit = texture(uMap, vec2(uv.x, 0.5 + uv.y * 0.5));
    vec4 litR = texture(uMap, vec2(uv.x + split, uv.y * 0.5));
    vec4 litG = texture(uMap, vec2(uv.x, uv.y * 0.5));
    vec4 litB = texture(uMap, vec2(uv.x - split, uv.y * 0.5));
    float reveal = y < uRowBottom.x ? uReveal.x : (y < uRowBottom.y ? uReveal.y : uReveal.z);
    float snapped = (floor(vUv.x * uCells.x) + 0.5) / uCells.x;
    float on = 1.0 - smoothstep(reveal - uSoft, reveal + uSoft, mix(vUv.x, snapped, grid));
    float edge = smoothstep(0.0, 0.03, vUv.x) * smoothstep(1.0, 0.97, vUv.x) * smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
    vec3 base = uBase * (0.92 + 0.08 * smoothstep(1.0, 0.0, y)) * (0.8 + 0.2 * edge);
    vec3 color = mix(base, unlit.rgb * uUnlitGain, unlit.a);
    color = mix(color, vec3(litR.r, litG.g, litB.b) * uLitGain, vec3(litR.a, litG.a, litB.a) * on);
    vec2 f = fract(cellUv) - 0.5;
    float gap = smoothstep(0.5, 0.38, abs(f.x)) * smoothstep(0.5, 0.36, abs(f.y));
    vec3 stripe = clamp(1.6 - abs(vec3(fract(cellUv.x) * 3.0) - vec3(0.5, 1.5, 2.5)) * 1.1, 0.0, 1.0) * 2.0;
    vec3 mask = gap * mix(vec3(1.0), stripe, 0.35) / 0.78;
    color *= mix(vec3(1.0), mask, grid * 0.8);
    float roll = fract(vUv.y + uTime * 0.07);
    color *= (1.0 + 0.045 * exp(-pow((roll - 0.5) * 9.0, 2.0))) * (1.0 - 0.3 * uGlitch);
    color += (bHash(dot(floor(cellUv), vec2(1.0, 157.0)) + floor(uTime * 30.0)) - 0.5) * 0.12 * uGlitch;
    color = max(color * uBright, 0.0);
    vec4 swellDx = vec4(vUv.x) - uSwellAt;
    float swell = 1.0 - exp(-dot(uSwellAmp, 0.2 + 0.8 * exp(-swellDx * swellDx * 10.0)));
    color = color * (1.0 + 0.85 * swell) + uBase * 0.5 * swell;
    float peak = max(max(color.r, color.g), color.b);
    color *= min(1.0, (uPeak + 0.55 * swell) / max(peak, 1e-4));
    float fresnel = pow(1.0 - clamp(vViewNormal.z, 0.0, 1.0), 3.0);
    float glare = smoothstep(0.22, 0.0, abs(vUv.x * 0.7 + vUv.y * 0.9 - 1.05));
    color += uSheen * (0.035 + 0.22 * fresnel + 0.05 * glare);
    pc_fragColor = vec4(color, 1.0);
pc_fragColor = linearToOutputTexel( pc_fragColor );
}
