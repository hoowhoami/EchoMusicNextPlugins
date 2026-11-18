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



float backLuminance(vec2 uv) {
    vec4 back = texture(uBackTexture, uv);
    // Pixi render targets are premultiplied; undo it before reading brightness.
    vec3 straight = back.rgb / max(back.a, 1e-4);
    float lum = dot(straight, vec3(0.2126, 0.7152, 0.0722));
    // Where nothing has been drawn, the shell background shows through, which is paper.
    return mix(uPaperLuminance, lum, clamp(back.a * 3.0, 0.0, 1.0));
}

void main(void) {
    vec4 front = texture(uTexture, vTextureCoord);
    // A 5-tap average keeps fine hatch from flickering the inversion decision per pixel.
    vec2 texel = uInputSize.zw * 1.5;
    float lum = backLuminance(vTextureCoord) * 0.4
        + (backLuminance(vTextureCoord + texel)
            + backLuminance(vTextureCoord - texel)
            + backLuminance(vTextureCoord + vec2(texel.x, -texel.y))
            + backLuminance(vTextureCoord + vec2(-texel.x, texel.y))) * 0.15;

    float distanceToPaper = abs(lum - uPaperLuminance);
    float distanceToInk = abs(lum - uInkLuminance);
    // Pick the color that sits further from the backdrop so contrast never collapses,
    // whether the theme puts light ink on dark paper or the reverse.
    vec3 tone = mix(uInkColor, uPaperColor, step(distanceToInk + uBias, distanceToPaper));

    // Colour modes tint that choice instead of replacing it: the hue comes from the ramp, the
    // luminance stays the one the inversion just picked. Colouring the text any other way
    // throws away the only thing guaranteeing it reads against the artwork.
    if (uTintAmount > 0.0) {
        vec3 tint = sampleTint(tintPosition(vTextureCoord));
        float tintLuminance = max(dot(tint, vec3(0.2126, 0.7152, 0.0722)), 1e-3);
        float toneLuminance = dot(tone, vec3(0.2126, 0.7152, 0.0722));
        vec3 matched = clamp(tint * (toneLuminance / tintLuminance), 0.0, 1.0);
        tone = mix(tone, matched, uTintAmount);
    }
    finalColor = vec4(tone * front.a, front.a);
vec4 back=texture(backdrop,qt_TexCoord0);finalColor=(finalColor+back*(1.0-finalColor.a))*qt_Opacity;
}