// Analytic convolution of the source CSS rounded box with its Gaussian shadow.
// No bitmap mask, texture upload, framebuffer, or CPU blur is needed.
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 boxSize;
    float padding;
    float corner;
    float square;
    vec4 primaryColor;
    vec4 accentColor;
    vec4 backgroundColor;
    vec2 shadowOffset;
    float shadowSigma;
    vec4 shadowColor;
};
float erfApprox(float x) {
    float t=1./(1.+.3275911*abs(x));
    float polynomial=(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-.284496736)*t+.254829592)*t;
    return sign(x)*(1.-polynomial*exp(-x*x));
}
float intervalMass(float x,float low,float high,float sigma) {
    float scale=.7071067811865475/sigma;
    return .5*(erfApprox((high-x)*scale)-erfApprox((low-x)*scale));
}
float cornerSample(vec2 p,float sigma,float theta,float weight) {
    float sine=sin(theta),cosine=cos(theta);
    float left=corner*(1.-sine);
    float horizontal=intervalMass(p.x,left,boxSize.x-left,sigma);
    float top=corner*(1.-cosine);
    float bottom=boxSize.y-top;
    float a=(p.y-top)/sigma,b=(p.y-bottom)/sigma;
    return weight*corner*sine*horizontal*(exp(-.5*a*a)+exp(-.5*b*b))/(2.5066282746310005*sigma);
}
float roundedGaussian(vec2 p,float sigma) {
    float mass=intervalMass(p.x,0.,boxSize.x,sigma)*intervalMass(p.y,corner,boxSize.y-corner,sigma);
    // Twelve-point Gauss-Legendre integration in angle coordinates makes the
    // corner endpoint smooth; the middle rectangle is integrated exactly.
    for(int i=0;i<6;++i) {
        float node,weight;
        if(i==0){node=.1252334085114689;weight=.2491470458134028;}
        else if(i==1){node=.3678314989981802;weight=.2334925365383548;}
        else if(i==2){node=.5873179542866175;weight=.2031674267230659;}
        else if(i==3){node=.7699026741943047;weight=.1600783285433462;}
        else if(i==4){node=.9041172563704749;weight=.1069393259953184;}
        else{node=.9815606342467192;weight=.0471753363865118;}
        mass+=cornerSample(p,sigma,.7853981633974483*(1.-node),.7853981633974483*weight);
        mass+=cornerSample(p,sigma,.7853981633974483*(1.+node),.7853981633974483*weight);
    }
    return clamp(mass,0.,1.);
}
float roundedDistance(vec2 p,float spread) {
    vec2 q=abs(p-boxSize*.5)-(boxSize*.5-vec2(corner));
    return length(max(q,vec2(0.)))+min(max(q.x,q.y),0.)-corner-spread;
}
vec4 ink(vec4 color,float alpha) {
    vec3 rgb=color.a>0.?color.rgb/color.a:vec3(0.);
    return vec4(rgb*alpha,alpha);
}
vec4 over(vec4 front,vec4 back) { return front+back*(1.-front.a); }
void main() {
    vec2 p=qt_TexCoord0*(boxSize+vec2(2.*padding))-vec2(padding);
    float aa=max(fwidth(roundedDistance(p,0.)),.00001);
    float shape=clamp(.5-roundedDistance(p,0.)/aa,0.,1.);
    vec4 result;
    if(square>1.5) {
        float coverage;
        if(shadowSigma>0.)coverage=roundedGaussian(p-shadowOffset,shadowSigma);
        else coverage=clamp(.5-roundedDistance(p-shadowOffset,0.)/aa,0.,1.);
        result=ink(shadowColor,coverage*shadowColor.a*(1.-shape));
    } else if(square>.5) {
        float accent=roundedGaussian(p-vec2(0.,20.),21.)*.22*(1.-shape);
        float background=roundedGaussian(p-vec2(0.,36.),40.)*.45*(1.-shape);
        // CSS paints the last shadow first, then the background over all shadows.
        float outside=clamp(.5-roundedDistance(p,1.)/aa,0.,1.)*(1.-shape);
        result=ink(primaryColor,.06*outside);
        result=over(ink(accentColor,accent),result);
        result=over(ink(backgroundColor,background),result);
        result=over(ink(primaryColor,.08*shape),result);
    } else {
        float background=roundedGaussian(p-vec2(0.,24.),30.)*.35*(1.-shape);
        result=ink(backgroundColor,background);
        result=over(ink(backgroundColor,.15*shape),result);
        float inside=shape-clamp(.5-roundedDistance(p,-1.)/aa,0.,1.);
        result=over(ink(primaryColor,.1*inside),result);
    }
    fragColor=result*qt_Opacity;
}
