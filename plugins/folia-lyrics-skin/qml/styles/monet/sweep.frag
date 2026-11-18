#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 extent;
    vec4 fillColor;
    float sweepEnd;
    float edgeSoftness;
};
layout(binding=1) uniform sampler2D source;
void main() {
    float x=qt_TexCoord0.x*extent.x;
    float solid=max(sweepEnd-edgeSoftness,0.0);
    float feather=max(sweepEnd-edgeSoftness*.55,0.0);
    float end=max(sweepEnd,0.0);
    float mask;
    if (x<=solid) mask=1.0;
    else if (x<feather) mask=mix(1.0,.92,(x-solid)/max(.00001,feather-solid));
    else if (x<end) mask=mix(.92,0.0,(x-feather)/max(.00001,end-feather));
    else mask=0.0;
    float fade=qt_TexCoord0.x<=.68?mix(1.0,.92,qt_TexCoord0.x/.68):mix(.92,.72,(qt_TexCoord0.x-.68)/.32);
    float alpha=texture(source,qt_TexCoord0).a*fillColor.a*fade*mask*qt_Opacity;
    fragColor=vec4(fillColor.rgb*alpha,alpha);
}
