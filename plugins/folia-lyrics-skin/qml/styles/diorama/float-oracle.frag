#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;};
layout(binding=1) uniform sampler2D source;
void main(){vec4 value=texture(source,vec2(.5));bool correct=all(lessThan(abs(value-vec4(-2.5,1.25,100.125,0.0)),vec4(.000001)));fragColor=(correct?vec4(0,1,0,1):vec4(1,0,0,1))*qt_Opacity;}
