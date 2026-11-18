#version 440
layout(std140,binding=0) uniform buf { mat4 qt_Matrix; float qt_Opacity; float uCount; };
layout(binding=2) uniform sampler2D source0;
layout(binding=3) uniform sampler2D source1;
layout(binding=4) uniform sampler2D source2;
layout(binding=5) uniform sampler2D source3;
layout(binding=6) uniform sampler2D source4;
layout(binding=7) uniform sampler2D source5;
layout(binding=8) uniform sampler2D source6;
layout(binding=9) uniform sampler2D source7;
layout(location=0) in vec2 vUv;
layout(location=1) in vec4 vColor;
layout(location=2) flat in float vSlot;
layout(location=3) flat in vec4 vUvRect;
layout(location=4) flat in float vTiled;
layout(location=0) out vec4 fragColor;
void main() {
 if(vSlot<-.5){fragColor=vColor;return;}
 vec2 uv=vUvRect.xy+(vTiled>.5?fract(vUv):vUv)*vUvRect.zw;
 vec4 c;
 if(vSlot<.5)c=texture(source0,uv);else if(vSlot<1.5)c=texture(source1,uv);else if(vSlot<2.5)c=texture(source2,uv);else if(vSlot<3.5)c=texture(source3,uv);else if(vSlot<4.5)c=texture(source4,uv);else if(vSlot<5.5)c=texture(source5,uv);else if(vSlot<6.5)c=texture(source6,uv);else c=texture(source7,uv);
 fragColor=c*vColor;
}
