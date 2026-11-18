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
struct DirectionalLightShadow {
   float shadowIntensity;
   float shadowBias;
   float shadowNormalBias;
   float shadowRadius;
   vec2 shadowMapSize;
  };
struct DirectionalLight {
  vec3 direction;
  vec3 color;
 };
struct PointLight {
  vec3 position;
  vec3 color;
  float distance;
  float decay;
 };
struct SpotLight {
  vec3 position;
  vec3 direction;
  vec3 color;
  float distance;
  float decay;
  float coneCos;
  float penumbraCos;
 };
struct HemisphereLight {
  vec3 direction;
  vec3 skyColor;
  vec3 groundColor;
 };
struct ToonMaterial {
 vec3 diffuseColor;
};
layout(std140,binding=0) uniform NativeFrame {vec4 nativeViewport;vec4 nativeOutput;mat4 nativeCorrection;};
layout(std140,binding=1) uniform NativeUniforms {
mat4 projectionMatrix;
mat4 viewMatrix;
vec3 cameraPosition;
bool isOrthographic;
mat4 directionalShadowMatrix[1];
DirectionalLightShadow directionalLightShadows[1];
float uTime;
mat4 uReflectMatrix;
vec2 uPuddleOffset;
float uPuddleAmount;
float uRain;
float uWet;
vec3 uSky;
float uReflectStrength;
float uPuddleBias;
vec2 uKickCenter;
vec4 uKickAge;
vec4 uKickAmp;
float uMachiSnow;
vec3 uMachiSnowColor;
vec3 uMachiViewUp;
vec4 uMachiRoofs[4];
float uMachiRoofY[4];
vec3 ambientLightColor;
DirectionalLight directionalLights[1];
PointLight pointLights[5];
SpotLight spotLights[1];
HemisphereLight hemisphereLights[1];
float uMachiWet;
vec4 nativeTarget;
};
layout(binding=3) uniform sampler2D uReflection;
layout(binding=4) uniform sampler2D gradientMap;
layout(binding=5) uniform sampler2D directionalShadowMap_0;
layout(binding=2) uniform sampler2D nativeObjects;
layout(location=4) in float nativeDraw;
layout(location=5) flat out int nativeDrawId;
int nativeObjectId(){return int(nativeDraw+.5);}
vec4 nativeObject(int column){return texelFetch(nativeObjects,ivec2(column,nativeObjectId()),0);}
#define modelMatrix mat4(nativeObject(0),nativeObject(1),nativeObject(2),nativeObject(3))
#define modelViewMatrix mat4(nativeObject(4),nativeObject(5),nativeObject(6),nativeObject(7))
#define normalMatrix mat3(nativeObject(8).xyz,nativeObject(9).xyz,nativeObject(10).xyz)
#define diffuse nativeObject(11).rgb
#define opacity nativeObject(11).a
#define emissive nativeObject(12).rgb
#define uMachiGloss nativeObject(13).xy
#define receiveShadow (nativeObject(14).x>.5)

 
 
 
 
 
 
 
 
 
 
 
 
 
 
 
 







layout(location=0) in vec3 position;
layout(location=1) in vec3 normal;
layout(location=2) in vec2 uv;
layout(location=0) out vec3 vViewPosition;
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
layout(location=1) out vec3 vKWorld;
layout(location=2) out vec3 vMachiWorld;
 layout(location=3) out vec3 vNormal;
  
  layout(location=4) out vec4 vDirectionalShadowCoord[ 1 ];
  
  
void nativeSourceMain() {
vec3 objectNormal = vec3( normal );
vec3 transformedNormal = objectNormal;
transformedNormal = normalMatrix * transformedNormal;
 vNormal = normalize( transformedNormal );
vec3 transformed = vec3( position );
vec4 mvPosition = vec4( transformed, 1.0 );
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;
{
    vec4 machiLocal = vec4(transformed, 1.0);
    vMachiWorld = (modelMatrix * machiLocal).xyz;
}
 vViewPosition = - mvPosition.xyz;
 vec4 worldPosition = vec4( transformed, 1.0 );
 worldPosition = modelMatrix * worldPosition;
vKWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
 vec4 shadowWorldPosition;
   shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ 0 ].shadowNormalBias, 0 );
   vDirectionalShadowCoord[ 0 ] = directionalShadowMatrix[ 0 ] * shadowWorldPosition;
}

void main(){nativeDrawId=nativeObjectId();nativeSourceMain();if(nativeOutput.w<.5 && nativeTarget.z>.5)gl_Position.y=-gl_Position.y;gl_Position=nativeCorrection*gl_Position;}
