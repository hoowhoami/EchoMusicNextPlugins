#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 stepUv;float sigma;};
layout(binding=1) uniform sampler2D source;
void main(){float total=0.0,weight=0.0;for(int i=-96;i<=96;i++){float x=float(i);if(abs(x)>ceil(sigma*3.0))continue;float w=exp(-.5*x*x/(sigma*sigma));vec2 uv=qt_TexCoord0+stepUv*x;float a=all(greaterThanEqual(uv,vec2(0)))&&all(lessThanEqual(uv,vec2(1)))?texture(source,uv).a:0.0;total+=a*w;weight+=w;}float a=total/weight;fragColor=vec4(a)*qt_Opacity;}
