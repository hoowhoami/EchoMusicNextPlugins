// CSS filter blur in source buffer pixels. Static cover/resize work only.
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 bufferSize;
    vec2 expandedSize;
    vec2 imageSize;
    float padding;
    float sigma;
    float vertical;
};
layout(binding=1) uniform sampler2D source;
vec4 unblurred(vec2 point){
    float fit=max(bufferSize.x/imageSize.x,bufferSize.y/imageSize.y)*1.5;
    vec2 extent=imageSize*fit;
    vec2 uv=(point-(bufferSize-extent)*.5)/extent;
    if(any(lessThan(uv,vec2(0.)))||any(greaterThan(uv,vec2(1.))))return vec4(0.);
    return texture(source,uv);
}
void main(){
    vec2 point=vertical>.5?qt_TexCoord0*bufferSize:qt_TexCoord0*expandedSize-vec2(padding);
    float radius=ceil(3.*sigma);
    vec4 total=vec4(0.);
    float weights=0.;
    for(int i=-256;i<=256;++i){
        float offset=float(i);
        if(abs(offset)>radius)continue;
        float weight=exp(-.5*offset*offset/(sigma*sigma));
        vec4 color=vertical>.5?texture(source,(point+vec2(padding)+vec2(0.,offset))/expandedSize):unblurred(point+vec2(offset,0.));
        total+=color*weight;
        weights+=weight;
    }
    fragColor=total/max(weights,.000001)*qt_Opacity;
}
