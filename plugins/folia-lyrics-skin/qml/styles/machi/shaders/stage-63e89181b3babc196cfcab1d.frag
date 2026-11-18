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
float bloomStrength;
float bloomRadius;
float bloomFactors[5];
vec3 bloomTintColors[5];
vec4 nativeTarget;
};
layout(binding=2) uniform sampler2D blurTexture1;
layout(binding=3) uniform sampler2D blurTexture2;
layout(binding=4) uniform sampler2D blurTexture3;
layout(binding=5) uniform sampler2D blurTexture4;
layout(binding=6) uniform sampler2D blurTexture5;
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
    
    
    
    
    
    
    
    
    
    float lerpBloomFactor( const in float factor ) {
     float mirrorFactor = 1.2 - factor;
     return mix( factor, mirrorFactor, bloomRadius );
    }
    void main() {
     vec3 bloom = 3.0 * bloomStrength * (
      lerpBloomFactor( bloomFactors[ 0 ] ) * bloomTintColors[ 0 ] * texture( blurTexture1, vUv ).rgb +
      lerpBloomFactor( bloomFactors[ 1 ] ) * bloomTintColors[ 1 ] * texture( blurTexture2, vUv ).rgb +
      lerpBloomFactor( bloomFactors[ 2 ] ) * bloomTintColors[ 2 ] * texture( blurTexture3, vUv ).rgb +
      lerpBloomFactor( bloomFactors[ 3 ] ) * bloomTintColors[ 3 ] * texture( blurTexture4, vUv ).rgb +
      lerpBloomFactor( bloomFactors[ 4 ] ) * bloomTintColors[ 4 ] * texture( blurTexture5, vUv ).rgb
     );
     float bloomAlpha = max( bloom.r, max( bloom.g, bloom.b ) );
     pc_fragColor = vec4( bloom, bloomAlpha );
    }
