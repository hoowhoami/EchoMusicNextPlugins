#version 440
// Derived from Folia a8da4437 / Pixi8.21 (AGPL-3.0-only / MIT).
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix; float qt_Opacity;
 vec4 uInputSize; vec4 uInputClamp; vec4 uOutputFrame;
 vec2 uUvScale; vec2 uFramePhysicalSize;
 float uFlipFragY; float uTargetPhysicalHeight; float uDistortion; float uDispersion;
 float uNoise; float uSeed; float uContrast; float uAlpha;
 float uAmount; float uStrength; vec2 uDirection;
};
layout(binding=1) uniform sampler2D source;
#define uTexture source
#define vTextureCoord (qt_TexCoord0*uUvScale)
vec2 sourceFragCoord(){float y=qt_TexCoord0.y*uFramePhysicalSize.y; return vec2(qt_TexCoord0.x*uFramePhysicalSize.x,mix(y,uTargetPhysicalHeight-y,uFlipFragY));}


void main(void)
{
vec2 vBlurTexCoords[15];
vBlurTexCoords[0]=vTextureCoord+uDirection*-7.0*uStrength*uInputSize.zw;
vBlurTexCoords[1]=vTextureCoord+uDirection*-6.0*uStrength*uInputSize.zw;
vBlurTexCoords[2]=vTextureCoord+uDirection*-5.0*uStrength*uInputSize.zw;
vBlurTexCoords[3]=vTextureCoord+uDirection*-4.0*uStrength*uInputSize.zw;
vBlurTexCoords[4]=vTextureCoord+uDirection*-3.0*uStrength*uInputSize.zw;
vBlurTexCoords[5]=vTextureCoord+uDirection*-2.0*uStrength*uInputSize.zw;
vBlurTexCoords[6]=vTextureCoord+uDirection*-1.0*uStrength*uInputSize.zw;
vBlurTexCoords[7]=vTextureCoord+uDirection*0.0*uStrength*uInputSize.zw;
vBlurTexCoords[8]=vTextureCoord+uDirection*1.0*uStrength*uInputSize.zw;
vBlurTexCoords[9]=vTextureCoord+uDirection*2.0*uStrength*uInputSize.zw;
vBlurTexCoords[10]=vTextureCoord+uDirection*3.0*uStrength*uInputSize.zw;
vBlurTexCoords[11]=vTextureCoord+uDirection*4.0*uStrength*uInputSize.zw;
vBlurTexCoords[12]=vTextureCoord+uDirection*5.0*uStrength*uInputSize.zw;
vBlurTexCoords[13]=vTextureCoord+uDirection*6.0*uStrength*uInputSize.zw;
vBlurTexCoords[14]=vTextureCoord+uDirection*7.0*uStrength*uInputSize.zw;
    fragColor = texture(uTexture, clamp(vBlurTexCoords[0], uInputClamp.xy, uInputClamp.zw)) * 0.000489
    + texture(uTexture, clamp(vBlurTexCoords[1], uInputClamp.xy, uInputClamp.zw)) * 0.002403
    + texture(uTexture, clamp(vBlurTexCoords[2], uInputClamp.xy, uInputClamp.zw)) * 0.009246
    + texture(uTexture, clamp(vBlurTexCoords[3], uInputClamp.xy, uInputClamp.zw)) * 0.02784
    + texture(uTexture, clamp(vBlurTexCoords[4], uInputClamp.xy, uInputClamp.zw)) * 0.065602
    + texture(uTexture, clamp(vBlurTexCoords[5], uInputClamp.xy, uInputClamp.zw)) * 0.120999
    + texture(uTexture, clamp(vBlurTexCoords[6], uInputClamp.xy, uInputClamp.zw)) * 0.174697
    + texture(uTexture, clamp(vBlurTexCoords[7], uInputClamp.xy, uInputClamp.zw)) * 0.197448
    + texture(uTexture, clamp(vBlurTexCoords[8], uInputClamp.xy, uInputClamp.zw)) * 0.174697
    + texture(uTexture, clamp(vBlurTexCoords[9], uInputClamp.xy, uInputClamp.zw)) * 0.120999
    + texture(uTexture, clamp(vBlurTexCoords[10], uInputClamp.xy, uInputClamp.zw)) * 0.065602
    + texture(uTexture, clamp(vBlurTexCoords[11], uInputClamp.xy, uInputClamp.zw)) * 0.02784
    + texture(uTexture, clamp(vBlurTexCoords[12], uInputClamp.xy, uInputClamp.zw)) * 0.009246
    + texture(uTexture, clamp(vBlurTexCoords[13], uInputClamp.xy, uInputClamp.zw)) * 0.002403
    + texture(uTexture, clamp(vBlurTexCoords[14], uInputClamp.xy, uInputClamp.zw)) * 0.000489
;
fragColor*=qt_Opacity;
}