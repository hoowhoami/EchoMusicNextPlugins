// Source CSS radial-gradient(circle,transparent 40%,rgba(0,0,0,.6) 100%). AGPL3.
#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 resolution;
};
void main(){
    // CSS circle defaults to farthest-corner; radius is half the diagonal.
    float radius=length(resolution)*.5;
    float distance=length((qt_TexCoord0-.5)*resolution)/max(radius,.00001);
    float alpha=.6*clamp((distance-.4)/.6,0.,1.);
    fragColor=vec4(0.,0.,0.,alpha)*qt_Opacity;
}
