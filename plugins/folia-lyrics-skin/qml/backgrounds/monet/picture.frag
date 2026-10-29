// Source CSS cover/position, raw-cover gradient, drift transform and fixed pane mask.
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf{
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 frameSize;
    vec2 imageSize;
    vec4 background;
    vec4 accent;
    vec3 drift;
    float positionX;
    float halfPane;
    float rawImage;
};
layout(binding=1) uniform sampler2D source;
vec4 pm(vec4 color,float alpha){return vec4(color.rgb*alpha,alpha);}
vec4 over(vec4 fg,vec4 bg){return fg+bg*(1.-fg.a);}
void main(){
    vec2 uv=(qt_TexCoord0-.5-drift.xy/100.)/drift.z+.5;
    vec2 point=uv*frameSize;
    float fit=max(frameSize.x/imageSize.x,frameSize.y/imageSize.y);
    vec2 extent=imageSize*fit;
    vec2 imageUv=(point-(frameSize-extent)*vec2(positionX,.5))/extent;
    vec4 color=texture(source,clamp(imageUv,0.,1.));
    if(any(lessThan(imageUv,vec2(0.)))||any(greaterThan(imageUv,vec2(1.))))color=vec4(0.);
    if(rawImage>.5){
        float diagonal=clamp((point.x+point.y)/(frameSize.x+frameSize.y),0.,1.);
        color=over(mix(pm(accent,.2),pm(background,.78),diagonal),color);
    }
    if(halfPane>.5){
        float x=qt_TexCoord0.x;
        float mask=x<=.48?mix(1.,.94,x/.48):x<=.74?mix(.94,.46,(x-.48)/.26):mix(.46,0.,(x-.74)/.26);
        color*=mask;
    }else color=over(color,vec4(background.rgb*background.a,background.a));
    fragColor=color*qt_Opacity;
}
