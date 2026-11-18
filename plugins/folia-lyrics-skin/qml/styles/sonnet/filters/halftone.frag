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


float dotScreen(vec2 fragCoord, float angle, float value, float cellSize) {
    float c = cos(angle);
    float s = sin(angle);
    vec2 rotated = mat2(c, s, -s, c) * fragCoord;
    float dist = length(fract(rotated / cellSize) - 0.5) * cellSize;
    float radius = sqrt(clamp(value, 0.0, 1.0)) * cellSize * 0.62;
    return 1.0 - smoothstep(radius - 1.2, radius + 1.2, dist);
}

void main(void) {
    vec4 color = texture(uTexture, vTextureCoord);
    if (color.a > 0.0) {
        color.rgb /= color.a;
    }
    float cellSize = 5.0;
    vec3 screened = vec3(
        dotScreen(sourceFragCoord(), radians(15.0), color.r, cellSize),
        dotScreen(sourceFragCoord(), radians(75.0), color.g, cellSize),
        dotScreen(sourceFragCoord(), radians(0.0), color.b, cellSize)
    );
    color.rgb = mix(color.rgb, screened, uAmount);
    color.rgb *= color.a;
    fragColor = color;
fragColor*=qt_Opacity;
}
