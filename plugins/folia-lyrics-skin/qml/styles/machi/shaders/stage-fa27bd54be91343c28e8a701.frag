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
  layout(location=1) in vec4 vOffset[ 3 ];
  vec4 SMAAColorEdgeDetectionPS( vec2 texcoord, vec4 offset[3], sampler2D colorTex ) {
   vec2 threshold = vec2( 0.1, 0.1 );
   vec4 delta;
   vec3 C = texture( colorTex, texcoord ).rgb;
   vec3 Cleft = texture( colorTex, offset[0].xy ).rgb;
   vec3 t = abs( C - Cleft );
   delta.x = max( max( t.r, t.g ), t.b );
   vec3 Ctop = texture( colorTex, offset[0].zw ).rgb;
   t = abs( C - Ctop );
   delta.y = max( max( t.r, t.g ), t.b );
   vec2 edges = step( threshold, delta.xy );
   if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
    discard;
   vec3 Cright = texture( colorTex, offset[1].xy ).rgb;
   t = abs( C - Cright );
   delta.z = max( max( t.r, t.g ), t.b );
   vec3 Cbottom = texture( colorTex, offset[1].zw ).rgb;
   t = abs( C - Cbottom );
   delta.w = max( max( t.r, t.g ), t.b );
   float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );
   vec3 Cleftleft = texture( colorTex, offset[2].xy ).rgb;
   t = abs( C - Cleftleft );
   delta.z = max( max( t.r, t.g ), t.b );
   vec3 Ctoptop = texture( colorTex, offset[2].zw ).rgb;
   t = abs( C - Ctoptop );
   delta.w = max( max( t.r, t.g ), t.b );
   maxDelta = max( max( maxDelta, delta.z ), delta.w );
   edges.xy *= step( 0.5 * maxDelta, delta.xy );
   return vec4( edges, 0.0, 0.0 );
  }
  void main() {
   pc_fragColor = SMAAColorEdgeDetectionPS( vUv, vOffset, tDiffuse );
  }
