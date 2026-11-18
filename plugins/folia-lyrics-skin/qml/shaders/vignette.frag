#version 440
layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;
layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    float strength;
};

void main()
{
    // CSS ellipse-at-center defaults to farthest-corner, not the side midpoint.
    float distance = clamp(length((qt_TexCoord0 - vec2(0.5)) * sqrt(2.0)), 0.0, 1.0);
    fragColor = vec4(0.0, 0.0, 0.0, distance * strength * qt_Opacity);
}
