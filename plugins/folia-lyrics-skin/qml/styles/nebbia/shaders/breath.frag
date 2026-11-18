#version 440
layout(location=0) in vec2 local;
layout(location=1) flat in vec4 colors;
layout(location=0) out vec4 color;
void main(){float r=length(local);float red=r<.45?mix(colors.x,colors.y,r/.45):r<.999?mix(colors.y,0.,(r-.45)/.549):0.;float edge=1.-smoothstep(1.-fwidth(r)*.5,1.+fwidth(r)*.5,r);float stopFade=clamp((1.-r)/.001,0.,1.);color=vec4(vec3(red,colors.zw*stopFade)*edge,edge);}
