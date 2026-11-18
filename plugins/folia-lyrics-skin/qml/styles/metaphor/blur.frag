#version 440
// Exact three separable box-filter stages use radius 1 for tight and 6 for wide.
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(binding=1) uniform sampler2D source;
layout(binding=2) uniform sampler2D gains;
layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix; float qt_Opacity; vec2 direction; float firstPass; float lastPass;
};
void main(){
 ivec2 size=textureSize(source,0); ivec2 p=ivec2(qt_TexCoord0*vec2(size));
 ivec2 cell=(p/128)*128; vec2 sum=vec2(0.);
 for(int i=-6;i<=6;i++) {
  ivec2 at=p+ivec2(direction)*i;
  vec2 value=vec2(0.);
  if(all(greaterThanEqual(at,cell))&&all(lessThan(at,cell+ivec2(128)))) {
   vec4 sampleValue=texelFetch(source,at,0);
   value=firstPass>.5?vec2(sampleValue.a):sampleValue.rg;
  }
  sum.g+=value.g/13.; if(abs(i)<=1) sum.r+=value.r/3.;
 }
 if(lastPass>.5)sum=floor(clamp(sum*vec2(1.,texelFetch(gains,cell/128,0).r),0.,1.)*255.+.5)/255.;
 fragColor=vec4(sum,0.,1.)*qt_Opacity;
}
