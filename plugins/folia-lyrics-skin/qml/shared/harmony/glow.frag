// Source radial-gradient(ellipse at center, bg .7 0%, bg .42 48%, transparent 78%).
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 extent;vec2 boxSize;float padding;vec4 background;};
void main(){
 vec2 point=qt_TexCoord0*extent-vec2(padding);
 // CSS farthest-corner ellipse has radii sqrt(2) times its half box axes.
 float t=length((point-boxSize*.5)/(boxSize*.7071067811865476));
 float a=t<=.48?mix(.7,.42,t/.48):mix(.42,0.,clamp((t-.48)/.30,0.,1.));
 if(any(lessThan(point,vec2(0.)))||any(greaterThan(point,boxSize)))a=0.;
 a*=qt_Opacity;fragColor=vec4(background.rgb*a,a);
}
