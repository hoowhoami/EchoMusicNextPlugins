#version 440
layout(std140,binding=0) uniform NativeFrame {vec4 viewport;vec4 outputInfo;mat4 correction;};
layout(binding=2) uniform sampler2D source;
layout(location=0) in vec2 uv;
layout(location=0) out vec4 color;
vec3 linearColor(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
void main(){vec4 c=texture(source,uv);color=vec4(linearColor(c.rgb)*c.a,c.a);}
