#version 440
layout(std140,binding=0) uniform NativeFrame {vec4 viewport;vec4 outputInfo;mat4 correction;};
layout(location=0) out vec2 uv;
void main(){vec2 p=vec2(float(gl_VertexIndex&1),float((gl_VertexIndex>>1)&1));uv=p;vec4 v=vec4(p*2.-1.,0.,1.);if(outputInfo.w<.5)v.y=-v.y;gl_Position=correction*v;}
