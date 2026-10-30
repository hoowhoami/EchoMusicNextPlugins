#version 440
layout(location=0) in vec2 vUv;
layout(location=1) in float vFogDepth;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;mat4 mvp;mat4 modelView;vec2 viewport;vec2 extent;vec3 tint;vec3 fogColor;float alpha;float fogNear;float fogFar;};
layout(binding=1) uniform sampler2D source;
vec3 decode(vec3 v){return mix(pow((v+.055)/1.055,vec3(2.4)),v/12.92,lessThanEqual(v,vec3(.04045)));}
vec3 encode(vec3 v){return mix(pow(max(v,vec3(0)),vec3(.41666))*1.055-.055,v*12.92,lessThanEqual(v,vec3(.0031308)));}
vec3 ACES(vec3 c){const mat3 inputMat=mat3(vec3(.59719,.07600,.02840),vec3(.35458,.90834,.13383),vec3(.04823,.01566,.83777));const mat3 outputMat=mat3(vec3(1.60475,-.10208,-.00327),vec3(-.53108,1.10813,-.07276),vec3(-.07367,-.00605,1.07602));c=inputMat*(c/.6);c=(c*(c+.0245786)-.000090537)/(c*(.983729*c+.4329510)+.238081);return clamp(outputMat*c,0.,1.);}
void main(){vec4 texel=texture(source,vUv);vec3 rgb=texel.rgb*tint;rgb=mix(encode(ACES(rgb)),encode(fogColor),smoothstep(fogNear,fogFar,vFogDepth));float opacity=texel.a*alpha;fragColor=vec4(rgb*opacity,opacity)*qt_Opacity;}
