#version 440
layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;
layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 viewportSize;
    float controlVariable;
} ubuf;

void main()
{
    vec2 p = (2.0 * qt_TexCoord0 - 1.0) * ubuf.viewportSize * 1.5 /
             max(ubuf.viewportSize.x, ubuf.viewportSize.y);
    float time = ubuf.controlVariable * 1.26;
    for (int i = 1; i < 10; ++i) {
        float n = float(i);
        vec2 old = p;
        p.x = old.x + 1.0 + 0.6 / n * sin(n * (old.y + 0.3) + time);
        p.y = old.y - 1.4 + 0.6 / n * sin(n * old.x + time + (n + 10.0) * 0.3);
    }
    vec3 color = vec3(sin(p.x * 3.0) * 0.5 + 0.5,
                      sin(p.y * 2.0) * 0.5 + 0.5, sin(p.x + p.y));
    fragColor = vec4(clamp(color, 0.0, 1.0), 1.0) * ubuf.qt_Opacity;
}
