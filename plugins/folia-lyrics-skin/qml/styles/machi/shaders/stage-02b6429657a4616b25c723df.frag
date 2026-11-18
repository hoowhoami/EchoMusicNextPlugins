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
vec2 resolution;
vec4 nativeTarget;
};
layout(binding=2) uniform sampler2D tDiffuse;
layout(binding=3) uniform sampler2D tColor;
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
  layout(location=1) in vec4 vOffset[ 2 ];
  vec4 SMAANeighborhoodBlendingPS( vec2 texcoord, vec4 offset[ 2 ], sampler2D colorTex, sampler2D blendTex ) {
   vec4 a;
   a.xz = texture( blendTex, texcoord ).xz;
   a.y = texture( blendTex, offset[ 1 ].zw ).g;
   a.w = texture( blendTex, offset[ 1 ].xy ).a;
   if ( dot(a, vec4( 1.0, 1.0, 1.0, 1.0 )) < 1e-5 ) {
    return texture( colorTex, texcoord, 0.0 );
   } else {
    vec2 offset;
    offset.x = a.a > a.b ? a.a : -a.b;
    offset.y = a.g > a.r ? -a.g : a.r;
    if ( abs( offset.x ) > abs( offset.y )) {
     offset.y = 0.0;
    } else {
     offset.x = 0.0;
    }
    vec4 C = texture( colorTex, texcoord, 0.0 );
    texcoord += sign( offset ) * resolution;
    vec4 Cop = texture( colorTex, texcoord, 0.0 );
    float s = abs( offset.x ) > abs( offset.y ) ? abs( offset.x ) : abs( offset.y );
    C.xyz = pow(C.xyz, vec3(2.2));
    Cop.xyz = pow(Cop.xyz, vec3(2.2));
    vec4 mixed = mix(C, Cop, s);
    mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));
    return mixed;
   }
  }
  void main() {
   pc_fragColor = SMAANeighborhoodBlendingPS( vUv, vOffset, tColor, tDiffuse );
  }
