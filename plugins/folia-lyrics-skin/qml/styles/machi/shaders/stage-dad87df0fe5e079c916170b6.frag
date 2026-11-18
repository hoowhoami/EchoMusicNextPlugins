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
PointLight pointLights[2];
SpotLight spotLights[3];
HemisphereLight hemisphereLights[1];
float uMachiWet;
vec4 nativeTarget;
};
layout(binding=3) uniform sampler2D uReflection;
layout(binding=4) uniform sampler2D gradientMap;
layout(binding=5) uniform sampler2D directionalShadowMap_0;
layout(binding=2) uniform sampler2D nativeObjects;
layout(location=5) flat in int nativeDrawId;
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
float nativeShadowCompare(sampler2D image,vec3 p){ivec2 size=textureSize(image,0);vec2 q=p.xy*vec2(size)-.5;ivec2 b=ivec2(floor(q));vec2 f=fract(q);ivec2 hi=size-1;float a=step(p.z,texelFetch(image,clamp(b,ivec2(0),hi),0).r);float c=step(p.z,texelFetch(image,clamp(b+ivec2(1,0),ivec2(0),hi),0).r);float d=step(p.z,texelFetch(image,clamp(b+ivec2(0,1),ivec2(0),hi),0).r);float e=step(p.z,texelFetch(image,clamp(b+ivec2(1,1),ivec2(0),hi),0).r);return mix(mix(a,c,f.x),mix(d,e,f.x),f.y); }
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













layout(location=1) in vec3 vKWorld;
float kHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float kNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(kHash(i), kHash(i + vec2(1.0, 0.0)), u.x), mix(kHash(i + vec2(0.0, 1.0)), kHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float kPuddle(vec2 p) {
    float n = kNoise(p * 0.62 + uPuddleOffset) * 0.62 + kNoise(p * 1.7 - uPuddleOffset * 1.3) * 0.38;
    float threshold = mix(0.78, 0.46, uPuddleAmount) + uPuddleBias;
    return smoothstep(threshold, threshold + 0.05, n);
}
vec3 kRippleLayer(vec2 p, float scale, float t, float salt) {
    vec2 q = p * scale;
    vec2 cell = floor(q);
    vec2 center = cell + 0.22 + 0.56 * vec2(kHash(cell + salt), kHash(cell + salt + 7.13));
    float period = 0.75 + 0.9 * kHash(cell + salt + 3.31);
    float phase = fract(t / period + kHash(cell + salt + 11.7));
    float alive = step(kHash(cell + salt + floor(t / period + kHash(cell + salt + 11.7)) * 0.37), uRain);
    vec2 d = q - center;
    float dist = length(d);
    float radius = phase * 0.46;
    float band = 1.0 - smoothstep(0.0, 0.07, abs(dist - radius));
    float fade = (1.0 - phase) * alive;
    float wave = sin((dist - radius) * 48.0) * band * fade;
    return vec3(normalize(d + 1e-4) * wave, band * fade);
}
vec3 kKick(vec2 p, float age, float amp) {
    float a = max(age, 0.0);
    vec2 d = p - uKickCenter;
    float dist = length(d);
    float radius = a * 6.50;
    float band = 1.0 - smoothstep(0.0, 0.18 + 0.3 * a, abs(dist - radius));
    float left = clamp(1.0 - a / 1.30, 0.0, 1.0);
    float fade = amp * left * left * step(0.0, age);
    float wave = sin((dist - radius) * 7.0) * band * fade;
    return vec3(normalize(d + 1e-4) * wave, band * fade);
}
vec3 kReflect(vec2 uv, float rough) {
    float bias = mix(0.6, 1.8, rough);
    float reach = mix(10.0, 26.0, rough) / float(textureSize(uReflection, 0).y);
    vec3 sum = vec3(0.0);
    float total = 0.0;
    for (int i = -4; i <= 4; i++) {
        float t = float(i) / 4.0;
        float w = 1.0 - abs(t) * 0.75;
        sum += texture(uReflection, uv + vec2(0.0, t * reach), bias).rgb * w;
        total += w;
    }
    return sum / (total * 0.6);
}
float kGlint(vec2 p, float t) {
    vec2 q = p * 14.0;
    vec2 cell = floor(q);
    float h = kHash(cell + 3.7);
    float period = 0.5 + h * 1.1;
    float beat = t / period + h * 7.0;
    float drop = floor(beat);
    vec2 center = cell + 0.2 + 0.6 * vec2(kHash(cell + drop * 0.71), kHash(cell + drop * 1.37 + 9.1));
    float d = length(q - center);
    float aa = fwidth(d) + 1e-4;
    return (1.0 - smoothstep(0.16 - aa, 0.16 + aa, d)) * (1.0 - fract(beat)) * step(0.45, h);
}





layout(location=2) in vec3 vMachiWorld;
float machiSnowHash(vec2 p) { return fract(sin(dot(p, vec2(41.7, 289.3))) * 43758.5453); }
float machiSnowNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(machiSnowHash(i), machiSnowHash(i + vec2(1.0, 0.0)), u.x), mix(machiSnowHash(i + vec2(0.0, 1.0)), machiSnowHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float machiSheltered(vec3 p) {
    for (int i = 0; i < 4; i++) {
        vec4 r = uMachiRoofs[i];
        if (p.x > r.x && p.x < r.z && p.z > r.y && p.z < r.w && p.y < uMachiRoofY[i] - 0.05) return 1.0;
    }
    return 0.0;
}
 
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


float machiLocalLight = 1.0;
void RE_Direct_Machi( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
    RE_Direct_Toon( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
    float wet = uMachiWet * (1.0 - machiSheltered(vMachiWorld));
    float gloss = mix(uMachiGloss.x, uMachiGloss.y, wet);
    if (gloss > 0.001) {
        vec3 halfDir = normalize(directLight.direction + geometryViewDir);
        float nh = clamp( dot(geometryNormal, halfDir), 0.0, 1.0 );
        float soft = pow(nh, mix(14.0, 40.0, wet)) * 0.4;
        float core = smoothstep(mix(0.955, 0.975, wet), mix(0.968, 0.985, wet), nh) * machiLocalLight;
        vec3 color = directLight.color / (1.0 + dot(directLight.color, vec3(0.3333)) * 0.8);
        reflectedLight.directDiffuse += color * gloss * (soft * mix(0.5, 1.0, machiLocalLight) + core);
    }
}
   
  layout(location=4) in vec4 vDirectionalShadowCoord[ 1 ];
  
  
  float interleavedGradientNoise( vec2 position ) {
   return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
  }
  vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
   const float goldenAngle = 2.399963229728653;
   float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
   float theta = float( sampleIndex ) * goldenAngle + phi;
   return vec2( cos( theta ), sin( theta ) ) * r;
  }
  float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
   float shadow = 1.0;
   shadowCoord.xyz /= shadowCoord.w;
   shadowCoord.z += shadowBias;
   bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
   bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
   if ( frustumTest ) {
    vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
    float radius = shadowRadius * texelSize.x;
    float phi = interleavedGradientNoise( nativeFragCoord().xy ) * 6.283185307179586;
    shadow = (
     nativeShadowCompare(shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
     nativeShadowCompare(shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
     nativeShadowCompare(shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
     nativeShadowCompare(shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
     nativeShadowCompare(shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
    ) * 0.2;
   }
   return mix( 1.0, shadow, shadowIntensity );
  }
void main() {
 vec4 diffuseColor = vec4( diffuse, opacity );
 ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
 vec3 totalEmissiveRadiance = emissive;
float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
 vec3 normal = normalize( vNormal );
vec3 nonPerturbedNormal = normal;
if (uMachiSnow > 0.001) {
    float machiUp = dot(normalize(normal), uMachiViewUp);
    float machiNoise = machiSnowNoise(vMachiWorld.xz * 2.6) * 0.65 + machiSnowNoise(vMachiWorld.xz * 7.1) * 0.35;
    float machiCover = smoothstep(0.5, 0.85, machiUp) * smoothstep(1.0 - uMachiSnow * 0.9, 1.16 - uMachiSnow * 0.9, machiNoise + 0.25);
    machiCover *= 1.0 - machiSheltered(vMachiWorld);
    diffuseColor.rgb = mix(diffuseColor.rgb, uMachiSnowColor, machiCover * min(1.0, uMachiSnow * 1.4));
}
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
  RE_Direct_Machi( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  pointLight = pointLights[ 1 ];
  getPointLightInfo( pointLight, geometryPosition, directLight );
  RE_Direct_Machi( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
 SpotLight spotLight;
 vec4 spotColor;
 vec3 spotLightCoord;
 bool inSpotLightMap;
  spotLight = spotLights[ 0 ];
  getSpotLightInfo( spotLight, geometryPosition, directLight );
  RE_Direct_Machi( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  spotLight = spotLights[ 1 ];
  getSpotLightInfo( spotLight, geometryPosition, directLight );
  RE_Direct_Machi( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  spotLight = spotLights[ 2 ];
  getSpotLightInfo( spotLight, geometryPosition, directLight );
  RE_Direct_Machi( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
machiLocalLight = 0.0;
 DirectionalLight directionalLight;
 DirectionalLightShadow directionalLightShadow;
  directionalLight = directionalLights[ 0 ];
  getDirectionalLightInfo( directionalLight, directLight );
  directionalLightShadow = directionalLightShadows[ 0 ];
  directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap_0, directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ 0 ] ) : 1.0;
  RE_Direct_Machi( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
 vec3 iblIrradiance = vec3( 0.0 );
 vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
   irradiance += getHemisphereLightIrradiance( hemisphereLights[ 0 ], geometryNormal );
 RE_IndirectDiffuse_Toon( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
 vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
if (uWet > 0.0 || uRain > 0.0) {
    vec2 kp = vKWorld.xz;
    float puddle = kPuddle(kp) * smoothstep(0.15, 0.85, uWet) * (1.0 - min(1.0, uMachiSnow * 1.5));
    vec3 ripple = kRippleLayer(kp, 2.3, uTime, 0.0) + kRippleLayer(kp, 3.9, uTime * 1.13, 19.0) * 0.7;
    vec3 kick = vec3(0.0);
    if (any(greaterThan(uKickAmp, vec4(0.0)))) {
        kick = kKick(kp, uKickAge.x, uKickAmp.x) + kKick(kp, uKickAge.y, uKickAmp.y)
            + kKick(kp, uKickAge.z, uKickAmp.z) + kKick(kp, uKickAge.w, uKickAmp.w);
        kick *= smoothstep(0.10, 0.60, uWet) * (1.0 - min(1.0, uMachiSnow * 1.5));
    }
    vec4 rc = uReflectMatrix * vec4(vKWorld, 1.0);
    vec2 wobble = vec2(kNoise(kp * 2.7 + 3.1), kNoise(kp * 2.7 - 11.4)) - 0.5;
    vec2 ruv = rc.xy / rc.w + ripple.xy * mix(0.004, 0.018, puddle) + wobble * mix(0.012, 0.005, puddle) + kick.xy * mix(0.09, 0.15, puddle);
    vec3 reflection = kReflect(ruv, 1.0 - puddle);
    float lit = dot(reflectedLight.directDiffuse, vec3(0.299, 0.587, 0.114));
    float glint = kGlint(kp, uTime) * uRain * smoothstep(0.03, 0.4, lit) * (1.0 - min(1.0, uMachiSnow * 1.5));
    vec3 wet = outgoingLight * mix(1.0, 0.62, uWet) + reflection * uReflectStrength * 0.7 * uWet;
    vec3 pool = outgoingLight * 0.36 + uSky * 0.16 + reflection * uReflectStrength * 1.35 + ripple.z * uSky * 0.6;
    outgoingLight = mix(wet, pool, puddle) + glint * (vec3(lit) * 3.0 + reflection);
    outgoingLight += kick.z * (reflection * uReflectStrength * 3.6 + uSky * 2.4 + 0.24) * mix(0.6, 1.0, puddle);
}
diffuseColor.a = 1.0;
pc_fragColor = vec4( outgoingLight, diffuseColor.a );
pc_fragColor = linearToOutputTexel( pc_fragColor );
}
