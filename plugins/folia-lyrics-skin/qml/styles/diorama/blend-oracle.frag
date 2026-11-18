#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec4 expected;};
layout(binding=1) uniform sampler2D source;
void main(){vec4 value=texture(source,vec2(.5));bool correct=all(lessThanEqual(abs(value-expected),vec4(2.1/255.0)));fragColor=(correct?vec4(0,1,0,1):vec4(value.rgb,1))*qt_Opacity;}
