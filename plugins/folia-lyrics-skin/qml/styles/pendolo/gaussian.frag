#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix;
 float qt_Opacity;
 vec2 direction;
 float sigma;
 float pixelRatio;
};
layout(binding=1) uniform sampler2D source;
void main(){
 float stride=max(1./max(pixelRatio,1.),sigma/24.);
 float reach=ceil(3.*sigma/stride);
 float norm=0.; vec4 color=vec4(0.);
 for(int i=-72;i<=72;i++){
  float offset=float(i)*stride;
  if(abs(float(i))>reach)continue;
  float weight=exp(-.5*offset*offset/max(.0001,sigma*sigma));
  vec2 uv=qt_TexCoord0+direction*offset;
  if(all(greaterThanEqual(uv,vec2(0.)))&&all(lessThanEqual(uv,vec2(1.))))color+=texture(source,uv)*weight;
  norm+=weight;
 }
 fragColor=color/max(norm,.0001)*qt_Opacity;
}
