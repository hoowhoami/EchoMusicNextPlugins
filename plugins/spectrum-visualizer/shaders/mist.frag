#version 440
// Three blurred cloud passes use the original Canvas screen compositing rule.
layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;
layout(std140, binding = 0) uniform buf { mat4 qt_Matrix; float qt_Opacity; } ubuf;
layout(binding = 1) uniform sampler2D fog0;
layout(binding = 2) uniform sampler2D fog1;
layout(binding = 3) uniform sampler2D fog2;
void main() {
    vec4 a = texture(fog0, qt_TexCoord0);
    vec4 b = texture(fog1, qt_TexCoord0);
    vec4 c = texture(fog2, qt_TexCoord0);
    vec4 ab = a + b - a * b;
    fragColor = (ab + c - ab * c) * ubuf.qt_Opacity;
}
