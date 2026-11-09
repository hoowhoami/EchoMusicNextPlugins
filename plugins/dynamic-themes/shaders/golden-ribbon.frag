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
    vec2 p = (qt_TexCoord0 - 0.5) * ubuf.viewportSize * 10.0 /
             min(ubuf.viewportSize.x, ubuf.viewportSize.y);
    float angle = ubuf.controlVariable * 0.002;
    vec2 drift = vec2(cos(angle), sin(angle));
    float distanceSum = 0.0;
    for (int i = 0; i < 6; ++i) {
        vec2 old = p;
        distanceSum += 0.01 + length(old);
        float wave = cos(distanceSum) + float(i) * 2.6179938316;
        p.x = old.x + drift.x + cos(wave + old.y);
        p.y = old.y + drift.y - sin(wave + old.x);
    }
    float red = pow(sin(distanceSum * 0.1) * 0.5 + 0.5, 128.0);
    float green = pow(max(red - 0.75, 0.0) * 4.0, 2.0);
    float blue = pow(max(red - 0.875, 0.0) * 8.0, 4.0);
    fragColor = vec4(red, green, blue, 1.0) * ubuf.qt_Opacity;
}
