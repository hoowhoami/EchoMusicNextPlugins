#version 440
// Derived from Folia 8006b40f (AGPL-3.0-only). Original field/develop expressions retained.
layout(location=0) in vec4 qt_Vertex;
layout(location=1) in vec2 qt_MultiTexCoord0;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix; float qt_Opacity; vec2 viewport; vec4 camera; float uTime; float uWobble; vec3 uAccent; float uOutputTint; float uEnabled; float uCount;};
layout(binding=1) uniform sampler2D instanceData;

vec4 projectWorld(vec2 world) {
  vec2 p = world - camera.xy;
  float c = cos(camera.w), s = sin(camera.w);
  vec2 view = vec2(p.x*c + p.y*s, -p.x*s + p.y*c);
  float scale = viewport.y * .5 / (max(camera.z, .001) * tan(radians(15.0)));
  return qt_Matrix * vec4(viewport*.5 + view*vec2(1.,-1.)*scale,0.,1.);
}
vec2 instanceCorner(out int index) {
  int count = max(1, int(uCount));
  float row = floor(qt_MultiTexCoord0.y * (float(count)*4.-1.) + .5);
  float part = mod(row,4.);
  index = min(count-1, int(floor(row/4.) + (part>2.5?1.:0.)));
  return part<.5 ? vec2(qt_MultiTexCoord0.x,1.) : part<1.5 ? vec2(qt_MultiTexCoord0.x,0.) : part<2.5 ? vec2(1.,0.) : vec2(0.,1.);
}

layout(location=0) out vec2 vL;
layout(location=1) out vec2 vWorld;
layout(location=2) out vec2 vTurn;
layout(location=3) out vec3 vMix;
layout(location=4) out float vShape;
layout(location=5) out float vParam;
layout(location=6) out vec2 vScale;

// 每一格四周多留的边（世界单位）：给抖动和线两边那圈网点留地方
const float MARGIN = 0.2;

void main() {
 int index; vec2 corner=instanceCorner(index);
 vec4 p0=texelFetch(instanceData,ivec2(0,index),0),p1=texelFetch(instanceData,ivec2(1,index),0),p2=texelFetch(instanceData,ivec2(2,index),0);
 vec2 position=corner*2.-1.,iPos=p0.xy,iScale=p0.zw;
 float iRot=p1.x,iShape=p2.x,iParam=p2.y; vec3 iMix=p1.yzw;

    // 圆弧那一格是正方的：sy 是线宽的倍数，不是半轴
    vec2 scale = iShape > 2.5 && iShape < 3.5 ? vec2(iScale.x) : iScale;
    vec2 local = position.xy * (scale + MARGIN);
    float c = cos(iRot);
    float s = sin(iRot);
    vec2 o = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
    vL = local;
    vWorld = iPos + o;
    vTurn = vec2(c, s);
    vMix = iMix;
    vShape = iShape;
    vParam = iParam;
    vScale = iScale;
    gl_Position = projectWorld(iPos+o);
}
