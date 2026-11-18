#version 440
// Derived from Folia 8006b40f (AGPL-3.0-only). Original field/develop expressions retained.
layout(location=0) in vec4 qt_Vertex;
layout(location=1) in vec2 qt_MultiTexCoord0;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix; float qt_Opacity; vec2 viewport; vec4 camera; float uTime; float uMelt; float uPop; float uReveal; float uShakeTime; float uWobble; float uOutputTint; float uEnabled;};
layout(binding=1) uniform sampler2D uAtlas;
layout(binding=2) uniform sampler2D instanceData;

vec4 projectWorld(vec2 world) {
  vec2 p = world - camera.xy;
  float c = cos(camera.w), s = sin(camera.w);
  vec2 view = vec2(p.x*c + p.y*s, -p.x*s + p.y*c);
  float scale = viewport.y * .5 / (max(camera.z, .001) * tan(radians(15.0)));
  return qt_Matrix * vec4(viewport*.5 + view*vec2(1.,-1.)*scale,0.,1.);
}
vec2 instanceCorner(out int index) {
  int count = textureSize(instanceData, 0).y;
  float row = floor(qt_MultiTexCoord0.y * (float(count)*4.-1.) + .5);
  float part = mod(row,4.);
  index = min(count-1, int(floor(row/4.) + (part>2.5?1.:0.)));
  return part<.5 ? vec2(qt_MultiTexCoord0.x,1.) : part<1.5 ? vec2(qt_MultiTexCoord0.x,0.) : part<2.5 ? vec2(1.,0.) : vec2(0.,1.);
}

layout(location=0) out vec2 vUv;
layout(location=1) out vec2 vTime;
layout(location=2) out vec3 vMeta;
layout(location=3) out vec2 vWorld;
layout(location=4) out vec2 vQuad;
layout(location=5) out vec3 vTint;

void main() {
  int index; vec2 corner = instanceCorner(index);
  vec4 p0=texelFetch(instanceData,ivec2(0,index),0), p1=texelFetch(instanceData,ivec2(1,index),0), p2=texelFetch(instanceData,ivec2(2,index),0);
  vec2 c=corner*2.-1.; float halfCell=p0.z*(128./72.)*.5;
  vec2 aOffset=vec2(c.x*cos(p0.w)-c.y*sin(p0.w),c.x*sin(p0.w)+c.y*cos(p0.w))*halfCell;
  vec3 position=vec3(p0.xy,0.); vec2 aTime=p1.xy; vec3 aMeta=vec3(p1.zw,p0.z); vec3 aTint=p2.rgb;
  int cell=int(p2.w); vec2 atlasSize=vec2(textureSize(uAtlas,0));
  vec2 uv=(vec2(cell%8,cell/8)*128.+vec2(corner.x,1.-corner.y)*128.)/atlasSize;

    float dt = uTime - aTime.x;
    float on = step(0.0, dt);
    // 开唱的一下鼓起来，慢慢收回去；还没唱到的略小一点
    float scale = mix(0.94, 1.0 + uPop * 0.18 * exp(-max(dt, 0.0) * 2.2), on);
    vec3 p = position;
    // 化开：各自朝自己的方向散出去（不是往下淌）
    float away = aMeta.x * 6.2832;
    p.xy += vec2(cos(away), sin(away)) * uMelt * uMelt * (0.4 + fract(aMeta.x * 7.31) * 0.9) * aMeta.z;
    scale *= 1.0 + uMelt * 0.25;
    p.xy += aOffset * scale;
    vUv = uv;
    vTime = aTime;
    vMeta = aMeta;
    vTint = aTint;
    vWorld = p.xy;
    // 这一格里的位置（-1..1）：四个角按左下、右下、右上、左上的顺序排
    vQuad = c;
    gl_Position = projectWorld(p.xy);
}
