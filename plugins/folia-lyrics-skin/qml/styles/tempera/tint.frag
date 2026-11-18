#version 440
layout(location=0)in vec2 qt_TexCoord0;layout(location=0)out vec4 finalColor;
layout(std140,binding=0) uniform buf {mat4 qt_Matrix;float qt_Opacity;vec4 uInputSize;vec4 uOutputFrame;vec3 uInkColor;vec3 uPaperColor;float uInkLuminance;float uPaperLuminance;float uBias;vec3 uTintA;vec3 uTintB;vec3 uTintC;vec3 uTintD;float uTintAmount;};layout(binding=1)uniform sampler2D source;layout(binding=2)uniform sampler2D backdrop;
#define uTexture source
#define uBackTexture backdrop
#define vTextureCoord qt_TexCoord0


















// Four-stop ramp sampled across the filter's own bounds, so the colour sweeps the whole line
// rather than repeating inside every glyph.
vec3 sampleTint(float position) {
    float scaled = clamp(position, 0.0, 1.0) * 3.0;
    if (scaled < 1.0) return mix(uTintA, uTintB, scaled);
    if (scaled < 2.0) return mix(uTintB, uTintC, scaled - 1.0);
    return mix(uTintC, uTintD, scaled - 2.0);
}

float tintPosition(vec2 uv) {
    return clamp((uv.x * uInputSize.x-uOutputFrame.x) / max(uOutputFrame.z, 1.0), 0.0, 1.0);
}

void main(void) {
    vec4 front = texture(uTexture, vTextureCoord);
    vec3 tone = uTintAmount > 0.0 ? sampleTint(tintPosition(vTextureCoord)) : uInkColor;
    finalColor = vec4(tone * front.a, front.a);
vec4 back=texture(backdrop,qt_TexCoord0);finalColor=(finalColor+back*(1.0-finalColor.a))*qt_Opacity;
}