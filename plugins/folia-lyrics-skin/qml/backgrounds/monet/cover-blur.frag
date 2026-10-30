// Folia a8da4437 cover crop + Canvas filter Gaussian. AGPL-3.0-only.
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 frameSize;
    vec2 imageSize;
    float padding;
    float sigma;
};
layout(binding=1) uniform sampler2D source;
vec4 cover(vec2 point) {
    float fit=max(frameSize.x/imageSize.x,frameSize.y/imageSize.y);
    vec2 extent=imageSize*fit;
    vec2 uv=(point-(frameSize-extent)*.5)/extent;
    if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return vec4(0.);
    return texture(source,uv);
}
void main() {
    vec2 point=qt_TexCoord0*vec2(frameSize.x,frameSize.y+2.*padding)-vec2(0.,padding);
    if(sigma<.001){fragColor=cover(point)*qt_Opacity;return;}
    int radius=int(ceil(4.*sigma));
    vec4 total=vec4(0.);
    float weights=0.;
    for(int i=-radius;i<=radius;++i){
        float x=float(i),weight=exp(-.5*x*x/(sigma*sigma));
        total+=cover(point+vec2(x,0.))*weight;
        weights+=weight;
    }
    fragColor=total/weights*qt_Opacity;
}
