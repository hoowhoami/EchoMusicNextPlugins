#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec2 uvScaleA;vec2 uvScaleB;vec2 uvOffsetA;vec2 uvOffsetB;float amountA;float amountB;};
layout(binding=1) uniform sampler2D sourceA;
layout(binding=2) uniform sampler2D sourceB;
void main(){vec4 a=texture(sourceA,qt_TexCoord0*uvScaleA+uvOffsetA)*amountA;vec4 b=texture(sourceB,qt_TexCoord0*uvScaleB+uvOffsetB)*amountB;fragColor=vec4(a.rgb+b.rgb-a.rgb*b.rgb,a.a+b.a-a.a*b.a)*qt_Opacity;}
