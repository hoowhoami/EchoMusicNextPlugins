#version 440
layout(std140,binding=1) uniform Preparation {vec4 target;};
layout(binding=2) uniform sampler2D source;
layout(location=0) in vec2 uv;
layout(location=0) out vec4 color;
vec3 linearColor(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
void main(){vec4 c=texture(source,vec2(uv.x,mix(uv.y,1.-uv.y,target.z)));vec3 straight=c.a>0.?c.rgb/c.a:vec3(0.);color=vec4(mix(straight,linearColor(straight),target.w),c.a);}
