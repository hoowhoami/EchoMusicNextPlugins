#version 440
layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;
layout(std140, binding = 0) uniform buf { mat4 qt_Matrix; float qt_Opacity; } ubuf;
layout(binding = 1) uniform sampler2D source;
void main() {
    float x = min(qt_TexCoord0.x, 1.0 - qt_TexCoord0.x);
    float mask = x < 0.05 ? x * 12.0 : mix(0.6, 1.0, clamp((x - 0.05) / 0.07, 0.0, 1.0));
    fragColor = texture(source, qt_TexCoord0) * mask * ubuf.qt_Opacity;
}
