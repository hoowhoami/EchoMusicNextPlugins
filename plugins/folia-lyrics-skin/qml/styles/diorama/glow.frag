#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;};
layout(binding=1) uniform sampler2D tight;
layout(binding=2) uniform sampler2D middle;
layout(binding=3) uniform sampler2D outer;
void main(){float a=min(1.0,texture(tight,qt_TexCoord0).a*1.8+texture(middle,qt_TexCoord0).a*.55+texture(outer,qt_TexCoord0).a*.3);fragColor=vec4(a)*qt_Opacity;}
