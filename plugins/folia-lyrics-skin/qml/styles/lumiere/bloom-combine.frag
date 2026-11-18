#version 440
// Folia a8da4437 AGPL-3.0-only: original bloom formula.
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf{mat4 qt_Matrix;float qt_Opacity;vec2 uUvScale;vec4 uInputPixel;vec4 uInputClamp;vec4 uParams;vec4 uAddMap;vec4 uAddClamp;vec4 uTint;};
layout(binding=1) uniform sampler2D uTexture;
layout(binding=2) uniform sampler2D uAdd;
#define vTextureCoord (qt_TexCoord0*uUvScale)










void main(void) {
    vec4 base = texture(uTexture, clamp(vTextureCoord, uInputClamp.xy, uInputClamp.zw));
    vec4 glow = texture(uAdd, clamp(vTextureCoord * uAddMap.xy, uAddClamp.xy, uAddClamp.zw)) * uAddMap.z;
    vec3 g = glow.rgb * uTint.rgb;
    // 加上去的辉光也是光：预乘、alpha 取最大通道（与光场一致，近似 screen）。
    vec3 rgb = base.rgb + g * (1.0 - base.a * 0.5);
    // 超过 1 时按最大通道整体缩回（保持金色），只让一小部分变白；逐通道截断会把亮字烧成白块。
    float peak = max(max(rgb.r, rgb.g), rgb.b);
    if (peak > 1.0) rgb = mix(rgb / peak, vec3(1.0), 0.2 * (1.0 - 1.0 / peak));
    float a = base.a + max(max(g.r, g.g), g.b) * (1.0 - base.a);
    fragColor = vec4(rgb, min(max(a, max(max(rgb.r, rgb.g), rgb.b)), 1.0));
fragColor*=qt_Opacity;
}
