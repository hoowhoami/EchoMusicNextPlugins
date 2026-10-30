// Folia FluidBackground fallback: theme background .8 plus optional overlay .4.
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec4 primaryColor;
    vec4 secondaryColor;
    vec4 backgroundColor;
    float overlayEnabled;
};
void main(){
    vec4 base=backgroundColor*.8;
    float t=(qt_TexCoord0.x+qt_TexCoord0.y)*.5;
    vec4 endpoint=t<.5?primaryColor:secondaryColor;
    vec3 blend=endpoint.a>0.?endpoint.rgb/endpoint.a:vec3(0.);
    float alpha=endpoint.a*abs(2.*t-1.)*.4*overlayEnabled;
    vec3 back=base.a>0.?base.rgb/base.a:vec3(0.);
    vec3 mixed=mix(2.*back*blend,1.-2.*(1.-back)*(1.-blend),step(vec3(.5),back));
    fragColor=vec4((1.-alpha)*base.rgb+alpha*((1.-base.a)*blend+base.a*mixed),alpha+base.a*(1.-alpha))*qt_Opacity;
}
