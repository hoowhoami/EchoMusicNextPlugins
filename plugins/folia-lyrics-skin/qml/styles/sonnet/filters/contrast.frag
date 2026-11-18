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


float rand(vec2 co)
{
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main()
{
    vec4 color = texture(uTexture, vTextureCoord);
    float randomValue = rand(sourceFragCoord() * 0.2);
    float diff = (randomValue - 0.5) *  0.5;

    if (uAlpha == 0.0) {
        fragColor = color;
        return;
    }

    if (color.a > 0.0) {
        color.rgb /= color.a;
    }

    vec4 result;

    result.r = ((1.0+uContrast) * color.r);
        result.r += (0.0 * color.g);
        result.r += (0.0 * color.b);
        result.r += (0.0 * color.a);
        result.r += (-0.5*uContrast);

    result.g = (0.0 * color.r);
        result.g += ((1.0+uContrast) * color.g);
        result.g += (0.0 * color.b);
        result.g += (0.0 * color.a);
        result.g += (-0.5*uContrast);

    result.b = (0.0 * color.r);
       result.b += (0.0 * color.g);
       result.b += ((1.0+uContrast) * color.b);
       result.b += (0.0 * color.a);
       result.b += (-0.5*uContrast);

    result.a = (0.0 * color.r);
       result.a += (0.0 * color.g);
       result.a += (0.0 * color.b);
       result.a += (1.0 * color.a);
       result.a += 0.0;

    vec3 rgb = mix(color.rgb, result.rgb, uAlpha);

    // Premultiply alpha again.
    rgb *= result.a;

    fragColor = vec4(rgb, result.a);
fragColor*=qt_Opacity;
}
