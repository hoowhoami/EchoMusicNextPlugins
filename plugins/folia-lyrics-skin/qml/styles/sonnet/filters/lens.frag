#version 440
// Derived from Folia a8da4437 / Pixi8.21 (AGPL-3.0-only / MIT).
layout(location=0) in vec2 qt_TexCoord0;
layout(location=0) out vec4 fragColor;
layout(std140,binding=0) uniform buf {
 mat4 qt_Matrix; float qt_Opacity;
 vec4 uInputSize; vec4 uInputClamp; vec4 uOutputFrame;
 vec2 uUvScale; vec2 uFramePhysicalSize;
 float uFlipFragY; float uTargetPhysicalHeight; float uDistortion; float uDispersion;
 float uNoise; float uSeed; float uContrast; float uAlpha;
 float uAmount; float uStrength; vec2 uDirection;
};
layout(binding=1) uniform sampler2D source;
#define uTexture source
#define vTextureCoord (qt_TexCoord0*uUvScale)
vec2 sourceFragCoord(){float y=qt_TexCoord0.y*uFramePhysicalSize.y; return vec2(qt_TexCoord0.x*uFramePhysicalSize.x,mix(y,uTargetPhysicalHeight-y,uFlipFragY));}






vec2 screenToTextureUv(vec2 screenUv) {
    return screenUv * uOutputFrame.zw * uInputSize.zw;
}

vec4 sampleInside(vec2 uv) {
    if (uv.x < uInputClamp.x || uv.y < uInputClamp.y
        || uv.x > uInputClamp.z || uv.y > uInputClamp.w) {
        return vec4(0.0);
    }
    return texture(uTexture, uv);
}

void main(void) {
    vec2 screenUv = vTextureCoord * uInputSize.xy / max(uOutputFrame.zw, vec2(1.0));
    vec2 centered = screenUv - 0.5;
    float aspect = uOutputFrame.z / max(uOutputFrame.w, 1.0);
    centered.x *= aspect;

    float radiusSquared = dot(centered, centered);
    // Keep the low end subtle but leave enough headroom for the broad barrel warp in the
    // reference look; the UI/store expose this as a 0..2 amount.
    float curvature = uDistortion * 0.32;
    float radialScale = 1.0 - curvature * radiusSquared
        + curvature * 0.16 * radiusSquared * radiusSquared;
    vec2 lensCentered = centered * radialScale;
    lensCentered.x /= aspect;
    vec2 lensUv = lensCentered + 0.5;

    float radius = sqrt(radiusSquared);
    vec2 radialDirection = radius > 0.0001 ? centered / radius : vec2(0.0);
    float edgeWeight = smoothstep(0.12, 0.9, radius);
    vec2 dispersion = radialDirection * uDispersion * 0.012 * edgeWeight;
    dispersion.x /= aspect;

    vec4 center = sampleInside(screenToTextureUv(lensUv));
    vec4 redSample = sampleInside(screenToTextureUv(lensUv + dispersion));
    vec4 blueSample = sampleInside(screenToTextureUv(lensUv - dispersion));
    float alpha = max(center.a, max(redSample.a, blueSample.a));
    float coreWeight = 0.84 - clamp(uDispersion, 0.0, 1.0) * 0.18;
    vec3 core = center.rgb * coreWeight;
    vec3 separated = vec3(redSample.r, center.g, blueSample.b);
    // Keep a neutral core for thin MG strokes, then add the displaced channels as colored
    // fringes. Without this fallback, a one-pixel line can sample transparent red/blue texels
    // and become an unintended green-only stroke.
    vec3 color = max(core, separated);

    // Pixi render textures are premultiplied; the max channel values remain premultiplied.
    fragColor = vec4(color, alpha);
fragColor*=qt_Opacity;
}
