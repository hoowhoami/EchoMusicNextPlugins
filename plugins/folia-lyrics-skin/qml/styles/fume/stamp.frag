#version 440
layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;
layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    vec2 surfaceSize;
    vec2 bodySize;
    float sigma;
    vec4 fill;
    vec4 shadow;
};
vec2 erfValue(vec2 v) {
    vec2 s = sign(v), x = abs(v);
    vec2 t = 1. / (1. + .3275911 * x);
    return s * (1. - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * exp(-x * x));
}
void main() {
    vec2 p = (qt_TexCoord0 - .5) * surfaceSize;
    vec2 edge = bodySize * .5;
    vec2 coverage = clamp((edge - abs(p)) / max(fwidth(p), vec2(.000001)) + .5, 0., 1.);
    float bodyAlpha = coverage.x * coverage.y * fill.a;
    vec2 convolution = .5 * (erfValue((p + edge) / max(1.41421356237 * sigma, .000001)) - erfValue((p - edge) / max(1.41421356237 * sigma, .000001)));
    float shadowAlpha = convolution.x * convolution.y * fill.a * shadow.a;
    fragColor = (vec4(fill.rgb * bodyAlpha, bodyAlpha) + vec4(shadow.rgb * shadowAlpha, shadowAlpha) * (1. - bodyAlpha)) * qt_Opacity;
}
