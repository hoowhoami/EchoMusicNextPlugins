#version 440
layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;
layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 direction;
    float sigma;
    vec4 shadow;
    float uvScale;
};
layout(binding = 1) uniform sampler2D source;
layout(binding = 2) uniform sampler2D inkSource;
void main() {
    vec2 uv = qt_TexCoord0 * uvScale;
    float variance = max(sigma * sigma, .000001);
    float value = 0.;
    float total = 0.;
    for (int i = -24; i <= 24; ++i) {
        float weight = exp(-.5 * float(i * i) / variance);
        value += texture(source, uv + direction * float(i)).a * weight;
        total += weight;
    }
    float alpha = shadow.a * value / total;
    vec4 body = texture(inkSource, uv);
    fragColor = (body + vec4(shadow.rgb * alpha, alpha) * (1. - body.a)) * qt_Opacity;
}
