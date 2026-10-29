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
    vec4 sum = tap(uv) * 4.0;
    sum += tap(uv - hp);
    sum += tap(uv + hp);
    sum += tap(uv + vec2(hp.x, -hp.y));
    sum += tap(uv - vec2(hp.x, -hp.y));
    vec4 c = sum / 8.0;
    if (uParams.z > 0.5) {
        float br = max(c.r, max(c.g, c.b));
        float knee = max(uParams.y, 1e-4);
        float soft = clamp(br - uParams.x + knee, 0.0, 2.0 * knee);
        soft = soft * soft / (4.0 * knee);
        float contrib = max(soft, br - uParams.x) / max(br, 1e-4);
        c *= clamp(contrib, 0.0, 1.0);
    }
    fragColor = c;
fragColor*=qt_Opacity;
}
