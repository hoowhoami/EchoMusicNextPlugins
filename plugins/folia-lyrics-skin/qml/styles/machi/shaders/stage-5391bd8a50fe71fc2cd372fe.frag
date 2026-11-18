#version 440
// Folia/Three pinned source math; see package notices.
struct IncidentLight {
 vec3 color;
 vec3 direction;
 bool visible;
};
struct ReflectedLight {
 vec3 directDiffuse;
 vec3 directSpecular;
 vec3 indirectDiffuse;
 vec3 indirectSpecular;
};
layout(std140,binding=0) uniform NativeFrame {vec4 nativeViewport;vec4 nativeOutput;mat4 nativeCorrection;};
layout(std140,binding=1) uniform NativeUniforms {
mat4 modelMatrix;
mat4 modelViewMatrix;
mat4 projectionMatrix;
mat4 viewMatrix;
mat3 normalMatrix;
vec3 cameraPosition;
bool isOrthographic;
float luminosityThreshold;
float smoothWidth;
vec2 uSpread;
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
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
float rand( const in vec2 uv ) {
 const float a = 12.9898, b = 78.233, c = 43758.5453;
 float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, 3.141592653589793 );
 return fract( sin( sn ) * c );
}
 float precisionSafeLength( vec3 v ) { return length( v ); }


vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
 return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
 return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
 return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
 return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
 float u = atan( dir.z, dir.x ) * 0.15915494309189535 + 0.5;
 float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * 0.3183098861837907 + 0.5;
 return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
 return 0.3183098861837907 * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
 float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
 return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
 float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
 return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}




layout(location=0) in vec2 vUv;
vec3 bright(vec2 uv) {
    vec3 texel = texture(tDiffuse, uv).rgb;
    return texel * smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, luminance(texel));
}
void main() {
    vec3 c = (bright(vUv - uSpread) + bright(vUv + vec2(uSpread.x, -uSpread.y))
        + bright(vUv + vec2(-uSpread.x, uSpread.y)) + bright(vUv + uSpread)) * 0.25;
    pc_fragColor = vec4(c, 1.0);
}
