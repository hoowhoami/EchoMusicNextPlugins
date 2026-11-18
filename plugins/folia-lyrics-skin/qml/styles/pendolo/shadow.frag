#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix;
 float qt_Opacity;
 vec4 tint;
 float strength;
};
layout(binding=1) uniform sampler2D source;
layout(binding=2) uniform sampler2D blurred;
void main(){vec4 body=texture(source,qt_TexCoord0);float a=texture(blurred,qt_TexCoord0).a*strength;vec4 shadow=vec4(tint.rgb*a,a);fragColor=(body+shadow*(1.-body.a))*qt_Opacity;}
