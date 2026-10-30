#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;};
layout(binding=1) uniform sampler2D source;
void main(){vec2 c=qt_TexCoord0*2.-1.;float edge=1.-smoothstep(1.-fwidth(length(c)),1.,length(c));fragColor=texture(source,qt_TexCoord0)*edge*qt_Opacity;}
