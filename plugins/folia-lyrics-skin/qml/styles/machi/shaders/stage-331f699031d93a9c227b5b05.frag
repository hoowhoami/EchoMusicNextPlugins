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
float uTime;
float uWind;
float uPhase;
mat3 mapTransform;
mat3 emissiveMapTransform;
vec3 ambientLightColor;
DirectionalLight directionalLights[1];
PointLight pointLights[2];
SpotLight spotLights[3];
HemisphereLight hemisphereLights[1];
vec4 nativeTarget;
};
layout(binding=3) uniform sampler2D map;
layout(binding=4) uniform sampler2D emissiveMap;
layout(binding=5) uniform sampler2D gradientMap;
layout(binding=2) uniform sampler2D nativeObjects;
layout(location=4) flat in int nativeDrawId;
int nativeObjectId(){return nativeDrawId;}
vec4 nativeObject(int column){return texelFetch(nativeObjects,ivec2(column,nativeObjectId()),0);}
#define modelMatrix mat4(nativeObject(0),nativeObject(1),nativeObject(2),nativeObject(3))
#define modelViewMatrix mat4(nativeObject(4),nativeObject(5),nativeObject(6),nativeObject(7))
#define normalMatrix mat3(nativeObject(8).xyz,nativeObject(9).xyz,nativeObject(10).xyz)
#define diffuse nativeObject(11).rgb
#define opacity nativeObject(11).a
#define emissive nativeObject(12).rgb
#define uMachiGloss nativeObject(13).xy
#define receiveShadow (nativeObject(14).x>.5)
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
 layout(location=1) in vec2 vMapUv;
 layout(location=2) in vec2 vEmissiveMapUv;
 
 
 
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
 float dotNL = dot( normal, lightDirection );
 vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
  return vec3( texture( gradientMap, coord ).r );
}
float G_BlinnPhong_Implicit( ) {
 return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
 return 0.3183098861837907 * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
 vec3 halfDir = normalize( lightDir + viewDir );
 float dotNH = clamp( dot( normal, halfDir ), 0.0, 1.0 );
 float dotVH = clamp( dot( viewDir, halfDir ), 0.0, 1.0 );
 vec3 F = F_Schlick( specularColor, 1.0, dotVH );
 float G = G_BlinnPhong_Implicit( );
 float D = D_BlinnPhong( shininess, dotNH );
 return F * ( G * D );
}


vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
 float x = normal.x, y = normal.y, z = normal.z;
 vec3 result = shCoefficients[ 0 ] * 0.886227;
 result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
 result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
 result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
 result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
 result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
 result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
 result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
 result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
 return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
 vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
 vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
 return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
 vec3 irradiance = ambientLightColor;
 return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
 float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
 if ( cutoffDistance > 0.0 ) {
  distanceFalloff *= pow2( clamp( 1.0 - pow4( lightDistance / cutoffDistance ), 0.0, 1.0 ) );
 }
 return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
 return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
 
 
 void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
  light.color = directionalLight.color;
  light.direction = directionalLight.direction;
  light.visible = true;
 }
 
 
 void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
  vec3 lVector = pointLight.position - geometryPosition;
  light.direction = normalize( lVector );
  float lightDistance = length( lVector );
  light.color = pointLight.color;
  light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
  light.visible = ( light.color != vec3( 0.0 ) );
 }
 
 
 void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
  vec3 lVector = spotLight.position - geometryPosition;
  light.direction = normalize( lVector );
  float angleCos = dot( light.direction, spotLight.direction );
  float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
  if ( spotAttenuation > 0.0 ) {
   float lightDistance = length( lVector );
   light.color = spotLight.color * spotAttenuation;
   light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
   light.visible = ( light.color != vec3( 0.0 ) );
  } else {
   light.color = vec3( 0.0 );
   light.visible = false;
  }
 }
 
 
 vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
  float dotNL = dot( normal, hemiLight.direction );
  float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
  vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
  return irradiance;
 }
 layout(location=3) in vec3 vNormal;
layout(location=0) in vec3 vViewPosition;

void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
 vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
 reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
 reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void main() {
 vec4 diffuseColor = vec4( diffuse, opacity );
 ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
 vec3 totalEmissiveRadiance = emissive;
 vec4 sampledDiffuseColor = texture( map, vMapUv );
 diffuseColor *= sampledDiffuseColor;
float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
 vec3 normal = normalize( vNormal );
  normal *= faceDirection;
vec3 nonPerturbedNormal = normal;
 vec4 emissiveColor = texture( emissiveMap, vEmissiveMapUv );
 totalEmissiveRadiance *= emissiveColor.rgb;
ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
IncidentLight directLight;
 PointLight pointLight;
  pointLight = pointLights[ 0 ];
  getPointLightInfo( pointLight, geometryPosition, directLight );
  RE_Direct_Toon( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  pointLight = pointLights[ 1 ];
  getPointLightInfo( pointLight, geometryPosition, directLight );
  RE_Direct_Toon( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
 SpotLight spotLight;
 vec4 spotColor;
 vec3 spotLightCoord;
 bool inSpotLightMap;
  spotLight = spotLights[ 0 ];
  getSpotLightInfo( spotLight, geometryPosition, directLight );
  RE_Direct_Toon( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  spotLight = spotLights[ 1 ];
  getSpotLightInfo( spotLight, geometryPosition, directLight );
  RE_Direct_Toon( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  spotLight = spotLights[ 2 ];
  getSpotLightInfo( spotLight, geometryPosition, directLight );
  RE_Direct_Toon( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
 DirectionalLight directionalLight;
  directionalLight = directionalLights[ 0 ];
  getDirectionalLightInfo( directionalLight, directLight );
  RE_Direct_Toon( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
 vec3 iblIrradiance = vec3( 0.0 );
 vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
   irradiance += getHemisphereLightIrradiance( hemisphereLights[ 0 ], geometryNormal );
 RE_IndirectDiffuse_Toon( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
 vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
diffuseColor.a = 1.0;
pc_fragColor = vec4( outgoingLight, diffuseColor.a );
pc_fragColor = linearToOutputTexel( pc_fragColor );
}
