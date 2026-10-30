#version 440
// Folia a8da4437 AGPL-3.0-only: original bloom formula.
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf{mat4 qt_Matrix;float qt_Opacity;vec2 uUvScale;vec4 uInputPixel;vec4 uInputClamp;vec4 uParams;vec4 uAddMap;vec4 uAddClamp;vec4 uTint;};
layout(binding=1) uniform sampler2D uTexture;
layout(binding=2) uniform sampler2D uAdd;
#define vTextureCoord (qt_TexCoord0*uUvScale)










vec4 tap(vec2 uv) {
    return texture(uTexture, clamp(uv, uInputClamp.xy, uInputClamp.zw));
}

void main(void) {
    vec2 uv = vTextureCoord;
    vec2 hp = uInputPixel.zw;
    vec4 sum = tap(uv + vec2(-hp.x * 2.0, 0.0));
    sum += tap(uv + vec2(-hp.x, hp.y)) * 2.0;
    sum += tap(uv + vec2(0.0, hp.y * 2.0));
    sum += tap(uv + vec2(hp.x, hp.y)) * 2.0;
    sum += tap(uv + vec2(hp.x * 2.0, 0.0));
    sum += tap(uv + vec2(hp.x, -hp.y)) * 2.0;
    sum += tap(uv + vec2(0.0, -hp.y * 2.0));
    sum += tap(uv + vec2(-hp.x, -hp.y)) * 2.0;
    vec4 up = sum / 12.0;
    vec4 same = texture(uAdd, clamp(uv * uAddMap.xy, uAddClamp.xy, uAddClamp.zw));
    fragColor = up + same * uAddMap.z;
fragColor*=qt_Opacity;
}
