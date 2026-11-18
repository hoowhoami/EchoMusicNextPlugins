#version 440
layout(std140,binding=0) uniform NativeFrame {vec4 viewport;vec4 outputInfo;mat4 correction;};
layout(std140,binding=1) uniform NativeTarget {vec4 extent;};
layout(binding=2) uniform sampler2D source;
layout(location=0) in vec2 uv;
layout(location=0) out vec4 color;
vec3 linearColor(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
void main(){vec2 p=vec2(uv.x,mix(1.-uv.y,uv.y,outputInfo.w));vec4 c=texture(source,p);color=vec4(linearColor(c.rgb),c.a);}
