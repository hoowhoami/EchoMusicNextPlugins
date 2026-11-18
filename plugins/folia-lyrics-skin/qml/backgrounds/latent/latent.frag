#version 440
// Paper0.0.80 Apache2.0 shader bodies; Folia a8da4437 composition AGPL3.
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix;
 float qt_Opacity;
 vec2 resolution;
 float pixelRatio;
 float ditherTime;
 float meshTime;
 float pixelSize;
 float distortion;
 float swirl;
 float ditherOpacity;
 float ditherScale;
 float meshScale;
 float saturation;
 float brightness;
 float displayMode;
 float overlayOpacity;
 vec4 backgroundColor;
 vec4 ditherBack;
 vec4 ditherFront;
 vec4 mesh0; vec4 mesh1; vec4 mesh2; vec4 mesh3; vec4 mesh4; vec4 mesh5;
};
vec4 straightColor(vec4 c){return c.a>0.?vec4(c.rgb/c.a,c.a):vec4(0.);}
vec4 meshColor(int i){if(i==0)return straightColor(mesh0);if(i==1)return straightColor(mesh1);if(i==2)return straightColor(mesh2);if(i==3)return straightColor(mesh3);if(i==4)return straightColor(mesh4);return straightColor(mesh5);}

layout(binding=1) uniform sampler2D meshSource;
layout(binding=2) uniform sampler2D ditherSource;
vec4 over(vec4 base,vec4 top){return top+base*(1.-top.a);}
vec3 softLight(vec3 base,vec3 blend){
 vec3 d=mix(((16.*base-12.)*base+4.)*base,sqrt(max(base,vec3(0.))),step(vec3(.25),base));
 return mix(base-(1.-2.*blend)*base*(1.-base),base+(2.*blend-1.)*(d-base),step(vec3(.5),blend));
}
void main(){
 vec4 color=backgroundColor;
 if(displayMode<1.5){
  vec4 mesh=texture(meshSource,(qt_TexCoord0-.5)/meshScale+.5);
  vec3 rgb=mesh.a>0.?mesh.rgb/mesh.a:vec3(0.);
  float l=dot(rgb,vec3(.2126,.7152,.0722));
  rgb=clamp((vec3(l)+(rgb-vec3(l))*saturation)*brightness,0.,1.);
  mesh.rgb=rgb*mesh.a;
  color=over(color,mesh);
 }
 if(displayMode<.5||displayMode>1.5){
  vec4 dither=texture(ditherSource,(qt_TexCoord0-.5)/ditherScale+.5);
  if(displayMode<.5){
   vec3 backdrop=color.a>0.?color.rgb/color.a:vec3(0.);
   vec3 source=dither.a>0.?dither.rgb/dither.a:vec3(0.);
   dither.rgb=mix(dither.rgb,softLight(backdrop,source)*dither.a,color.a);
   dither*=ditherOpacity;
  }
  color=over(color,dither);
 }
 color=over(color,backgroundColor*overlayOpacity);
 fragColor=color*qt_Opacity;
}
