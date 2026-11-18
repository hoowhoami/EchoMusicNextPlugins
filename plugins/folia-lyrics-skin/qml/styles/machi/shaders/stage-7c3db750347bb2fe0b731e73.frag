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
layout(binding=3) uniform sampler2D tArea;
layout(binding=4) uniform sampler2D tSearch;
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
  layout(location=1) in vec4 vOffset[3];
  layout(location=4) in vec2 vPixcoord;
  float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale ) {
   e.r = bias + e.r * scale;
   return 255.0 * texture( searchTex, e, 0.0 ).r;
  }
  float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
   vec2 e = vec2( 0.0, 1.0 );
   for ( int i = 0; i < 8; i ++ ) {
    e = texture( edgesTex, texcoord, 0.0 ).rg;
    texcoord -= vec2( 2.0, 0.0 ) * resolution;
    if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
   }
   texcoord.x += 0.25 * resolution.x;
   texcoord.x += resolution.x;
   texcoord.x += 2.0 * resolution.x;
   texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);
   return texcoord.x;
  }
  float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
   vec2 e = vec2( 0.0, 1.0 );
   for ( int i = 0; i < 8; i ++ ) {
    e = texture( edgesTex, texcoord, 0.0 ).rg;
    texcoord += vec2( 2.0, 0.0 ) * resolution;
    if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
   }
   texcoord.x -= 0.25 * resolution.x;
   texcoord.x -= resolution.x;
   texcoord.x -= 2.0 * resolution.x;
   texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );
   return texcoord.x;
  }
  float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
   vec2 e = vec2( 1.0, 0.0 );
   for ( int i = 0; i < 8; i ++ ) {
    e = texture( edgesTex, texcoord, 0.0 ).rg;
    texcoord += vec2( 0.0, 2.0 ) * resolution;
    if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
   }
   texcoord.y -= 0.25 * resolution.y;
   texcoord.y -= resolution.y;
   texcoord.y -= 2.0 * resolution.y;
   texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 );
   return texcoord.y;
  }
  float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
   vec2 e = vec2( 1.0, 0.0 );
   for ( int i = 0; i < 8; i ++ ) {
    e = texture( edgesTex, texcoord, 0.0 ).rg;
    texcoord -= vec2( 0.0, 2.0 ) * resolution;
    if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
   }
   texcoord.y += 0.25 * resolution.y;
   texcoord.y += resolution.y;
   texcoord.y += 2.0 * resolution.y;
   texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 );
   return texcoord.y;
  }
  vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset ) {
   vec2 texcoord = float( 16 ) * round( 4.0 * vec2( e1, e2 ) ) + dist;
   texcoord = ( 1.0 / vec2( 160.0, 560.0 ) ) * texcoord + ( 0.5 * ( 1.0 / vec2( 160.0, 560.0 ) ) );
   texcoord.y += ( 1.0 / 7.0 ) * offset;
   return texture( areaTex, texcoord, 0.0 ).rg;
  }
  vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices ) {
   vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );
   vec2 e = texture( edgesTex, texcoord ).rg;
   if ( e.g > 0.0 ) {
    vec2 d;
    vec2 coords;
    coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
    coords.y = offset[ 1 ].y;
    d.x = coords.x;
    float e1 = texture( edgesTex, coords, 0.0 ).r;
    coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
    d.y = coords.x;
    d = d / resolution.x - pixcoord.x;
    vec2 sqrt_d = sqrt( abs( d ) );
    coords.y -= 1.0 * resolution.y;
    float e2 = texture( edgesTex, coords + float( ivec2( 1, 0 ) ) * resolution, 0.0 ).r;
    weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
   }
   if ( e.r > 0.0 ) {
    vec2 d;
    vec2 coords;
    coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
    coords.x = offset[ 0 ].x;
    d.x = coords.y;
    float e1 = texture( edgesTex, coords, 0.0 ).g;
    coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
    d.y = coords.y;
    d = d / resolution.y - pixcoord.y;
    vec2 sqrt_d = sqrt( abs( d ) );
    coords.y -= 1.0 * resolution.y;
    float e2 = texture( edgesTex, coords + float( ivec2( 0, 1 ) ) * resolution, 0.0 ).g;
    weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
   }
   return weights;
  }
  void main() {
   pc_fragColor = SMAABlendingWeightCalculationPS( vUv, vPixcoord, vOffset, tDiffuse, tArea, tSearch, ivec4( 0.0 ) );
  }
