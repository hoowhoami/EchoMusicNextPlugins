#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;float qt_Opacity;vec2 extent;float density;float sigma;float padding;float corner;float vertical;
};
layout(binding=1) uniform sampler2D source;
void main(){
    vec4 color=vec4(0.);float total=0.;
    float physicalSigma=sigma*density;
    int radius=int(ceil(3.*physicalSigma));
    vec2 stepUv=(vertical>.5?vec2(0.,1.):vec2(1.,0.))/(extent*density);
    if(sigma<=0.)color=texture(source,qt_TexCoord0);
    else {
        for(int i=-256;i<=256;++i){
            if(abs(i)>radius)continue;
            float weight=exp(-.5*float(i*i)/(physicalSigma*physicalSigma));
            color+=texture(source,qt_TexCoord0+float(i)*stepUv)*weight;total+=weight;
        }
        color/=total;
    }
    if(vertical>.5){
        vec2 size=extent-vec2(2.*padding),p=qt_TexCoord0*extent-vec2(padding);
        float r=min(corner,min(size.x,size.y)*.5);
        vec2 q=abs(p-size*.5)-(size*.5-vec2(r));
        float d=length(max(q,vec2(0.)))+min(max(q.x,q.y),0.)-r;
        color*=clamp(.5-d/max(fwidth(d),.00001),0.,1.);
    }
    fragColor=color*qt_Opacity;
}
