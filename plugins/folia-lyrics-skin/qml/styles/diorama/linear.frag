#version 440
layout(location=0)in vec2 qt_TexCoord0;layout(location=0)out vec4 fragColor;
layout(std140,binding=0)uniform buf{mat4 qt_Matrix;float qt_Opacity;};layout(binding=1)uniform sampler2D source;
vec3 decode(vec3 v){return mix(pow((v+.055)/1.055,vec3(2.4)),v/12.92,lessThanEqual(v,vec3(.04045)));}
void main(){vec4 t=texture(source,qt_TexCoord0);fragColor=vec4(decode(t.a>0.?t.rgb/t.a:vec3(0.)),t.a);}
