#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 extent;float clipBottom;float fadeY;float fadeX;};
layout(binding=1) uniform sampler2D source;
void main(){vec2 p=qt_TexCoord0*extent;float a=1.0;if(clipBottom>=0.0)a*=clamp((clipBottom-p.y)/max(.001,fadeY),0.0,1.0);if(fadeX>0.0)a*=clamp((extent.x-p.x)/fadeX,0.0,1.0);fragColor=texture(source,qt_TexCoord0)*a*qt_Opacity;}
