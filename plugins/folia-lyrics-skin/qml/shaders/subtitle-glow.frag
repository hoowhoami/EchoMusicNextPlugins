#version 440
layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;
layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec4 background;
};
void main()
{
    float distance = length((qt_TexCoord0 - vec2(0.5)) / vec2(1.15, 1.30));
    float alpha = distance <= 0.62 ? mix(0.96, 0.78, distance / 0.62)
                                 : mix(0.78, 0.0, clamp((distance - 0.62) / 0.38, 0.0, 1.0));
    alpha *= qt_Opacity;
    fragColor = vec4(background.rgb * alpha, alpha);
}
