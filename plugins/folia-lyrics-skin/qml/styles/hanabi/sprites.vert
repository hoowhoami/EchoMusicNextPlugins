#version 440
layout(location=0) in vec4 qt_Vertex;
layout(location=1) in vec2 qt_MultiTexCoord0;
layout(std140,binding=0) uniform buf { mat4 qt_Matrix; float qt_Opacity; float uCount; };
layout(binding=1) uniform sampler2D instanceData;
layout(location=0) out vec2 vUv;
layout(location=1) out vec4 vColor;
layout(location=2) flat out float vSlot;
layout(location=3) flat out vec4 vUvRect;
layout(location=4) flat out float vTiled;
vec2 corner(out int index) {
 float row=floor(qt_MultiTexCoord0.y*(uCount*4.-1.)+.5),part=mod(row,4.);
 index=min(int(uCount)-1,int(floor(row/4.)+(part>2.5?1.:0.)));
 return part<.5?vec2(qt_MultiTexCoord0.x,1.):part<1.5?vec2(qt_MultiTexCoord0.x,0.):part<2.5?vec2(1.,0.):vec2(0.,1.);
}
void main() {
 int i; vec2 c=corner(i);
 vec4 a=texelFetch(instanceData,ivec2(0,i),0), b=texelFetch(instanceData,ivec2(1,i),0), d=texelFetch(instanceData,ivec2(2,i),0), tint=texelFetch(instanceData,ivec2(3,i),0), uv=texelFetch(instanceData,ivec2(4,i),0), tile=texelFetch(instanceData,ivec2(5,i),0);
 vec2 local=c*b.zw+d.xy;
 gl_Position=qt_Matrix*vec4(dot(a.xy,local)+a.z,a.w*local.x+b.x*local.y+b.y,0.,1.);
 vUv=tint.w>.5?(c*b.zw-tile.xy)/tile.zw:c;
 vColor=vec4(tint.rgb*d.w,d.w)*qt_Opacity;
 vSlot=d.z; vUvRect=uv; vTiled=tint.w;
}
