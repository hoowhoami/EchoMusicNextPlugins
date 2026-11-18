#version 440
layout(std140,binding=0) uniform NativeFrame {vec4 viewport;vec4 outputInfo;mat4 correction;};
layout(std140,binding=1) uniform Target {vec4 extent;};
layout(location=0) in vec4 ellipse;
layout(location=1) in vec4 levels;
layout(location=0) out vec2 local;
layout(location=1) flat out vec4 colors;
void main(){local=vec2(float(gl_VertexIndex&1),float((gl_VertexIndex>>1)&1))*2.-1.;vec2 p=ellipse.xy+local*ellipse.zw;vec4 clip=vec4(p/extent.xy*2.-1.,0.,1.);if(outputInfo.w<.5)clip.y=-clip.y;gl_Position=correction*clip;colors=levels;}
