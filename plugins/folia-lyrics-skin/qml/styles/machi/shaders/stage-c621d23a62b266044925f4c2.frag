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
float uDofMix;
vec2 uBlend;
float uAberration;
float uVignette;
float uGrain;
float uFade;
float uStars;
float uTime;
float uAspect;
float uDepthRange;
float uFocus;
float uFocusBand;
float uFocusFalloff;
float uCocRadius;
float uTiltRadius;
vec3 uStreakTint;
float uStreakStrength;
float toneMappingExposure;
vec4 nativeTarget;
};
layout(binding=2) uniform sampler2D tDiffuse;
layout(binding=3) uniform sampler2D tBokeh;
layout(binding=4) uniform sampler2D tDepth;
layout(binding=5) uniform sampler2D tCoverage;
layout(binding=6) uniform sampler2D tBloom;
layout(binding=7) uniform sampler2D tStreak;
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

vec3 LinearToneMapping( vec3 color ) {
 return clamp( toneMappingExposure * color, 0.0, 1.0 );
}
vec3 ReinhardToneMapping( vec3 color ) {
 color *= toneMappingExposure;
 return clamp( color / ( vec3( 1.0 ) + color ), 0.0, 1.0 );
}
vec3 CineonToneMapping( vec3 color ) {
 color *= toneMappingExposure;
 color = max( vec3( 0.0 ), color - 0.004 );
 return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
 vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
 vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
 return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
 const mat3 ACESInputMat = mat3(
  vec3( 0.59719, 0.07600, 0.02840 ),
  vec3( 0.35458, 0.90834, 0.13383 ),
  vec3( 0.04823, 0.01566, 0.83777 )
 );
 const mat3 ACESOutputMat = mat3(
  vec3( 1.60475, -0.10208, -0.00327 ),
  vec3( -0.53108, 1.10813, -0.07276 ),
  vec3( -0.07367, -0.00605, 1.07602 )
 );
 color *= toneMappingExposure / 0.6;
 color = ACESInputMat * color;
 color = RRTAndODTFit( color );
 color = ACESOutputMat * color;
 return clamp( color, 0.0, 1.0 );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
 vec3( 1.6605, - 0.1246, - 0.0182 ),
 vec3( - 0.5876, 1.1329, - 0.1006 ),
 vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
 vec3( 0.6274, 0.0691, 0.0164 ),
 vec3( 0.3293, 0.9195, 0.0880 ),
 vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
 vec3 x2 = x * x;
 vec3 x4 = x2 * x2;
 return + 15.5 * x4 * x2
  - 40.14 * x4 * x
  + 31.96 * x4
  - 6.868 * x2 * x
  + 0.4298 * x2
  + 0.1191 * x
  - 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
 const mat3 AgXInsetMatrix = mat3(
  vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
  vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
  vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
 );
 const mat3 AgXOutsetMatrix = mat3(
  vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
  vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
  vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
 );
 const float AgxMinEv = - 12.47393;
 const float AgxMaxEv = 4.026069;
 color *= toneMappingExposure;
 color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
 color = AgXInsetMatrix * color;
 color = max( color, 1e-10 );
 color = log2( color );
 color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
 color = clamp( color, 0.0, 1.0 );
 color = agxDefaultContrastApprox( color );
 color = AgXOutsetMatrix * color;
 color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
 color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
 color = clamp( color, 0.0, 1.0 );
 return color;
}
vec3 NeutralToneMapping( vec3 color ) {
 const float StartCompression = 0.8 - 0.04;
 const float Desaturation = 0.15;
 color *= toneMappingExposure;
 float x = min( color.r, min( color.g, color.b ) );
 float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
 color -= offset;
 float peak = max( color.r, max( color.g, color.b ) );
 if ( peak < StartCompression ) return color;
 float d = 1. - StartCompression;
 float newPeak = 1. - d * d / ( peak + d - StartCompression );
 color *= newPeak / peak;
 float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
 return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }
float gHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
    vec2 centered = vUv - 0.5;
    float edge = dot(centered, centered);
    vec2 shift = centered * edge * uAberration;
    vec3 sharp = vec3(
        machiGlowed(vUv + shift).r,
        machiGlowed(vUv).g,
        machiGlowed(vUv - shift).b
    );
    vec4 bokeh = texture(tBokeh, vUv);
    float depth01 = texture(tDepth, vUv).x;
    float own = smoothstep(uBlend.x, uBlend.y, abs(machiCoc(depth01, vUv)));
    float amount = (own + bokeh.a - own * bokeh.a) * uDofMix;
    vec3 color = mix(sharp, bokeh.rgb, clamp(amount, 0.0, 1.0));
    if (uStars > 0.001 && depth01 > 0.9999) {
        vec2 sp = vec2(vUv.x * uAspect, vUv.y) * 140.0;
        vec2 cell = floor(sp);
        float starSeed = gHash(cell);
        vec2 starAt = vec2(gHash(cell + 3.7), gHash(cell + 9.1)) * 0.6 + 0.2;
        float star = step(0.984, starSeed) * smoothstep(0.24, 0.0, length(fract(sp) - starAt))
            * (0.55 + 0.45 * sin(uTime * (0.8 + starSeed * 3.0) + starSeed * 60.0));
        color += vec3(0.85, 0.9, 1.0) * star * uStars * 1.3 * smoothstep(0.1, 0.55, vUv.y);
    }
    vec2 v = centered * vec2(uAspect, 1.0);
    float vignette = smoothstep(1.15, 0.35, length(v) * 1.15);
    color *= mix(1.0, vignette, uVignette);
    float grain = gHash(vUv * vec2(1733.0, 977.0) + fract(uTime * 7.31)) - 0.5;
    color += grain * uGrain * (0.25 + dot(color, vec3(0.3333)));
    pc_fragColor = vec4(max(color, 0.0) * uFade, 1.0);
    pc_fragColor.rgb = NeutralToneMapping(pc_fragColor.rgb);
    pc_fragColor = sRGBTransferOETF(pc_fragColor);
}
