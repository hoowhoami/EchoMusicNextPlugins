#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;};
void main(){fragColor=vec4(8.0/255.0,16.0/255.0,24.0/255.0,.125)*qt_Opacity;}
