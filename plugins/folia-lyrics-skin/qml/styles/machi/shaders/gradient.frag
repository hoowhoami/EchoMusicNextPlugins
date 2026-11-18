#version 440
layout(std140,binding=1) uniform Preparation {vec4 top;vec4 bottom;vec4 extent;};
layout(location=0) in vec2 uv;
layout(location=0) out vec4 color;
vec3 linearColor(vec3 c){return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c));}
void main(){float y=mix(uv.y,1.-uv.y,extent.z);vec3 c=floor(mix(top.rgb,bottom.rgb,y)*255.+.5)/255.;color=vec4(linearColor(c),1.);}
