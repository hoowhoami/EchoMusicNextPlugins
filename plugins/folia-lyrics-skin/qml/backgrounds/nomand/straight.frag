#version 440
layout(location=0)in vec2 qt_TexCoord0;layout(location=0)out vec4 fragColor;
layout(std140,binding=0)uniform buf{mat4 qt_Matrix;float qt_Opacity;};
layout(binding=1)uniform sampler2D source;
void main(){vec4 c=texture(source,qt_TexCoord0);fragColor=c.a>0.?vec4(c.rgb/c.a,c.a):vec4(0.);}
