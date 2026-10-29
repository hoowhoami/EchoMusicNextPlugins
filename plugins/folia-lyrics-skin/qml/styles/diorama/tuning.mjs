// Derived from Folia a8da4437 (AGPL-3.0-only); see diorama-reference.md.
import {
  DEFAULT_DIORAMA_TUNING,
  DIORAMA_PARTICLE_DENSITY_MAX,
  DIORAMA_PARTICLE_DENSITY_MIN,
  DIORAMA_PARTICLE_GLOW_INTENSITY_MAX,
  DIORAMA_PARTICLE_GLOW_INTENSITY_MIN,
  DIORAMA_PARTICLE_SIZE_MAX,
  DIORAMA_PARTICLE_SIZE_MIN,
} from './defaults.mjs';
import { resolveDioramaMoteCircumference, resolveDioramaMoteRadial } from './dioramaMoteField.mjs';
const resolveStoredDioramaTuning = (parsed) => {
  var _a,
    _b,
    _c,
    _d,
    _e,
    _f,
    _g,
    _h,
    _i,
    _j,
    _k,
    _l,
    _m,
    _n,
    _o,
    _p,
    _q,
    _r,
    _s,
    _t,
    _u,
    _v,
    _w,
    _x,
    _y,
    _z,
    _A,
    _B,
    _C,
    _D;
  return {
    cameraSpeed: Math.min(
      1.85,
      Math.max(0.55, (_a = parsed.cameraSpeed) != null ? _a : DEFAULT_DIORAMA_TUNING.cameraSpeed)
    ),
    motionAmount: Math.min(
      1.6,
      Math.max(0.4, (_b = parsed.motionAmount) != null ? _b : DEFAULT_DIORAMA_TUNING.motionAmount)
    ),
    audioReactivity: Math.min(
      1.5,
      Math.max(
        0,
        (_c = parsed.audioReactivity) != null ? _c : DEFAULT_DIORAMA_TUNING.audioReactivity
      )
    ),
    geometryVisibility: {
      enabled:
        (_e = (_d = parsed.geometryVisibility) == null ? void 0 : _d.enabled) != null
          ? _e
          : DEFAULT_DIORAMA_TUNING.geometryVisibility.enabled,
      mode:
        (_g = (_f = parsed.geometryVisibility) == null ? void 0 : _f.mode) != null
          ? _g
          : DEFAULT_DIORAMA_TUNING.geometryVisibility.mode,
      strands:
        (_i = (_h = parsed.geometryVisibility) == null ? void 0 : _h.strands) != null
          ? _i
          : DEFAULT_DIORAMA_TUNING.geometryVisibility.strands,
      blobs:
        (_k = (_j = parsed.geometryVisibility) == null ? void 0 : _j.blobs) != null
          ? _k
          : DEFAULT_DIORAMA_TUNING.geometryVisibility.blobs,
      ribbons:
        (_m = (_l = parsed.geometryVisibility) == null ? void 0 : _l.ribbons) != null
          ? _m
          : DEFAULT_DIORAMA_TUNING.geometryVisibility.ribbons,
      rings:
        (_o = (_n = parsed.geometryVisibility) == null ? void 0 : _n.rings) != null
          ? _o
          : DEFAULT_DIORAMA_TUNING.geometryVisibility.rings,
    },
    particleDensity: Math.round(
      Math.min(
        DIORAMA_PARTICLE_DENSITY_MAX,
        Math.max(
          DIORAMA_PARTICLE_DENSITY_MIN,
          (_p = parsed.particleDensity) != null ? _p : DEFAULT_DIORAMA_TUNING.particleDensity
        )
      )
    ),
    particleScale: Math.min(
      DIORAMA_PARTICLE_SIZE_MAX,
      Math.max(
        DIORAMA_PARTICLE_SIZE_MIN,
        (_q = parsed.particleScale) != null ? _q : DEFAULT_DIORAMA_TUNING.particleScale
      )
    ),
    particleGlowEnabled:
      (_r = parsed.particleGlowEnabled) != null ? _r : DEFAULT_DIORAMA_TUNING.particleGlowEnabled,
    particleGlowIntensity: Math.min(
      DIORAMA_PARTICLE_GLOW_INTENSITY_MAX,
      Math.max(
        DIORAMA_PARTICLE_GLOW_INTENSITY_MIN,
        (_s = parsed.particleGlowIntensity) != null
          ? _s
          : DEFAULT_DIORAMA_TUNING.particleGlowIntensity
      )
    ),
    showParticles: (_t = parsed.showParticles) != null ? _t : DEFAULT_DIORAMA_TUNING.showParticles,
    backgroundParticleCircumference: resolveDioramaMoteCircumference(
      (_u = parsed.backgroundParticleCircumference) != null
        ? _u
        : DEFAULT_DIORAMA_TUNING.backgroundParticleCircumference
    ),
    backgroundParticleRadial: resolveDioramaMoteRadial(
      (_v = parsed.backgroundParticleRadial) != null
        ? _v
        : DEFAULT_DIORAMA_TUNING.backgroundParticleRadial
    ),
    glowEnabled: (_w = parsed.glowEnabled) != null ? _w : DEFAULT_DIORAMA_TUNING.glowEnabled,
    glowIntensity: Math.min(
      1.5,
      Math.max(0.1, (_x = parsed.glowIntensity) != null ? _x : DEFAULT_DIORAMA_TUNING.glowIntensity)
    ),
    soulEnabled: (_y = parsed.soulEnabled) != null ? _y : DEFAULT_DIORAMA_TUNING.soulEnabled,
    soulIntensity: Math.min(
      1.5,
      Math.max(0.1, (_z = parsed.soulIntensity) != null ? _z : DEFAULT_DIORAMA_TUNING.soulIntensity)
    ),
    soulActiveEnabled:
      (_A = parsed.soulActiveEnabled) != null ? _A : DEFAULT_DIORAMA_TUNING.soulActiveEnabled,
    gradientEnabled:
      (_B = parsed.gradientEnabled) != null ? _B : DEFAULT_DIORAMA_TUNING.gradientEnabled,
    gradientIntensity: Math.min(
      1.5,
      Math.max(
        0.1,
        (_C = parsed.gradientIntensity) != null ? _C : DEFAULT_DIORAMA_TUNING.gradientIntensity
      )
    ),
    keywordColoringEnabled:
      (_D = parsed.keywordColoringEnabled) != null
        ? _D
        : DEFAULT_DIORAMA_TUNING.keywordColoringEnabled,
  };
};
export { resolveStoredDioramaTuning };
