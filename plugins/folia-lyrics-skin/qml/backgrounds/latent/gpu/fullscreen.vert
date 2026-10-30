#version 440
#extension GL_GOOGLE_include_directive : require
#include "frame.glsl"
layout(location=0) out vec2 uv;
void main(){
 vec2 p=vec2((gl_VertexIndex<<1)&2,gl_VertexIndex&2);
 uv=p; // Logical top-left origin on every RHI backend.
 gl_Position=frame.correction*vec4(p.x*2.-1.,1.-p.y*2.,0.,1.);
}
