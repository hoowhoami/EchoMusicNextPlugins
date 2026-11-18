#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix;
 float qt_Opacity;
 float widthPx;
 float fillPx;
 float softPx;
 float fillEnabled;
};
layout(binding=1) uniform sampler2D source;
void main(){float x=qt_TexCoord0.x*widthPx;float start=max(fillPx-softPx,0.);float a=x<=start?1.:x<=fillPx?mix(1.,.84,(x-start)/max(.001,fillPx-start)):x<=fillPx+softPx?.84*(1.-(x-fillPx)/softPx):0.;fragColor=texture(source,qt_TexCoord0)*a*fillEnabled*qt_Opacity;}
