#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 size;vec2 center;float radius;vec4 tint;};
void main(){float t=clamp(length(qt_TexCoord0*size-center)/max(radius,1.),0.,1.);float a=t<=.35?mix(.72,.52,t/.35):t<=.7?mix(.52,.20,(t-.35)/.35):mix(.20,0.,(t-.7)/.3);fragColor=vec4(tint.rgb*a,a)*qt_Opacity;}
