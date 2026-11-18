#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 size;vec2 fullSize;vec2 offset;vec4 tint;float haloOpacity;};
void main(){vec2 center=fullSize*vec2(.42,.5);float reach=length(max(center,fullSize-center));float t=length(qt_TexCoord0*size+offset-center)/max(reach,1.);float a=t<.55?mix(.14,.035,t/.55):t<.82?mix(.035,0.,(t-.55)/.27):0.;a*=haloOpacity;fragColor=vec4(tint.rgb*a,a)*qt_Opacity;}
