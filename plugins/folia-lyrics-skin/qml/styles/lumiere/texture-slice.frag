#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf{mat4 qt_Matrix;float qt_Opacity;vec4 uUvRect;vec3 uTint;};
layout(binding=1) uniform sampler2D source;
void main(){fragColor=texture(source,uUvRect.xy+qt_TexCoord0*uUvRect.zw)*vec4(uTint,1.0)*qt_Opacity;}
