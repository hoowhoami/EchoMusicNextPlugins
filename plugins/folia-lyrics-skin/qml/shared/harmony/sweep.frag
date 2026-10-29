// Source HarmonyGlowText linear-gradient mask. CSS gradient is premultiplied coverage.
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 extent;float edge;float solid;float halfStop;};
layout(binding=1) uniform sampler2D source;
void main(){
 float x=qt_TexCoord0.x*extent.x;
 float a=x<=solid?1.:x<halfStop?mix(1.,.86,(x-solid)/max(.00001,halfStop-solid)):x<edge?mix(.86,0.,(x-halfStop)/max(.00001,edge-halfStop)):0.;
 fragColor=texture(source,qt_TexCoord0)*a*qt_Opacity;
}
