// 13 std140 vec4 slots, packed by ../gpu.mjs. Colors are premultiplied sRGB.
layout(std140,binding=1) uniform Parameters {
 vec4 targetInfo;
 vec4 animation;
 vec4 effect;
 vec4 grade;
 vec4 backgroundColor;
 vec4 ditherBack;
 vec4 ditherFront;
 vec4 mesh0; vec4 mesh1; vec4 mesh2; vec4 mesh3; vec4 mesh4; vec4 mesh5;
};
#define resolution targetInfo.xy
#define pixelRatio targetInfo.z
#define ditherTime animation.x
#define meshTime animation.y
#define pixelSize animation.z
#define distortion animation.w
#define swirl effect.x
#define ditherOpacity effect.y
#define ditherScale effect.z
#define meshScale effect.w
#define saturation grade.x
#define brightness grade.y
#define displayMode grade.z
#define overlayOpacity grade.w
vec4 straightColor(vec4 c){return c.a>0.?vec4(c.rgb/c.a,c.a):vec4(0.);}
vec4 meshColor(int i){if(i==0)return straightColor(mesh0);if(i==1)return straightColor(mesh1);if(i==2)return straightColor(mesh2);if(i==3)return straightColor(mesh3);if(i==4)return straightColor(mesh4);return straightColor(mesh5);}
