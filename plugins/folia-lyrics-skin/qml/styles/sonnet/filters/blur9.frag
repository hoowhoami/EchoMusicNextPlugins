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
vec2 vBlurTexCoords[9];
vBlurTexCoords[0]=vTextureCoord+uDirection*-4.0*uStrength*uInputSize.zw;
vBlurTexCoords[1]=vTextureCoord+uDirection*-3.0*uStrength*uInputSize.zw;
vBlurTexCoords[2]=vTextureCoord+uDirection*-2.0*uStrength*uInputSize.zw;
vBlurTexCoords[3]=vTextureCoord+uDirection*-1.0*uStrength*uInputSize.zw;
vBlurTexCoords[4]=vTextureCoord+uDirection*0.0*uStrength*uInputSize.zw;
vBlurTexCoords[5]=vTextureCoord+uDirection*1.0*uStrength*uInputSize.zw;
vBlurTexCoords[6]=vTextureCoord+uDirection*2.0*uStrength*uInputSize.zw;
vBlurTexCoords[7]=vTextureCoord+uDirection*3.0*uStrength*uInputSize.zw;
vBlurTexCoords[8]=vTextureCoord+uDirection*4.0*uStrength*uInputSize.zw;
    fragColor = texture(uTexture, clamp(vBlurTexCoords[0], uInputClamp.xy, uInputClamp.zw)) * 0.028532
    + texture(uTexture, clamp(vBlurTexCoords[1], uInputClamp.xy, uInputClamp.zw)) * 0.067234
    + texture(uTexture, clamp(vBlurTexCoords[2], uInputClamp.xy, uInputClamp.zw)) * 0.124009
    + texture(uTexture, clamp(vBlurTexCoords[3], uInputClamp.xy, uInputClamp.zw)) * 0.179044
    + texture(uTexture, clamp(vBlurTexCoords[4], uInputClamp.xy, uInputClamp.zw)) * 0.20236
    + texture(uTexture, clamp(vBlurTexCoords[5], uInputClamp.xy, uInputClamp.zw)) * 0.179044
    + texture(uTexture, clamp(vBlurTexCoords[6], uInputClamp.xy, uInputClamp.zw)) * 0.124009
    + texture(uTexture, clamp(vBlurTexCoords[7], uInputClamp.xy, uInputClamp.zw)) * 0.067234
    + texture(uTexture, clamp(vBlurTexCoords[8], uInputClamp.xy, uInputClamp.zw)) * 0.028532
;
fragColor*=qt_Opacity;
}