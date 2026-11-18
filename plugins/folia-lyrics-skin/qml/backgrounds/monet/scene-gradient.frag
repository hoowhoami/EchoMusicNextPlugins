// CSS background gradients from Folia MonetBackgroundLayer.tsx. AGPL-3.0-only.
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf{
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 frameSize;
    vec4 background;
    vec4 primary;
    vec4 accent;
    float paneMode;
    float overlayPass;
};
vec4 pm(vec4 color,float alpha){return vec4(color.rgb*alpha,alpha);}
vec4 over(vec4 fg,vec4 bg){return fg+bg*(1.-fg.a);}
void main(){
    vec2 uv=qt_TexCoord0;
    vec4 color=vec4(0.);
    if(overlayPass<.5){
        color=vec4(background.rgb*background.a,background.a);
        float diagonal=(uv.x*frameSize.x+uv.y*frameSize.y)/(frameSize.x+frameSize.y);
        vec4 a=pm(accent,.22),b=pm(background,.96),c=pm(primary,.18);
        color=over(diagonal<=.5?mix(a,b,diagonal*2.):mix(b,c,(diagonal-.5)*2.),color);
    }else{
        if(paneMode>.5){
            float alpha=uv.x<=.28?mix(.14,.28,uv.x/.28):uv.x<=.64?mix(.28,.62,(uv.x-.28)/.36):mix(.62,.86,(uv.x-.64)/.36);
            color=over(pm(background,alpha),color);
            vec2 center=frameSize*vec2(.18,.34);
            float farthest=length(frameSize-center);
            float radial=clamp(length(uv*frameSize-center)/(farthest*.36),0.,1.);
            color=over(pm(accent,.18*(1.-radial)),color);
        }
        float alpha=uv.x<=.34?mix(.18,.32,uv.x/.34):uv.x<=.7?mix(.32,.66,(uv.x-.34)/.36):mix(.66,.82,(uv.x-.7)/.3);
        color=over(pm(background,alpha),color);
    }
    fragColor=color*qt_Opacity;
}
