#version 440
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
    mat4 qt_Matrix;float qt_Opacity;vec2 extent;float padding;vec4 baseColor;
    mat4 matrix0;mat4 matrix1;mat4 matrix2;mat4 matrix3;mat4 matrix4;mat4 matrix5;
    float alpha0;float alpha1;float alpha2;float alpha3;float alpha4;float alpha5;
};
layout(binding=1) uniform sampler2D source0;
layout(binding=2) uniform sampler2D source1;
layout(binding=3) uniform sampler2D source2;
layout(binding=4) uniform sampler2D source3;
layout(binding=5) uniform sampler2D source4;
layout(binding=6) uniform sampler2D source5;
vec4 over(vec4 a,vec4 b){return a+b*(1.-a.a);}
vec4 sampleSource(sampler2D source,mat4 matrix,vec4 point,float alpha){
    vec2 uv=(matrix*point).xy;
    if(alpha<=0.||uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.)return vec4(0.);
    return texture(source,uv)*alpha;
}
void main(){
    vec4 p=vec4(qt_TexCoord0*extent-vec2(padding),0.,1.);
    vec4 color=baseColor;
    color=over(sampleSource(source0,matrix0,p,alpha0),color);
    color=over(sampleSource(source1,matrix1,p,alpha1),color);
    color=over(sampleSource(source2,matrix2,p,alpha2),color);
    color=over(sampleSource(source3,matrix3,p,alpha3),color);
    color=over(sampleSource(source4,matrix4,p,alpha4),color);
    color=over(sampleSource(source5,matrix5,p,alpha5),color);
    fragColor=color*qt_Opacity;
}
