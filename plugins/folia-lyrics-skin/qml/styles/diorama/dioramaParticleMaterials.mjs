// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import * as THREE from './three.mjs';
import { DIORAMA_RIPPLE_COUNT } from './dioramaParticleModel.mjs';
import {
  DIORAMA_PARTICLE_FRAGMENT_SHADER,
  DIORAMA_PARTICLE_VERTEX_SHADER,
} from './dioramaParticleShaders.mjs';
const relativeLuminance = (color) => 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b,
  getDioramaParticleContrastRatio = (foreground, background) => {
    const foregroundLuminance = relativeLuminance(foreground),
      backgroundLuminance = relativeLuminance(background),
      lighter = Math.max(foregroundLuminance, backgroundLuminance),
      darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
  },
  CALM_EMISSION = 0.92 * 0.95,
  CONTRAST_LAYER_ALPHA = 0.72,
  asDisplayed = (color, background) => {
    const src = color.clone().multiplyScalar(CALM_EMISSION).convertLinearToSRGB(),
      dst = background.clone().convertLinearToSRGB(),
      blend = (s, d) => s * CONTRAST_LAYER_ALPHA + d * (1 - CONTRAST_LAYER_ALPHA);
    return new THREE.Color(
      blend(src.r, dst.r),
      blend(src.g, dst.g),
      blend(src.b, dst.b)
    ).convertSRGBToLinear();
  },
  getDioramaParticleDisplayedContrastRatio = (color, background) =>
    getDioramaParticleContrastRatio(asDisplayed(color, background), background),
  adaptColorToBackground = (color, background, minimumContrast) => {
    if (getDioramaParticleDisplayedContrastRatio(color, background) >= minimumContrast)
      return color.clone();
    const lightTarget = new THREE.Color(16777215),
      darkTarget = new THREE.Color(328965),
      target =
        getDioramaParticleDisplayedContrastRatio(lightTarget, background) >=
        getDioramaParticleDisplayedContrastRatio(darkTarget, background)
          ? lightTarget
          : darkTarget;
    let low = 0,
      high = 1;
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const amount = (low + high) * 0.5,
        candidate = color.clone().lerp(target, amount);
      getDioramaParticleDisplayedContrastRatio(candidate, background) >= minimumContrast
        ? (high = amount)
        : (low = amount);
    }
    return color.clone().lerp(target, high);
  },
  resolveDioramaParticleContrastColors = (colors, background) => ({
    primary: adaptColorToBackground(colors.primary, background, 4.6),
    accent: adaptColorToBackground(colors.accent, background, 4.1),
    secondary: adaptColorToBackground(colors.secondary, background, 4.6),
  }),
  buildUniforms = (colors, glowPass, glowIntensity) => ({
    uTime: { value: 0 },
    uCorridor: { value: 0 },
    uAmplitude: { value: 0.34 },
    uMaxSwell: { value: 0.29 },
    uWaveNumberMax: { value: 8 },
    uDetail: { value: 0 },
    uRippleSource: { value: new Float32Array(DIORAMA_RIPPLE_COUNT * 4) },
    uRippleShape: { value: new Float32Array(DIORAMA_RIPPLE_COUNT * 4) },
    uOffsetGain: { value: 0 },
    uFlow: { value: 1 },
    uFormation: { value: 1 },
    uScatter: { value: 4 },
    uSizeBase: { value: 0.052 },
    uSizeGain: { value: 0.3 },
    uPulse: { value: 1 },
    uSpectralCentroid: { value: 0.5 },
    uViewportHeight: { value: 1 },
    uGlow: { value: glowIntensity },
    uGlowPass: { value: glowPass },
    uPrimaryColor: { value: colors.primary.clone() },
    uAccentColor: { value: colors.accent.clone() },
    uSecondaryColor: { value: colors.secondary.clone() },
  }),
  createDioramaParticleMaterial = (colors) =>
    new THREE.ShaderMaterial({
      vertexShader: DIORAMA_PARTICLE_VERTEX_SHADER,
      fragmentShader: DIORAMA_PARTICLE_FRAGMENT_SHADER,
      uniforms: buildUniforms(colors, 0, 0),
      transparent: !0,
      depthWrite: !1,
      blending: THREE.NormalBlending,
      toneMapped: !1,
    }),
  createDioramaParticleGlowMaterial = (colors, glowIntensity) =>
    new THREE.ShaderMaterial({
      vertexShader: DIORAMA_PARTICLE_VERTEX_SHADER,
      fragmentShader: DIORAMA_PARTICLE_FRAGMENT_SHADER,
      uniforms: buildUniforms(colors, 1, glowIntensity),
      transparent: !0,
      depthWrite: !1,
      blending: THREE.AdditiveBlending,
      toneMapped: !1,
    }),
  lerpDioramaParticleMaterialColors = (material, colors, amount) => {
    (material.uniforms.uPrimaryColor.value.lerp(colors.primary, amount),
      material.uniforms.uAccentColor.value.lerp(colors.accent, amount),
      material.uniforms.uSecondaryColor.value.lerp(colors.secondary, amount));
  };
export {
  createDioramaParticleGlowMaterial,
  createDioramaParticleMaterial,
  getDioramaParticleContrastRatio,
  getDioramaParticleDisplayedContrastRatio,
  lerpDioramaParticleMaterialColors,
  resolveDioramaParticleContrastColors,
};
